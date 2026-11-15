"""Offline incremental update; imported by the CLI, never by a request handler."""
from datetime import date, datetime, timedelta, timezone
import json
import hashlib
from pathlib import Path
from uuid import uuid4
from app.clients import modis, power
from app.ingestion.store import ObservationStore, MODIS, POWER, cell_key
from app.providers.modis import seed_rows


async def update_observations(lat, lon, start=date(2023,1,1), end=None, retrain=False, store=None):
    power_end = end or date.today()-timedelta(days=2)
    end = end or date.today()-timedelta(days=20)
    if not (-85 <= lat <= 85 and -180 <= lon <= 180) or start > end:
        raise ValueError("Choose valid terrestrial coordinates and an ordered period.")
    store=store or ObservationStore()
    run_id=uuid4().hex
    started=datetime.now(timezone.utc).isoformat()
    counts={POWER:0,MODIS:0}; notes=[]; trained=None
    # Authentic fixed-location seed; never borrow this archive for another point.
    if not store.latest(MODIS,lat,lon):
        counts[MODIS]+=store.put(MODIS,"061",lat,lon,[r for r in seed_rows(lat,lon) if str(start)<=r["date"]<=str(end)])
    if (lat,lon)==(-12.05,-75.2) and not store.latest(POWER,lat,lon):
        archive=Path(__file__).resolve().parents[2]/"data"/"demo"/"power-mantaro-2023-2025.normalized.json"
        if archive.exists():
            manifest=json.loads(archive.with_name("power-mantaro-2023-2025.normalized.source.json").read_text(encoding="utf-8"))
            content=archive.read_bytes()
            if hashlib.sha256(content).hexdigest()!=manifest["sha256"]:
                raise ValueError("POWER normalized archive integrity check failed.")
            counts[POWER]+=store.put(POWER,"POWER-daily-schema2",lat,lon,[r for r in json.loads(content)["data"] if str(start)<=r["date"]<=str(end)])
    for source in (POWER,MODIS):
        source_end=power_end if source==POWER else end
        latest=store.latest(source,lat,lon)
        cursor=max(start,date.fromisoformat(latest)+timedelta(days=1)) if latest else start
        if source==MODIS:
            cursor=modis.composite_on_or_after(cursor)
        while cursor<=source_end:
            chunk_end=min(source_end,cursor+timedelta(days=365 if source==POWER else 143))
            try:
                if source==POWER:
                    raw,url=await power.fetch_raw(lat,lon,cursor,chunk_end)
                    retrieved=datetime.now(timezone.utc).isoformat()
                    normalized=power.normalize(raw,lat,lon,cursor,chunk_end,retrieved,url)
                    rows=[{**r,"source":"NASA POWER","request_url":url,"retrieved_at":retrieved,"quality":"complete" if all(r[k] is not None for k in ('T2M','T2M_MIN','T2M_MAX','PRECTOTCORR')) else "partial"} for r in normalized["data"]]
                    counts[source]+=store.put(source,"POWER-daily-schema2",lat,lon,rows)
                else:
                    raw=await modis.fetch_raw(lat,lon,cursor,chunk_end)
                    counts[source]+=store.put(source,"061",lat,lon,modis.normalize(raw))
            except Exception as exc:
                notes.append(f"{source}: {type(exc).__name__}: {exc}")
                break  # Do not advance beyond an unfilled chunk after an outage.
            cursor=chunk_end+timedelta(days=1)
    if retrain or any(counts.values()):
        try:
            from app.ml.trainer import train_and_evaluate_adaptive_model
            trained=train_and_evaluate_adaptive_model(lat,lon,store)
        except Exception as exc:
            notes.append(f"Offline model attempt: {type(exc).__name__}: {exc}")
    status="partial" if notes else "complete"
    with store.connect() as conn:
        conn.execute("INSERT INTO ingestion_runs VALUES (?,?,?,?,?,?,?,?,?)",(run_id,started,datetime.now(timezone.utc).isoformat(),cell_key(lat,lon),counts[POWER],counts[MODIS],trained.get("model_version") if trained else None,status,json.dumps(notes)))
    return {"run_id":run_id,"status":status,"power_new_rows":counts[POWER],"modis_new_rows":counts[MODIS],"model_attempt":trained,"notes":notes}


async def update_modis_period(job, store):
    """Fetch a requested historical range offline, persisting every completed batch.

    Successful empty batches are also checkpointed. Retry never skips an unfilled
    batch just because a later observation already exists at this point.
    This history-only operation does not fetch POWER or train a model.
    """
    lat, lon = job["lat"], job["lon"]
    end = date.fromisoformat(job["end_date"])
    cursor = modis.composite_on_or_after(date.fromisoformat(job["start_date"]))
    batches = []
    while cursor <= end:
        stop = min(end, cursor + timedelta(days=143))
        batches.append((str(cursor), str(stop)))
        cursor = modis.composite_on_or_after(stop + timedelta(days=1))
    with store.connect() as conn:
        saved = {(row[0], row[1]) for row in conn.execute("SELECT start_date,end_date FROM modis_completed_batches WHERE cell_id=?", (job["cell_id"],))}
        completed = sum(batch in saved for batch in batches)
        conn.execute("UPDATE ingestion_jobs SET total_batches=?,completed_batches=? WHERE id=?", (len(batches), completed, job["id"]))
    inserted = 0
    for start, stop in batches:
        if (start, stop) in saved:
            continue
        try:
            raw = await modis.fetch_raw(lat, lon, date.fromisoformat(start), date.fromisoformat(stop))
            rows = [row for row in modis.normalize(raw) if start <= row["date"] <= stop]
            inserted += store.put(MODIS, "061", lat, lon, rows)
            with store.connect() as conn:
                # Recently unpublished (or future) data must be eligible on retry.
                if date.fromisoformat(stop) <= date.today() - timedelta(days=20):
                    conn.execute("INSERT OR IGNORE INTO modis_completed_batches VALUES (?,?,?,?)", (job["cell_id"], start, stop, datetime.now(timezone.utc).isoformat()))
                completed += 1
                conn.execute("UPDATE ingestion_jobs SET completed_batches=? WHERE id=?", (completed, job["id"]))
        except Exception as exc:
            return {"status": "partial" if completed else "failed", "modis_new_rows": inserted, "notes": [f"NASA MODIS batch {start}/{stop}: {type(exc).__name__}. Retry to continue from saved batches."]}
    return {"status": "complete", "modis_new_rows": inserted, "notes": []}


async def process_pending(store=None):
    store=store or ObservationStore()
    with store.connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        job=conn.execute("SELECT * FROM ingestion_jobs WHERE status='queued' ORDER BY id LIMIT 1").fetchone()
        if not job:
            return None
        conn.execute("UPDATE ingestion_jobs SET status='running' WHERE id=?",(job["id"],))
    try:
        if job["kind"] == "modis_period":
            result = await update_modis_period(job, store)
        else:
            result=await update_observations(job["lat"],job["lon"],retrain=True,store=store)
        status=result["status"]
        error=json.dumps(result["notes"]) if result["notes"] else None
    except Exception as exc:
        result={"error":type(exc).__name__}; status="failed";error=str(exc)
    with store.connect() as conn:
        conn.execute("UPDATE ingestion_jobs SET status=?,finished_at=?,error=? WHERE id=?",(status,datetime.now(timezone.utc).isoformat(),error,job["id"]))
    return result
