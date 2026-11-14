import asyncio
from datetime import date
from pathlib import Path
import json

import httpx
import pytest

from app.clients.power import PowerError, fetch_raw, normalize, validate_period
from app.data.climate_cache import ClimateCache

START, END = date(2025, 1, 1), date(2025, 1, 31)


def original():
    return json.loads((Path(__file__).resolve().parents[1] / "data/demo/power-mantaro-2025-01.raw.json").read_text(encoding="utf-8"))


def normalized(raw):
    return normalize(raw, -12.05, -75.2, START, END, "2026-11-14T00:00:00+00:00", "https://power.larc.nasa.gov/")


def test_real_recording_normalizes_units_and_summary():
    raw = original()
    result = normalized(raw)
    assert len(result["data"]) == 31
    assert result["data"][0]["T2M"] == raw["properties"]["parameter"]["T2M"]["20250101"]
    assert result["summary"]["rainfall_total"]["value"] == round(sum(raw["properties"]["parameter"]["PRECTOTCORR"].values()), 2)
    assert result["summary"]["rainfall_total"]["status"] == "derived"
    assert result["variables"]["PRECTOTCORR"]["unit"] == "mm/day"


def test_mock_missing_rain_is_not_zero_or_partial_total():
    raw = original()
    raw["properties"]["parameter"]["PRECTOTCORR"]["20250101"] = -999
    raw["properties"]["parameter"]["T2M"]["20250102"] = None
    result = normalized(raw)
    assert result["data"][0]["PRECTOTCORR"] is None
    assert result["summary"]["rainfall_total"]["value"] is None
    assert result["summary"]["rainfall_total"]["status"] == "unavailable"
    assert result["summary"]["temperature_mean"]["quality"] == "partial"


def test_mock_changed_units_rejected():
    raw = original()
    raw["parameters"]["T2M"]["units"] = "F"
    with pytest.raises(PowerError):
        normalized(raw)


@pytest.mark.parametrize("start,end", [(date(2025, 2, 1), START), (START, date(2026, 2, 1)), (date(1980, 1, 1), START)])
def test_invalid_period(start, end):
    with pytest.raises(ValueError):
        validate_period(start, end)


def test_year_boundary():
    result = normalize(original(), 10, 20, date(2024, 12, 31), date(2025, 1, 1), "2026-11-14T00:00:00+00:00", "test")
    assert len(result["data"]) == 2
    assert result["data"][0]["T2M"] is None
    assert result["data"][1]["date"] == "2025-01-01"


def test_sqlite_cache_roundtrip(tmp_path):
    cache = ClimateCache(tmp_path / "cache.sqlite")
    assert cache.get("absent") is None
    cache.put("location-date-version", normalized(original()))
    assert cache.get("location-date-version")["quality"] == "complete"


def test_mock_provider_error_is_typed():
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(503))) as client:
            with pytest.raises(PowerError):
                await fetch_raw(0, 0, START, END, client=client)
    asyncio.run(run())
