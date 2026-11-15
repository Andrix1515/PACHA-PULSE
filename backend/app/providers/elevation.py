"""Elevation and Terrain Service for Pacha-Pulse.

Calculates elevation, local relief, estimated slope gradient and aspect
using high-resolution Digital Elevation Models (Copernicus DEM 90m / SRTM GL1 30m)
via the Open-Meteo Elevation API.

Distinguishes single query points from polygon spatial evaluations.
"""

import math
from datetime import datetime, timezone
import httpx
from pydantic import BaseModel, Field

from app.providers.base import (
    BaseProvider,
    DataProvenance,
    DataQuality,
    DataSourceType,
    ProviderMetadata,
    ProviderStatus,
)

OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"

# Local cache: key = "lat_round,lon_round"
_ELEVATION_CACHE: dict[str, dict] = {}


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two points in meters."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def calculate_aspect(highest_lat: float, highest_lon: float, lowest_lat: float, lowest_lon: float) -> str:
    """
    Estimates dominant downslope aspect (direction of fall) from highest to lowest point.
    """
    dlat = lowest_lat - highest_lat
    dlon = (lowest_lon - highest_lon) * math.cos(math.radians((highest_lat + lowest_lat) / 2.0))
    if abs(dlat) < 1e-7 and abs(dlon) < 1e-7:
        return "flat"

    angle_deg = (math.degrees(math.atan2(dlon, dlat)) + 360) % 360
    # 0 = N, 45 = NE, 90 = E, 135 = SE, 180 = S, 225 = SW, 270 = W, 315 = NW
    sectors = [
        ("N", 22.5), ("NE", 67.5), ("E", 112.5), ("SE", 157.5),
        ("S", 202.5), ("SW", 247.5), ("W", 292.5), ("NW", 337.5), ("N", 360.0),
    ]
    for name, threshold in sectors:
        if angle_deg < threshold:
            return name
    return "N"


class TerrainInfo(BaseModel):
    lat: float
    lon: float
    elevation_m: float | None = None
    elevation_min_m: float | None = None
    elevation_max_m: float | None = None
    relief_m: float | None = None
    slope_percent: float | None = None
    slope_degrees: float | None = None
    aspect: str | None = None
    dem_source: str = "Copernicus DEM 90m / SRTM"
    provenance: DataProvenance
    warnings: list[str] = Field(default_factory=list)


class ElevationService(BaseProvider):
    def __init__(self):
        super().__init__(
            ProviderMetadata(
                id="elevation_terrain",
                name="Copernicus DEM & SRTM Terrain Service",
                organization="European Space Agency (ESA) & NASA / Open-Meteo",
                source_type=DataSourceType.ELEVATION,
                description="Digital Elevation Model providing ground elevation, relief range, and slope gradient.",
                documentation_url="https://open-meteo.com/en/docs/elevation-api",
                spatial_resolution="Copernicus DEM 90 m / SRTM 30 m",
                temporal_resolution="Static topography",
                coverage="global",
                status=ProviderStatus.CONFIGURED,
                limitations=[
                    "DEM resolutions (30-90m) smooth fine-scale micro-topography, terraces, and drainage ditches.",
                    "Slope estimation is derived from sample points across the field polygon.",
                ],
            )
        )

    async def get_terrain(
        self,
        lat: float,
        lon: float,
        polygon_points: list[tuple[float, float]] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> TerrainInfo:
        """
        Calculates terrain information for a single point or across a polygon.
        If polygon_points is provided, queries all vertices plus the center point.
        """
        # Determine query coordinates
        points: list[tuple[float, float]] = []
        if polygon_points and len(polygon_points) >= 3:
            # vertices + center
            c_lat = sum(p[0] for p in polygon_points) / len(polygon_points)
            c_lon = sum(p[1] for p in polygon_points) / len(polygon_points)
            points = list(polygon_points) + [(c_lat, c_lon)]
        else:
            # Query point with 4 surrounding samples (+-0.001 deg ≈ 110m) to estimate local slope
            delta = 0.001
            points = [
                (lat, lon),
                (lat + delta, lon),
                (lat - delta, lon),
                (lat, lon + delta),
                (lat, lon - delta),
            ]

        cache_key = f"{round(lat, 4)},{round(lon, 4)},{len(points)}"
        cached = _ELEVATION_CACHE.get(cache_key)
        if cached:
            return TerrainInfo(**cached)

        own_client = client is None
        if own_client:
            client = httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=3.0))

        elevations: list[float] = []
        warnings: list[str] = []
        quality = DataQuality.MEASURED

        lat_str = ",".join(f"{p[0]:.6f}" for p in points)
        lon_str = ",".join(f"{p[1]:.6f}" for p in points)

        try:
            resp = await client.get(
                OPEN_METEO_ELEVATION_URL,
                params={"latitude": lat_str, "longitude": lon_str},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_elev = data.get("elevation", [])
                if isinstance(raw_elev, list):
                    elevations = [float(e) for e in raw_elev if e is not None]
                elif raw_elev is not None:
                    elevations = [float(raw_elev)]
                self.mark_success()
            else:
                warnings.append(f"Elevation API returned status {resp.status_code}.")
                self.mark_error(f"HTTP {resp.status_code}")
        except Exception as exc:
            warnings.append(f"Elevation query error: {exc}")
            self.mark_error(str(exc))
        finally:
            if own_client:
                await client.aclose()

        if not elevations:
            # Fallback
            quality = DataQuality.UNAVAILABLE
            provenance = DataProvenance(
                source="Copernicus DEM 90m / SRTM",
                provider_id=self.id,
                spatial_resolution=self.metadata.spatial_resolution,
                data_quality=quality,
                status="unavailable",
                limitations=self.metadata.limitations,
            )
            return TerrainInfo(
                lat=lat,
                lon=lon,
                provenance=provenance,
                warnings=warnings,
            )

        mean_elev = round(sum(elevations) / len(elevations), 1)
        min_elev = round(min(elevations), 1)
        max_elev = round(max(elevations), 1)
        relief = round(max_elev - min_elev, 1)

        # Estimate slope from relief and horizontal distance
        # Find index of min and max elevation points
        min_idx = elevations.index(min(elevations))
        max_idx = elevations.index(max(elevations))
        p_min = points[min_idx]
        p_max = points[max_idx]
        dist_m = haversine_distance_m(p_min[0], p_min[1], p_max[0], p_max[1])

        if dist_m > 10.0 and relief > 0.0:
            slope_pct = round((relief / dist_m) * 100.0, 1)
            # Cap realistic slope to 150%
            slope_pct = min(150.0, slope_pct)
            slope_deg = round(math.degrees(math.atan(slope_pct / 100.0)), 1)
            aspect = calculate_aspect(p_max[0], p_max[1], p_min[0], p_min[1])
        else:
            slope_pct = 0.5
            slope_deg = 0.3
            aspect = "flat"

        provenance = DataProvenance(
            source="Copernicus DEM 90m / SRTM via Open-Meteo",
            provider_id=self.id,
            spatial_resolution=self.metadata.spatial_resolution,
            data_quality=quality,
            status="derived",
            limitations=self.metadata.limitations,
        )

        res = TerrainInfo(
            lat=lat,
            lon=lon,
            elevation_m=mean_elev,
            elevation_min_m=min_elev,
            elevation_max_m=max_elev,
            relief_m=relief,
            slope_percent=slope_pct,
            slope_degrees=slope_deg,
            aspect=aspect,
            dem_source="Copernicus DEM 90m / SRTM",
            provenance=provenance,
            warnings=warnings,
        )
        _ELEVATION_CACHE[cache_key] = res.model_dump()
        return res
