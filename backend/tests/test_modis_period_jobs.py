"""Deterministic transport tests: these fixtures are not NASA observations."""
import asyncio
from datetime import date, timedelta
import sqlite3

import pytest

from app.ingestion.store import MODIS, ObservationStore
from app.ingestion.updater import process_pending
from app.providers.modis import MODISService
from tests.test_api import request


POINT = (-12.0465, -75.1958)
START, END = date(2023, 1, 1), date(2025, 12, 31)


def fixture(day):
    return {"responses": [{"request_url": "https://synthetic.invalid/test-only", "retrieved_at": "2026-01-01T00:00:00Z", "payload": {"subset": [
        {"calendar_date": str(day), "band": "250m_16_days_" + band, "data": [value]}
        for band, value in (("NDVI", 4200), ("EVI", 2600), ("pixel_reliability", 0))
    ]}}]}


def test_http_three_year_sync_only_queues_then_reads_exact_period(monkeypatch, tmp_path):
    from app.providers import modis as provider
    from app.clients import modis
    store = ObservationStore(tmp_path / "queue.sqlite")
    monkeypatch.setattr(provider, "ObservationStore", lambda: store)

    async def forbidden(*args, **kwargs):
        raise AssertionError("HTTP must never wait for NASA")
    monkeypatch.setattr(modis, "fetch_raw", forbidden)
    body = dict(lat=POINT[0], lon=POINT[1], start=str(START), end=str(END))
    response = request("POST", "/api/v1/observations/vegetation/sync", json=body)
    assert response.status_code == 202
    result = response.json()
    assert result["data"] == []  # Never borrow the nearby Mantaro archive.
    assert result["ingestion_job"]["status"] == "queued"
    again = request("POST", "/api/v1/observations/vegetation/sync", json=body).json()
    assert again["ingestion_job"]["id"] == result["ingestion_job"]["id"]
    read = request("GET", "/api/v1/observations/vegetation", params=body).json()
    assert read["ingestion_job"] == result["ingestion_job"]
    other = request("GET", "/api/v1/observations/vegetation", params={**body, "lat": -12.05}).json()
    assert other["ingestion_job"] is None
    period = request("GET", "/api/v1/observations/vegetation", params={**body, "end": "2024-12-31"}).json()
    assert period["ingestion_job"] is None


def test_offline_batches_expose_progress_preserve_partial_and_resume(monkeypatch, tmp_path):
    from app.ingestion import updater
    store = ObservationStore(tmp_path / "queue.sqlite")
    store.enqueue(*POINT, start=START, end=END, kind="modis_period")
    calls = []
    fail = True

    async def fetch(lat, lon, start, end):
        assert (lat, lon) == POINT
        job = store.period_job(*POINT, START, END)
        assert job["status"] == "running"
        assert job["total_batches"] > 1
        if not calls:
            assert job["completed_batches"] == 0
        elif fail:
            assert job["completed_batches"] == 1
            assert len(store.rows(MODIS, *POINT, START, END)) == 1
        calls.append((start, end))
        if fail and len(calls) == 2:
            raise TimeoutError("synthetic transport outage")
        return fixture(start)

    async def forbidden(*args, **kwargs):
        raise AssertionError("History-only job must not download POWER or train")
    monkeypatch.setattr(updater.modis, "fetch_raw", fetch)
    monkeypatch.setattr(updater, "update_observations", forbidden)
    result = asyncio.run(process_pending(store))
    assert result["status"] == "partial"
    first_job = store.period_job(*POINT, START, END)
    assert first_job["completed_batches"] == 1
    assert first_job["finished_at"] is not None
    failed_batch = calls[-1]
    fail = False
    store.enqueue(*POINT, start=START, end=END, kind="modis_period")
    result = asyncio.run(process_pending(store))
    assert result["status"] == "complete"
    assert calls[2] == failed_batch
    assert calls.count(calls[0]) == 1
    job = store.period_job(*POINT, START, END)
    assert job["completed_batches"] == job["total_batches"]
    rows = store.rows(MODIS, *POINT, START, END)
    assert len(rows) == job["total_batches"]
    assert store.rows(MODIS, -12.05, -75.2) == []
    # Repeat checks reuse durable checkpoints rather than redownloading.
    count = len(calls)
    store.enqueue(*POINT, start=START, end=END, kind="modis_period")
    asyncio.run(process_pending(store))
    assert len(calls) == count


def test_failed_first_batch_not_reported_complete_and_can_retry(monkeypatch, tmp_path):
    from app.ingestion import updater
    store = ObservationStore(tmp_path / "queue.sqlite")
    store.enqueue(*POINT, start=START, end=END, kind="modis_period")

    async def failed(*args):
        raise TimeoutError("synthetic")
    monkeypatch.setattr(updater.modis, "fetch_raw", failed)
    assert asyncio.run(process_pending(store))["status"] == "failed"
    job = store.period_job(*POINT, START, END)
    assert job["completed_batches"] == 0 and job["status"] == "failed"
    assert store.enqueue(*POINT, start=START, end=END, kind="modis_period") != job["id"]


def test_migration_preserves_legacy_full_jobs_and_deduplicates_by_kind(tmp_path):
    path = tmp_path / "old.sqlite"
    with sqlite3.connect(path) as conn:
        conn.execute("CREATE TABLE ingestion_jobs (id INTEGER PRIMARY KEY,cell_id TEXT NOT NULL,lat REAL,lon REAL,status TEXT NOT NULL,requested_at TEXT NOT NULL,finished_at TEXT,error TEXT)")
        conn.execute("INSERT INTO ingestion_jobs VALUES (1,'1.00000000:2.00000000',1,2,'queued','2025-01-01',NULL,NULL)")
    store = ObservationStore(path)
    assert store.enqueue(1, 2) == 1
    assert store.enqueue(1, 2, start=START, end=END, kind="modis_period") != 1
    assert store.enqueue(1, 2, start=START, end=END, kind="modis_period") == 2
    for i in range(18):
        store.enqueue(10 + i, 2)
    with pytest.raises(ValueError, match="queue is full"):
        store.enqueue(45, 2)


def test_sync_rejects_bad_periods_before_queuing():
    for start, end in (("2025-01-01", "2023-01-01"), ("2020-01-01", "2025-01-01")):
        assert request("POST", "/api/v1/observations/vegetation/sync", json=dict(lat=POINT[0], lon=POINT[1], start=start, end=end)).status_code == 422


@pytest.mark.parametrize("recent", [False, True])
def test_empty_history_stays_unknown_and_unpublished_batches_are_rechecked(monkeypatch, tmp_path, recent):
    from app.ingestion import updater
    store = ObservationStore(tmp_path / "queue.sqlite")
    day = updater.modis.composite_on_or_after(date.today() - timedelta(days=16)) if recent else START
    calls = []

    async def empty(*args):
        calls.append(args)
        return {"responses": []}  # Synthetic empty response, not a zero NDVI.
    monkeypatch.setattr(updater.modis, "fetch_raw", empty)
    for _ in range(2):
        store.enqueue(*POINT, start=day, end=day, kind="modis_period")
        assert asyncio.run(process_pending(store))["status"] == "complete"
    assert len(calls) == (2 if recent else 1)
    result = asyncio.run(MODISService().series(*POINT, day, day, store=store))
    assert result["status"] == "unavailable"
    assert result["summary"]["ndvi_mean"] is None
    assert result["data"] == []
