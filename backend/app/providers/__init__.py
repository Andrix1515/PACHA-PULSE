"""Providers package initialization."""

from app.providers.base import BaseProvider, DataProvenance, DataQuality, DataSourceType, ProviderMetadata, ProviderStatus
from app.providers.registry import registry, DataProviderRegistry
from app.providers.location import LocationService
from app.providers.soilgrids import SoilGridsService
from app.providers.gaez import GAEZService
from app.providers.faostat import FAOSTATService
from app.providers.era5 import ERA5Service
from app.providers.senamhi import SENAMHIService

__all__ = [
    "BaseProvider",
    "DataProvenance",
    "DataQuality",
    "DataSourceType",
    "ProviderMetadata",
    "ProviderStatus",
    "registry",
    "DataProviderRegistry",
    "LocationService",
    "SoilGridsService",
    "GAEZService",
    "FAOSTATService",
    "ERA5Service",
    "SENAMHIService",
]
