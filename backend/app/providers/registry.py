"""Central Data Provider Registry for Pacha-Pulse.

Manages all global and regional data providers:
- NASA POWER (Climate - live & demo)
- OpenStreetMap & Location Intelligence (Geocoding & Elevation)
- ISRIC SoilGrids v2.0 (Physical & chemical soil properties)
- FAO GAEZ v5 (Agro-ecological suitability)
- FAOSTAT (National agricultural statistics)
- Copernicus ERA5-Land (Complementary reanalysis climate)
- SENAMHI (Peru regional in-situ stations)
- Extensible stubs for NASA GPM/IMERG, SMAP, Landsat/MODIS, ECOSTRESS.
"""

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field

from app.providers.base import BaseProvider, DataSourceType, ProviderMetadata, ProviderStatus
from app.providers.location import LocationService
from app.providers.soilgrids import SoilGridsService
from app.providers.gaez import GAEZService
from app.providers.faostat import FAOSTATService
from app.providers.era5 import ERA5Service
from app.providers.senamhi import SENAMHIService
from app.providers.elevation import ElevationService
from app.providers.modis import MODISService


class ProviderOverview(BaseModel):
    id: str
    name: str
    organization: str
    source_type: str
    coverage: str
    is_active_for_location: bool
    status: ProviderStatus
    spatial_resolution: str
    temporal_resolution: str
    documentation_url: str
    last_error: str | None = None
    enabled: bool = True


class LocationProvidersReport(BaseModel):
    lat: float
    lon: float
    country_code: str
    country_name: str
    active_providers_count: int
    providers: list[ProviderOverview]


class DataProviderRegistry:
    def __init__(self):
        self._providers: dict[str, BaseProvider] = {}
        self._register_default_providers()

    def _register_default_providers(self):
        # 1. Location Intelligence (OSM + SRTM)
        self.register(LocationService())
        # 2. SoilGrids (ISRIC)
        self.register(SoilGridsService())
        # 3. FAO GAEZ v5
        self.register(GAEZService())
        # 4. FAOSTAT
        self.register(FAOSTATService())
        # 5. Copernicus ERA5-Land
        self.register(ERA5Service())
        # 6. SENAMHI Peru
        self.register(SENAMHIService())
        # 7. Copernicus DEM & SRTM Terrain
        self.register(ElevationService())

        # Future NASA collection placeholders (registered as inactive/extensible)
        self._register_future_nasa_stubs()
        self.register(MODISService())

    def _register_future_nasa_stubs(self):
        stubs = [
            ProviderMetadata(
                id="nasa_gpm_imerg",
                name="NASA GPM IMERG Half-Hourly & Daily Precipitation",
                organization="NASA Goddard Space Flight Center (GSFC)",
                source_type=DataSourceType.CLIMATE,
                description="Global satellite precipitation estimates at 0.1° × 0.1° (~10 km) resolution.",
                documentation_url="https://gpm.nasa.gov/data/imerg",
                spatial_resolution="0.1° (~10 km) grid",
                temporal_resolution="Daily / Multi-satellite",
                status=ProviderStatus.DISABLED,
                enabled=False,
                limitations=["Architecture prepared for Earthdata / GEE precipitation integration."],
            ),
            ProviderMetadata(
                id="nasa_smap_soil_moisture",
                name="NASA SMAP Surface & Root-Zone Soil Moisture",
                organization="NASA Jet Propulsion Laboratory (JPL)",
                source_type=DataSourceType.SOIL,
                description="Global L-band radiometer measuring top 5 cm soil volumetric water content.",
                documentation_url="https://smap.jpl.nasa.gov/",
                spatial_resolution="9 km / 36 km global grid",
                temporal_resolution="2-3 day revisit",
                status=ProviderStatus.DISABLED,
                enabled=False,
                limitations=["Architecture prepared for Earthdata SMAP L3/L4 soil moisture integration."],
            ),
        ]
        for stub in stubs:
            class StubProvider(BaseProvider):
                pass
            self.register(StubProvider(stub))

    def register(self, provider: BaseProvider) -> None:
        self._providers[provider.id] = provider

    def get(self, provider_id: str) -> BaseProvider | None:
        return self._providers.get(provider_id)

    def list_all(self) -> list[BaseProvider]:
        return list(self._providers.values())

    def set_enabled(self, provider_id: str, enabled: bool) -> bool:
        provider = self.get(provider_id)
        if provider:
            provider.metadata.enabled = enabled
            provider.metadata.status = ProviderStatus.CONFIGURED if enabled else ProviderStatus.DISABLED
            return True
        return False

    def get_providers_for_location(self, lat: float, lon: float, country_code: str | None = None) -> LocationProvidersReport:
        overviews: list[ProviderOverview] = []
        active_count = 0

        for p in self._providers.values():
            covers = p.is_available_for_location(lat, lon, country_code)
            if covers and p.is_enabled:
                active_count += 1
            overviews.append(
                ProviderOverview(
                    id=p.id,
                    name=p.metadata.name,
                    organization=p.metadata.organization,
                    source_type=p.metadata.source_type.value,
                    coverage=p.metadata.coverage,
                    is_active_for_location=covers,
                    status=p.metadata.status if covers else ProviderStatus.NOT_APPLICABLE,
                    spatial_resolution=p.metadata.spatial_resolution,
                    temporal_resolution=p.metadata.temporal_resolution,
                    documentation_url=p.metadata.documentation_url,
                    last_error=p.metadata.last_error,
                    enabled=p.metadata.enabled,
                )
            )

        return LocationProvidersReport(
            lat=lat,
            lon=lon,
            country_code=country_code or "XX",
            country_name="Identified Territory",
            active_providers_count=active_count,
            providers=overviews,
        )


# Global registry singleton
registry = DataProviderRegistry()
