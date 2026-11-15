"""Explicit public-source archive refresh; raw scientific values remain unchanged."""
import asyncio
from datetime import date,datetime,timezone,timedelta
import hashlib
import json
from pathlib import Path
from app.clients.modis import fetch_raw, normalize
from app.ingestion.store import ObservationStore,MODIS


async def run():
    checkpoint=Path(__file__).resolve().parents[1]/"data"/"cache"/"modis-pilot-checkpoint.json"
    checkpoint.parent.mkdir(parents=True,exist_ok=True)
    raw=json.loads(checkpoint.read_text(encoding="utf-8")) if checkpoint.exists() else {"lat":-12.05,"lon":-75.2,"start":"2023-01-01","end":"2025-12-31","responses":[],"next":"2023-01-01"}
    cursor=date.fromisoformat(raw["next"])
    while cursor<=date(2025,12,31):
        end=min(date(2025,12,31),cursor+timedelta(days=143))
        batch=await fetch_raw(-12.05,-75.2,cursor,end)
        raw["responses"].extend(batch["responses"])
        cursor=end+timedelta(days=1);raw["next"]=cursor.isoformat()
        checkpoint.write_text(json.dumps(raw),encoding="utf-8")
        print("Archived through",end,flush=True)
    rows=normalize(raw)
    if len(rows)<46:
        raise ValueError("Archive lacks two years of genuine compositions; refusing to label it complete.")
    path=Path(__file__).resolve().parents[1]/"data"/"demo"/"modis-mantaro-2023-2025.raw.json"
    payload=json.dumps(raw,indent=2).encode("utf-8")
    path.write_bytes(payload)
    manifest={"source":"NASA MODIS MOD13Q1.061 / ORNL DAAC","doi":"https://doi.org/10.5067/MODIS/MOD13Q1.061","lat":-12.05,"lon":-75.2,"retrieved_at":datetime.now(timezone.utc).isoformat(),"raw_sha256":hashlib.sha256(payload).hexdigest(),"request_urls":[r["request_url"] for r in raw["responses"]],"composite_count":len(rows),"valid_ndvi_count":sum(r["ndvi"] is not None for r in rows),"normalization":"Raw values unchanged; one central pixel, QA 0/1 retained, scale .0001. See app/clients/modis.py."}
    path.with_name(path.name.replace('.raw.json','.source.json')).write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    ObservationStore().put(MODIS,"061",-12.05,-75.2,rows)
    print(json.dumps(manifest))


if __name__=="__main__":
    asyncio.run(run())
