"""Base provider definitions and registry for Pacha-Pulse data sources.

Every data provider is modular, can be enabled/disabled independently,
tracks its health, data quality, spatial/temporal resolution, and provenance.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field


class DataSourceType(str, Enum):
    CLIMATE = "climate"
    SOIL = "soil"
    SUITABILITY = "suitability"
    STATISTICS = "statistics"
    ELEVATION = "elevation"
    REGIONAL_WEATHER = "regional_weather"
    SATELLITE_VEGETATION = "satellite_vegetation"


class ProviderStatus(str, Enum):
    CONFIGURED = "configured"            # credentials present, not yet tested
    CHECKING = "checking"                # health check in progress
    CONNECTED = "connected"              # service reachable, no data yet
    DATA_AVAILABLE = "data_available"    # data returned successfully
    PARTIAL_DATA = "partial_data"        # some variables returned, some unavailable
    EMPTY_RESPONSE = "empty_response"    # connected but no data for location
    DEGRADED = "degraded"               # service reachable but slow/errors
    TIMEOUT = "timeout"                 # request timed out
    UNAVAILABLE = "unavailable"         # service unreachable
    NOT_CONFIGURED = "not_configured"   # missing credentials/config
    OUTSIDE_COVERAGE = "outside_coverage"  # location not in coverage area
    DISABLED = "disabled"               # intentionally disabled
    NOT_APPLICABLE = "not_applicable"   # provider not relevant for query


class DataQuality(str, Enum):
    MEASURED = "measured"
    REANALYSIS = "reanalysis"
    MODELED = "modeled"
    ESTIMATED = "estimated"
    OFFLINE_DATABASE = "offline_database"
    UNAVAILABLE = "unavailable"


class ProviderMetadata(BaseModel):
    id: str
    name: str
    organization: str
    source_type: DataSourceType
    description: str
    documentation_url: str
    spatial_resolution: str
    temporal_resolution: str
    status: ProviderStatus = ProviderStatus.CONFIGURED
    coverage: Literal["global", "regional", "national"] = "global"
    covered_countries: list[str] = Field(default_factory=list)  # ISO 3166-1 alpha-2, e.g. ["PE"]
    last_checked: str | None = None
    last_error: str | None = None
    enabled: bool = True
    limitations: list[str] = Field(default_factory=list)


class DataProvenance(BaseModel):
    source: str
    provider_id: str
    retrieved_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    observed_period: str | None = None
    spatial_resolution: str
    data_quality: DataQuality
    status: Literal["observed", "derived", "modeled", "scenario", "user_input", "unavailable"]
    limitations: list[str] = Field(default_factory=list)


class BaseProvider(ABC):
    """Abstract base class for all Pacha-Pulse data providers."""

    def __init__(self, metadata: ProviderMetadata):
        self.metadata = metadata

    @property
    def id(self) -> str:
        return self.metadata.id

    @property
    def is_enabled(self) -> bool:
        return self.metadata.enabled and self.metadata.status != ProviderStatus.DISABLED

    def is_available_for_location(self, lat: float, lon: float, country_code: str | None = None) -> bool:
        """Determines if the provider covers the given location."""
        if not self.is_enabled:
            return False
        if self.metadata.coverage == "global":
            return -90 <= lat <= 90 and -180 <= lon <= 180
        if self.metadata.coverage in ("regional", "national") and self.metadata.covered_countries:
            return country_code is not None and country_code.upper() in [c.upper() for c in self.metadata.covered_countries]
        return True

    def mark_error(self, message: str) -> None:
        self.metadata.last_error = message
        self.metadata.status = ProviderStatus.DEGRADED
        self.metadata.last_checked = datetime.now(timezone.utc).isoformat()

    def mark_success(self) -> None:
        self.metadata.last_error = None
        self.metadata.status = ProviderStatus.DATA_AVAILABLE
        self.metadata.last_checked = datetime.now(timezone.utc).isoformat()

    def mark_timeout(self, message: str) -> None:
        self.metadata.last_error = message
        self.metadata.status = ProviderStatus.TIMEOUT
        self.metadata.last_checked = datetime.now(timezone.utc).isoformat()

    def mark_unavailable(self, message: str) -> None:
        self.metadata.last_error = message
        self.metadata.status = ProviderStatus.UNAVAILABLE
        self.metadata.last_checked = datetime.now(timezone.utc).isoformat()
