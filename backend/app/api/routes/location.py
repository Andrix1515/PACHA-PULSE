"""API endpoints for Location Intelligence and Data Provider Registry."""

from fastapi import APIRouter, Query
from app.providers.location import LocationContext, LocationService
from app.providers.elevation import ElevationService, TerrainInfo
from app.providers.registry import LocationProvidersReport, registry

router = APIRouter(prefix="/location", tags=["Location Intelligence"])
location_service = LocationService()
elevation_service = ElevationService()


@router.get("/inspect", response_model=LocationContext)
async def inspect_location(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
):
    """Identifies country, administrative division, hemisphere, climate zone and elevation for coordinates."""
    return await location_service.identify_location(lat, lon)


@router.get("/terrain", response_model=TerrainInfo)
async def get_terrain(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
    polygon_lats: str | None = Query(default=None, description="Comma-separated latitudes of polygon vertices"),
    polygon_lons: str | None = Query(default=None, description="Comma-separated longitudes of polygon vertices"),
):
    """Calculates ground elevation, min/max relief, slope % and aspect for a point or polygon."""
    polygon_points = None
    if polygon_lats and polygon_lons:
        try:
            lats = [float(x.strip()) for x in polygon_lats.split(",") if x.strip()]
            lons = [float(x.strip()) for x in polygon_lons.split(",") if x.strip()]
            if len(lats) == len(lons) and len(lats) >= 3:
                polygon_points = list(zip(lats, lons))
        except ValueError:
            pass
    return await elevation_service.get_terrain(lat, lon, polygon_points)


@router.get("/providers", response_model=LocationProvidersReport)
async def list_providers_for_location(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
    country_code: str | None = Query(default=None, max_length=10),
):
    """Lists all data providers with their availability, status, and coverage for the selected coordinates."""
    if not country_code:
        loc = await location_service.identify_location(lat, lon)
        country_code = loc.country_code
    return registry.get_providers_for_location(lat, lon, country_code)
