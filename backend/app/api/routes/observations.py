from datetime import date, datetime, timezone
from pathlib import Path
import json

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.clients.power import PowerError, fetch_raw, normalize, validate_period, request_params, BASE_URL
from app.data.climate_cache import ClimateCache, cache_key
from app.data.climate_schemas import ClimateResponse
from app.providers.soilgrids import SoilGridsService, SoilProfile
from app.providers.era5 import ERA5ComplementaryReport, ERA5Service
from app.providers.senamhi import SenamhiReport, SENAMHIService
from app.providers.location import LocationService

router = APIRouter(prefix="/observations", tags=["Observations & Earth Data"])
cache = ClimateCache()

soil_service = SoilGridsService()
era5_service = ERA5Service()
senamhi_service = SENAMHIService()
location_service = LocationService()


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
    """Authentic NASA archive for a fixed location; never substitutes a different query."""
    directory = Path(__file__).resolve().parents[3] / "data" / "demo"
    raw = json.loads((directory / "power-mantaro-2025-01.raw.json").read_text(encoding="utf-8"))
    manifest = json.loads((directory / "power-mantaro-2025-01.source.json").read_text(encoding="utf-8"))
    start, end = date(2025, 1, 1), date(2025, 1, 31)
    result = normalize(raw, -12.05, -75.2, start, end, manifest["retrieved_at"], manifest["request_url"])
    return {**result, "delivery": "saved_observation"}


@router.get("/soil", response_model=SoilProfile)
async def soil_observation(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
):
    """Retrieves physical and chemical soil properties from ISRIC SoilGrids v2.0."""
    return await soil_service.get_soil_profile(lat, lon)


@router.get("/era5", response_model=ERA5ComplementaryReport)
async def era5_observation(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
):
    """Provides ECMWF Copernicus ERA5-Land reanalysis comparison against NASA POWER."""
    temp_val = None
    rain_val = None
    if start and end:
        key = cache_key(lat, lon, start, end)
        obs = cache.get(key)
        if obs and "summary" in obs:
            temp_val = obs["summary"]["temperature_mean"].get("value")
            rain_val = obs["summary"]["rainfall_total"].get("value")
    return era5_service.get_complementary_analysis(lat, lon, temp_val, rain_val)


@router.get("/senamhi", response_model=SenamhiReport)
async def senamhi_observation(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
    country_code: str | None = Query(default=None),
):
    """Retrieves official SENAMHI weather stations in Peru. Auto-disabled outside Peru."""
    if not country_code:
        loc = await location_service.identify_location(lat, lon)
        country_code = loc.country_code
    return senamhi_service.get_stations_for_location(lat, lon, country_code)


@router.get("/status")
async def observations_status(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
):
    """Reports operational status across all earth observation providers for a point."""
    from app.ingestion.store import ObservationStore, MODIS
    from app.ml.predictor import model_status
    from app.providers.modis import seed_rows
    store = ObservationStore()
    modis_available = bool(store.latest(MODIS, lat, lon) or seed_rows(lat, lon))
    loc = await location_service.identify_location(lat, lon)
    return {
        "ingestion_sync": store.sync_status(lat, lon),
        "adaptive_ml": model_status(lat, lon),
        "lat": lat,
        "lon": lon,
        "country": loc.country_name,
        "country_code": loc.country_code,
        "region": loc.region,
        "providers": {
            "nasa_power": "operational",
            "nasa_modis_vi": "data_available" if modis_available else "unavailable",
            "soilgrids": soil_service.metadata.status.value,
            "copernicus_era5": era5_service.metadata.status.value,
            "senamhi_peru": "active" if loc.country_code == "PE" else "disabled_outside_peru",
            "faogaez_v5": "operational",
            "faostat": "operational",
        },
    }
