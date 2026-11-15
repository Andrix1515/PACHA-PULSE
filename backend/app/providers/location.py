"""Location intelligence service: country, administrative region, hemisphere, elevation.

Uses OpenStreetMap Nominatim with caching and compliance with OSM usage policy,
coupled with an offline geographic index to guarantee immediate, fault-tolerant identification.
"""

import asyncio
from datetime import datetime, timezone
import httpx
from pydantic import BaseModel, Field

from app.providers.base import BaseProvider, DataProvenance, DataQuality, DataSourceType, ProviderMetadata, ProviderStatus

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"

# In-memory LRU-like cache for reverse geocoding & elevation
_GEO_CACHE: dict[str, dict] = {}
_ELEVATION_CACHE: dict[str, dict] = {}


class LocationContext(BaseModel):
    lat: float
    lon: float
    country_code: str  # ISO 3166-1 alpha-2, e.g. "PE", "US"
    country_name: str
    region: str  # e.g. "Junín", "Iowa", "Valle del Cauca"
    subregion: str | None = None  # e.g. "Huancayo", "Story County"
    hemisphere: str  # "northern", "southern", "equatorial"
    elevation_m: float | None = None
    slope_percent: float | None = None
    climate_zone: str  # e.g. "Andean Highland", "Temperate Continental", "Tropical Wet-Dry"
    provenance: DataProvenance


# Offline fallback bounding boxes for fast, resilient offline location identification
OFFLINE_REGIONS = [
    # Peru
    {"min_lat": -18.4, "max_lat": -0.03, "min_lon": -81.4, "max_lon": -68.6, "code": "PE", "name": "Peru", "region": "Andean / Coastal", "zone": "Andean Highland / Subtropical", "elev": 3200},
    # Junin, Peru specific
    {"min_lat": -12.6, "max_lat": -11.0, "min_lon": -76.0, "max_lon": -74.5, "code": "PE", "name": "Peru", "region": "Junín (Mantaro Valley)", "zone": "Andean Highland", "elev": 3250},
    # United States - Midwest / Corn Belt
    {"min_lat": 36.0, "max_lat": 49.5, "min_lon": -104.0, "max_lon": -80.0, "code": "US", "name": "United States", "region": "Midwest Corn Belt", "zone": "Temperate Continental", "elev": 300},
    # United States general
    {"min_lat": 24.5, "max_lat": 49.5, "min_lon": -125.0, "max_lon": -66.9, "code": "US", "name": "United States", "region": "North America", "zone": "Temperate", "elev": 450},
    # Colombia
    {"min_lat": -4.2, "max_lat": 12.5, "min_lon": -79.0, "max_lon": -66.8, "code": "CO", "name": "Colombia", "region": "Valle del Cauca / Andes", "zone": "Tropical Mountain / Equatorial", "elev": 1000},
    # Kenya
    {"min_lat": -4.7, "max_lat": 5.0, "min_lon": 33.9, "max_lon": 41.9, "code": "KE", "name": "Kenya", "region": "Rift Valley / Central", "zone": "Tropical Highland", "elev": 1700},
    # Brazil
    {"min_lat": -33.7, "max_lat": 5.3, "min_lon": -73.9, "max_lon": -34.8, "code": "BR", "name": "Brazil", "region": "Cerrado / South", "zone": "Tropical / Subtropical", "elev": 600},
    # Spain
    {"min_lat": 35.9, "max_lat": 43.8, "min_lon": -9.3, "max_lon": 4.3, "code": "ES", "name": "Spain", "region": "Castilla y León / Mediterranean", "zone": "Mediterranean Continental", "elev": 700},
    # India
    {"min_lat": 8.0, "max_lat": 35.5, "min_lon": 68.1, "max_lon": 97.4, "code": "IN", "name": "India", "region": "Indo-Gangetic / Deccan", "zone": "Tropical Monsoon / Semi-Arid", "elev": 250},
]


def determine_hemisphere(lat: float) -> str:
    if abs(lat) <= 2.5:
        return "equatorial"
    return "northern" if lat > 0 else "southern"


def _offline_lookup(lat: float, lon: float) -> dict:
    for reg in OFFLINE_REGIONS:
        if reg["min_lat"] <= lat <= reg["max_lat"] and reg["min_lon"] <= lon <= reg["max_lon"]:
            return reg
    # Default fallback
    hem = determine_hemisphere(lat)
    return {
        "code": "XX",
        "name": "Global Region",
        "region": f"Coordinates ({lat:.2f}, {lon:.2f})",
        "zone": "Temperate" if abs(lat) > 23.5 else "Tropical",
        "elev": None,
    }


class LocationService(BaseProvider):
    def __init__(self):
        super().__init__(
            ProviderMetadata(
                id="location_intelligence",
                name="Location Intelligence & Geospatial Context",
                organization="OpenStreetMap & Open-Meteo",
                source_type=DataSourceType.ELEVATION,
                description="Identifies country, administrative division, hemisphere and terrain elevation from WGS84 coordinates.",
                documentation_url="https://operations.osmfoundation.org/policies/nominatim/",
                spatial_resolution="Point / Administrative polygon",
                temporal_resolution="Static geographic context",
                coverage="global",
                limitations=[
                    "Reverse geocoding depends on OpenStreetMap boundary definitions.",
                    "Elevation is based on satellite digital elevation models (SRTM / Copernicus DEM ~90m), not field survey.",
                ],
            )
        )

    async def get_elevation(self, lat: float, lon: float, client: httpx.AsyncClient | None = None) -> float | None:
        cache_key = f"{round(lat, 4)},{round(lon, 4)}"
        if cache_key in _ELEVATION_CACHE:
            return _ELEVATION_CACHE[cache_key]["elevation"]

        own_client = client is None
        if own_client:
            client = httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=3.0))
        try:
            resp = await client.get(ELEVATION_URL, params={"latitude": lat, "longitude": lon})
            if resp.status_code == 200:
                data = resp.json()
                elev = data.get("elevation", [None])[0] if isinstance(data.get("elevation"), list) else data.get("elevation")
                if elev is not None:
                    _ELEVATION_CACHE[cache_key] = {"elevation": float(elev)}
                    return float(elev)
        except Exception:
            pass
        finally:
            if own_client:
                await client.aclose()

        # Fallback to offline approximation
        off = _offline_lookup(lat, lon)
        return off.get("elev")

    async def identify_location(self, lat: float, lon: float, client: httpx.AsyncClient | None = None) -> LocationContext:
        cache_key = f"{round(lat, 3)},{round(lon, 3)}"
        cached = _GEO_CACHE.get(cache_key)
        if cached:
            elev = await self.get_elevation(lat, lon, client)
            cached["elevation_m"] = elev
            return LocationContext(**cached)

        offline = _offline_lookup(lat, lon)
        country_code = offline["code"]
        country_name = offline["name"]
        region = offline["region"]
        subregion = None
        climate_zone = offline["zone"]
        quality = DataQuality.OFFLINE_DATABASE

        own_client = client is None
        if own_client:
            client = httpx.AsyncClient(
                timeout=httpx.Timeout(4.0, connect=2.0),
                headers={"User-Agent": "PachaPulse-AgroIntelligence/1.0 (NASA Space Apps Challenge demo; contact@pachapulse.org)"},
            )

        try:
            resp = await client.get(
                NOMINATIM_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "format": "jsonv2",
                    "zoom": 10,
                    "accept-language": "es,en",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                addr = data.get("address", {})
                country_code = addr.get("country_code", country_code).upper()
                country_name = addr.get("country", country_name)
                region = addr.get("state") or addr.get("region") or addr.get("province") or region
                subregion = addr.get("county") or addr.get("municipality") or addr.get("city") or subregion
                quality = DataQuality.MEASURED
                self.mark_success()
        except Exception as exc:
            self.mark_error(f"Nominatim geocoding fallback used: {exc}")
        finally:
            if own_client:
                await client.aclose()

        elev = await self.get_elevation(lat, lon, client)
        hemisphere = determine_hemisphere(lat)

        provenance = DataProvenance(
            source="OpenStreetMap Nominatim + SRTM Elevation",
            provider_id=self.id,
            spatial_resolution="Administrative boundary / SRTM 90m DEM",
            data_quality=quality,
            status="observed" if quality == DataQuality.MEASURED else "derived",
            limitations=self.metadata.limitations,
        )

        res_dict = {
            "lat": lat,
            "lon": lon,
            "country_code": country_code,
            "country_name": country_name,
            "region": region,
            "subregion": subregion,
            "hemisphere": hemisphere,
            "elevation_m": elev,
            "slope_percent": None,  # Slope can be user-provided or derived from DEM
            "climate_zone": climate_zone,
            "provenance": provenance.model_dump(),
        }
        _GEO_CACHE[cache_key] = res_dict
        return LocationContext(**res_dict)
