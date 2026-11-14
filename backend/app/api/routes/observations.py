from datetime import date, datetime, timezone
from pathlib import Path
import json

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.clients.power import PowerError, fetch_raw, normalize, validate_period, request_params, BASE_URL
from app.data.climate_cache import ClimateCache, cache_key
from app.data.climate_schemas import ClimateResponse

router = APIRouter(prefix="/observations", tags=["Clima"])
cache = ClimateCache()


@router.get("/climate", response_model=ClimateResponse)
async def climate(lat: float = Query(ge=-90, le=90, allow_inf_nan=False), lon: float = Query(ge=-180, le=180, allow_inf_nan=False), start: date = Query(), end: date = Query()):
    try:
        validate_period(start, end)
    except ValueError as exc:
        return JSONResponse(status_code=422, content={"error": {"code": "invalid_period", "message": str(exc)}})
    key = cache_key(lat, lon, start, end)
    cached = cache.get(key)
    if cached:
        return {**cached, "delivery": "cache"}
    try:
        raw, url = await fetch_raw(lat, lon, start, end)
        result = normalize(raw, lat, lon, start, end, datetime.now(timezone.utc).isoformat(), url)
        cache.put(key, result)
        return {**result, "delivery": "live"}
    except PowerError as exc:
        return JSONResponse(status_code=502, content={"error": {"code": "power_unavailable", "message": str(exc)}})


@router.get("/climate/demo", response_model=ClimateResponse)
def climate_demo():
    """Archivo NASA auténtico de una ubicación fija; nunca sustituye otra consulta."""
    directory = Path(__file__).resolve().parents[3] / "data" / "demo"
    raw = json.loads((directory / "power-mantaro-2025-01.raw.json").read_text(encoding="utf-8"))
    manifest = json.loads((directory / "power-mantaro-2025-01.source.json").read_text(encoding="utf-8"))
    start, end = date(2025, 1, 1), date(2025, 1, 31)
    result = normalize(raw, -12.05, -75.2, start, end, manifest["retrieved_at"], manifest["request_url"])
    return {**result, "delivery": "saved_observation"}
