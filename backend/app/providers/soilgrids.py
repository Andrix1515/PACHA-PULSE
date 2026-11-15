"""ISRIC SoilGrids v2.0 provider for physical and chemical soil properties.

Retrieves properties across standardized depths (0-5cm, 5-15cm, 15-30cm):
- phh2o: pH in H2O (scaled ×10 in raw → divide by 10)
- soc: Soil Organic Carbon (dg/kg → %: divide by 100)
- nitrogen: Total Nitrogen (cg/kg → g/kg: divide by 100)
- clay, sand, silt: Texture fractions (g/kg → %: divide by 10)
- bdod: Bulk Density of fine earth (cg/cm³ → g/cm³: divide by 100)

Data source: ISRIC WCS 2.0.1 at maps.isric.org (GeoTIFF, Deflate + Horizontal Differencing predictor).
The legacy REST endpoint at rest.isric.org has been deprecated/suspended; this service uses only WCS.

GeoTIFF decode procedure:
  1. Identify tile offsets/byte-counts from TIFF tags 324/325.
  2. Decompress tile with zlib (Deflate, tag 259=8).
  3. Unpack as uint16 (H), apply horizontal differencing predictor (tag 317=2) per row.
  4. Convert to signed int16 (w if w < 32768 else w - 65536).
  5. nodata sentinel = -32768; ignore.
  6. Apply scale factor; average valid pixels.
"""

import struct
import zlib
from datetime import datetime, timezone
from typing import Literal
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

SOILGRIDS_WCS_URL = "https://maps.isric.org/mapserv"

# WCS properties and their display scale factors
_PROPERTY_CONFIG: dict[str, tuple[str, float, str]] = {
    # property_name: (description, scale_factor, display_unit)
    "phh2o":    ("Soil pH in H2O",                   0.1,  "pH"),
    "soc":      ("Soil Organic Carbon",               0.01, "%"),
    "nitrogen": ("Total Nitrogen",                    0.01, "g/kg"),
    "clay":     ("Clay fraction (<2 µm)",              0.1,  "%"),
    "sand":     ("Sand fraction (50–2000 µm)",         0.1,  "%"),
    "silt":     ("Silt fraction (2–50 µm)",            0.1,  "%"),
    "bdod":     ("Bulk density of fine earth",         0.01, "g/cm³"),
}

_DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]

# In-memory cache: key = "lat_round,lon_round"
_SOIL_CACHE: dict[str, dict] = {}


class SoilPropertyLayer(BaseModel):
    depth_range: str         # "0-5cm", "5-15cm", "15-30cm"
    mean_value: float | None
    unit: str
    status: str              # "observed" | "unavailable"


class SoilProperty(BaseModel):
    name: str
    description: str
    unit: str
    layers: list[SoilPropertyLayer]
    profile_mean: float | None = None
    status: str = "observed"


class SoilProfile(BaseModel):
    lat: float
    lon: float
    ph_h2o: SoilProperty | None = None
    soil_organic_carbon: SoilProperty | None = None
    total_nitrogen: SoilProperty | None = None
    texture_clay_percent: SoilProperty | None = None
    texture_sand_percent: SoilProperty | None = None
    texture_silt_percent: SoilProperty | None = None
    bulk_density: SoilProperty | None = None
    soil_texture_class: str = "unknown"
    estimated_soil_depth_cm: float | None = None
    drainage_class: str = "unknown"
    provenance: DataProvenance
    warnings: list[str] = Field(default_factory=list)


def determine_usda_texture(sand: float | None, silt: float | None, clay: float | None) -> str:
    """USDA soil texture triangle classification."""
    if sand is None or silt is None or clay is None:
        return "unknown"
    total = sand + silt + clay
    if total <= 0:
        return "unknown"
    s = (sand / total) * 100
    si = (silt / total) * 100
    c = (clay / total) * 100

    if c >= 40:
        if s <= 45 and si <= 40:
            return "clay"
        elif s > 45:
            return "sandy_clay"
        else:
            return "silty_clay"
    elif c >= 27:
        if s >= 45:
            return "sandy_clay_loam"
        elif s <= 20:
            return "silty_clay_loam"
        else:
            return "clay_loam"
    elif c >= 20:
        if s >= 52:
            return "sandy_clay_loam"
        elif si >= 50:
            return "silt_loam"
        else:
            return "loam"
    else:
        if si >= 80:
            return "silt"
        elif si >= 50:
            return "silt_loam"
        elif s >= 85 and (si + 1.5 * c) < 15:
            return "sand"
        elif s >= 70 and (si + 2.0 * c) < 30:
            return "loamy_sand"
        elif s >= 43 and c <= 20 and si <= 50:
            return "sandy_loam"
        else:
            return "loam"


def _decode_geotiff_mean(data: bytes) -> float | None:
    """
    Decode a small ISRIC WCS GeoTIFF tile and return the mean of valid pixel values (raw, unscaled).

    Returns None if no valid pixels are found (ocean, polar coverage gap, etc.).
    """
    if len(data) < 8 or data[:2] not in (b"II", b"MM"):
        return None

    endian = "<" if data[:2] == b"II" else ">"

    try:
        ifd_offset = struct.unpack(endian + "I", data[4:8])[0]
        if ifd_offset + 2 > len(data):
            return None
        num_entries = struct.unpack(endian + "H", data[ifd_offset : ifd_offset + 2])[0]

        tags: dict[int, int] = {}
        pos = ifd_offset + 2
        for _ in range(num_entries):
            if pos + 12 > len(data):
                break
            tag, typ, count, val_or_off = struct.unpack(endian + "HHI I", data[pos : pos + 12])
            tags[tag] = val_or_off
            pos += 12

        tile_width = tags.get(322)
        tile_height = tags.get(323)
        tile_offset = tags.get(324)
        tile_byte_count = tags.get(325)
        predictor = tags.get(317, 1)
        # Image dimensions
        img_width = tags.get(256)
        img_height = tags.get(257)

        if tile_offset is None or tile_byte_count is None or tile_width is None or tile_height is None:
            return None
        if tile_offset + tile_byte_count > len(data):
            return None

        raw_tile = data[tile_offset : tile_offset + tile_byte_count]
        decompressed = zlib.decompress(raw_tile)

        expected_bytes = tile_width * tile_height * 2  # int16 = 2 bytes
        if len(decompressed) < expected_bytes:
            return None

        words = list(struct.unpack(endian + f"{tile_width * tile_height}H", decompressed[:expected_bytes]))

        # Apply horizontal differencing predictor (per row, within tile_width)
        if predictor == 2:
            for row in range(tile_height):
                start = row * tile_width
                for col in range(1, tile_width):
                    words[start + col] = (words[start + col] + words[start + col - 1]) & 0xFFFF

        # Convert to signed int16
        signed = [w if w < 32768 else w - 65536 for w in words]

        # Collect valid pixels from the actual image area (may be smaller than tile)
        actual_width = img_width if img_width else tile_width
        actual_height = img_height if img_height else tile_height

        valid: list[int] = []
        for row in range(actual_height):
            for col in range(actual_width):
                v = signed[row * tile_width + col]
                if v != -32768 and v > 0:
                    valid.append(v)

        if not valid:
            return None
        return sum(valid) / len(valid)

    except Exception:
        return None


class SoilGridsService(BaseProvider):
    """ISRIC SoilGrids v2.0 — WCS GeoTIFF implementation."""

    def __init__(self):
        super().__init__(
            ProviderMetadata(
                id="soilgrids_isric",
                name="ISRIC SoilGrids v2.0",
                organization="International Soil Reference and Information Centre (ISRIC)",
                source_type=DataSourceType.SOIL,
                description=(
                    "Global digital soil mapping predicting soil physical and chemical properties "
                    "at 250 m resolution across standard depths. Accessed via ISRIC WCS 2.0.1."
                ),
                documentation_url="https://www.isric.org/explore/soilgrids/faq-soilgrids",
                spatial_resolution="Nominal 250 m × 250 m grid cell",
                temporal_resolution="Multi-decadal spatial soil synthesis",
                coverage="global",
                limitations=[
                    "SoilGrids represents statistical machine learning predictions based on global soil profiles and remote sensing covariates.",
                    "Nominal resolution is ~250 m; localized field variations, plow pans, or recent amendments are not reflected.",
                    "Accessed via ISRIC WCS 2.0.1 (maps.isric.org). The legacy REST API (rest.isric.org) is deprecated.",
                    "Always verify critical management decisions with laboratory soil testing.",
                ],
            )
        )

    async def _query_wcs_property(
        self,
        lat: float,
        lon: float,
        property_name: str,
        depth: str,
        client: httpx.AsyncClient,
    ) -> float | None:
        """
        Query a single SoilGrids property at one depth via ISRIC WCS 2.0.1.

        Returns the raw (unscaled) mean pixel value, or None if unavailable.
        """
        # Use a ±0.03° bbox around the point (≈ 3 km at equator; covers ~12 SoilGrids pixels)
        delta = 0.03
        min_lon = round(lon - delta, 6)
        max_lon = round(lon + delta, 6)
        min_lat = round(lat - delta, 6)
        max_lat = round(lat + delta, 6)

        # Clamp to valid WGS84 bounds
        min_lon = max(-180.0, min_lon)
        max_lon = min(180.0, max_lon)
        min_lat = max(-90.0, min_lat)
        max_lat = min(90.0, max_lat)

        params = {
            "map": f"/map/{property_name}.map",
            "SERVICE": "WCS",
            "VERSION": "2.0.1",
            "REQUEST": "GetCoverage",
            "COVERAGEID": f"{property_name}_{depth}_mean",
            "SUBSET": [
                f"long({min_lon},{max_lon})",
                f"lat({min_lat},{max_lat})",
            ],
            "SUBSETTINGCRS": "http://www.opengis.net/def/crs/EPSG/0/4326",
        }

        try:
            resp = await client.get(SOILGRIDS_WCS_URL, params=params)
            if resp.status_code != 200:
                return None
            content = resp.content
            if not content or content[:2] not in (b"II", b"MM"):
                # Could be a MapServer HTML error message
                return None
            return _decode_geotiff_mean(content)
        except (httpx.TimeoutException, httpx.NetworkError):
            raise
        except Exception:
            return None

    async def get_soil_profile(self, lat: float, lon: float, client: httpx.AsyncClient | None = None) -> SoilProfile:
        """
        Retrieve soil profile for a point from ISRIC SoilGrids via WCS 2.0.1.

        Returns a SoilProfile with real values when available, or explicit 'unavailable' status
        per property/depth. Never returns invented or zero values.
        """
        cache_key = f"{round(lat, 3)},{round(lon, 3)}"
        cached = _SOIL_CACHE.get(cache_key)
        if cached:
            return SoilProfile(**cached)

        own_client = client is None
        if own_client:
            client = httpx.AsyncClient(
                timeout=httpx.Timeout(12.0, connect=5.0),
                headers={"User-Agent": "PachaPulse-AgroIntelligence/1.0 (NASA Space Apps; research use)"},
            )

        warnings: list[str] = []
        any_data = False
        all_data = True
        timed_out = False

        # Build a dict: property_name → depth → raw_mean or None
        raw_results: dict[str, dict[str, float | None]] = {p: {} for p in _PROPERTY_CONFIG}

        try:
            for prop_name in _PROPERTY_CONFIG:
                for depth in _DEPTHS:
                    try:
                        value = await self._query_wcs_property(lat, lon, prop_name, depth, client)
                        raw_results[prop_name][depth] = value
                        if value is not None:
                            any_data = True
                        else:
                            all_data = False
                    except httpx.TimeoutException:
                        raw_results[prop_name][depth] = None
                        all_data = False
                        timed_out = True
                    except Exception:
                        raw_results[prop_name][depth] = None
                        all_data = False
        finally:
            if own_client:
                await client.aclose()

        # Update provider health status
        if timed_out and not any_data:
            self.mark_timeout("ISRIC WCS request timed out")
            warnings.append("SoilGrids WCS (maps.isric.org) timed out. All soil properties unavailable.")
        elif not any_data:
            self.mark_unavailable("No valid soil data returned (ocean, polar, or WCS outage)")
            warnings.append(
                "SoilGrids WCS returned no valid data for this location. "
                "This may indicate ocean/polar coordinates or a service outage."
            )
        elif all_data:
            self.mark_success()
        else:
            self.metadata.status = ProviderStatus.PARTIAL_DATA
            self.metadata.last_checked = datetime.now(timezone.utc).isoformat()
            warnings.append("Some SoilGrids properties or depths are unavailable for this location.")

        def build_prop(prop_name: str) -> SoilProperty:
            desc, factor, unit = _PROPERTY_CONFIG[prop_name]
            layers: list[SoilPropertyLayer] = []
            for depth in _DEPTHS:
                raw = raw_results[prop_name].get(depth)
                if raw is not None:
                    scaled = round(raw * factor, 2)
                    layers.append(SoilPropertyLayer(depth_range=depth, mean_value=scaled, unit=unit, status="observed"))
                else:
                    layers.append(SoilPropertyLayer(depth_range=depth, mean_value=None, unit=unit, status="unavailable"))

            valid_vals = [ly.mean_value for ly in layers if ly.mean_value is not None]
            avg = round(sum(valid_vals) / len(valid_vals), 2) if valid_vals else None
            status = "observed" if valid_vals else "unavailable"
            return SoilProperty(name=prop_name, description=desc, unit=unit, layers=layers, profile_mean=avg, status=status)

        ph_prop   = build_prop("phh2o")
        soc_prop  = build_prop("soc")
        n_prop    = build_prop("nitrogen")
        clay_prop = build_prop("clay")
        sand_prop = build_prop("sand")
        silt_prop = build_prop("silt")
        bdod_prop = build_prop("bdod")

        # USDA texture from top layer (0-5cm) or profile mean
        c_val  = clay_prop.layers[0].mean_value if clay_prop.layers else None
        s_val  = sand_prop.layers[0].mean_value if sand_prop.layers else None
        si_val = silt_prop.layers[0].mean_value if silt_prop.layers else None
        texture_class = determine_usda_texture(s_val, si_val, c_val)

        # Heuristic drainage class from texture
        if texture_class in ("sand", "loamy_sand", "sandy_loam"):
            drainage = "well_drained"
        elif texture_class in ("clay", "silty_clay"):
            drainage = "poorly_drained"
        else:
            drainage = "moderate"

        provenance = DataProvenance(
            source="ISRIC SoilGrids 250 m v2.0 — WCS 2.0.1 (maps.isric.org)",
            provider_id=self.id,
            spatial_resolution=self.metadata.spatial_resolution,
            data_quality=DataQuality.MODELED if any_data else DataQuality.UNAVAILABLE,
            status="derived" if any_data else "unavailable",
            limitations=self.metadata.limitations,
        )

        profile = SoilProfile(
            lat=lat,
            lon=lon,
            ph_h2o=ph_prop,
            soil_organic_carbon=soc_prop,
            total_nitrogen=n_prop,
            texture_clay_percent=clay_prop,
            texture_sand_percent=sand_prop,
            texture_silt_percent=silt_prop,
            bulk_density=bdod_prop,
            soil_texture_class=texture_class,
            estimated_soil_depth_cm=None,
            drainage_class=drainage,
            provenance=provenance,
            warnings=warnings,
        )

        if any_data:
            _SOIL_CACHE[cache_key] = profile.model_dump()
        return profile
