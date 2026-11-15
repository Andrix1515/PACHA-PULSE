"""SENAMHI regional meteorological provider for Peru.

Supplies nearby national weather stations, climatological normals,
and hydrological context for fields located within Peru.

Automatically deactivated for fields outside Peru.
"""

import math
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from app.providers.base import BaseProvider, DataProvenance, DataQuality, DataSourceType, ProviderMetadata, ProviderStatus


class SenamhiStation(BaseModel):
    station_id: str
    station_name: str
    department: str
    province: str
    lat: float
    lon: float
    altitude_m: float
    distance_km: float
    station_type: str  # "Meteorológica Convencional", "Automática"
    annual_rainfall_normal_mm: float | None = None
    mean_temp_normal_c: float | None = None
    status: str = "operational"


class SenamhiReport(BaseModel):
    is_peru: bool
    status: str  # "active", "disabled_outside_peru", "no_nearby_station"
    nearest_station: SenamhiStation | None = None
    nearby_stations: list[SenamhiStation] = Field(default_factory=list)
    provenance: DataProvenance
    notes: list[str] = Field(default_factory=list)


# Official SENAMHI representative stations in agricultural valleys of Peru
SENAMHI_STATIONS_CATALOG = [
    {
        "id": "112101",
        "name": "Observatorio de Huayao",
        "dept": "Junín",
        "prov": "Huancayo",
        "lat": -12.042,
        "lon": -75.321,
        "alt": 3314.0,
        "type": "Meteorológica Principal",
        "rain_normal": 725.0,
        "temp_normal": 11.2,
    },
    {
        "id": "112104",
        "name": "Viques",
        "dept": "Junín",
        "prov": "Huancayo",
        "lat": -12.148,
        "lon": -75.234,
        "alt": 3190.0,
        "type": "Climatológica Ordinaria",
        "rain_normal": 680.0,
        "temp_normal": 12.0,
    },
    {
        "id": "112108",
        "name": "Jauja (Aeropuerto)",
        "dept": "Junín",
        "prov": "Jauja",
        "lat": -11.783,
        "lon": -75.474,
        "alt": 3363.0,
        "type": "Sinóptica",
        "rain_normal": 650.0,
        "temp_normal": 10.8,
    },
    {
        "id": "112115",
        "name": "Tarma",
        "dept": "Junín",
        "prov": "Tarma",
        "lat": -11.419,
        "lon": -75.689,
        "alt": 3053.0,
        "type": "Climatológica Ordinaria",
        "rain_normal": 590.0,
        "temp_normal": 13.5,
    },
    {
        "id": "111001",
        "name": "La Molina - UNALM",
        "dept": "Lima",
        "prov": "Lima",
        "lat": -12.082,
        "lon": -76.948,
        "alt": 251.0,
        "type": "Meteorológica Principal",
        "rain_normal": 18.0,
        "temp_normal": 19.5,
    },
    {
        "id": "113101",
        "name": "Granja Kayra",
        "dept": "Cusco",
        "prov": "Cusco",
        "lat": -13.558,
        "lon": -71.874,
        "alt": 3219.0,
        "type": "Meteorológica Principal",
        "rain_normal": 710.0,
        "temp_normal": 12.5,
    },
]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


class SENAMHIService(BaseProvider):
    def __init__(self):
        super().__init__(
            ProviderMetadata(
                id="senamhi_peru",
                name="SENAMHI Red Meteorológica Nacional (Perú)",
                organization="Servicio Nacional de Meteorología e Hidrología del Perú (SENAMHI)",
                source_type=DataSourceType.REGIONAL_WEATHER,
                description="Red oficial de estaciones meteorológicas e hidrológicas en territorio peruano.",
                documentation_url="https://www.senamhi.gob.pe/?p=estaciones",
                spatial_resolution="Point in-situ surface weather stations",
                temporal_resolution="Climatological normals and historical station records",
                coverage="national",
                covered_countries=["PE"],
                limitations=[
                    "Regional provider: active exclusively for coordinates within the Republic of Peru (PE).",
                    "Station data represents physical sensors at specific point elevations; microclimate gradients apply across Andean valleys.",
                    "Public station records are compiled from SENAMHI open bulletins and normals.",
                ],
            )
        )

    def get_stations_for_location(self, lat: float, lon: float, country_code: str | None = None) -> SenamhiReport:
        is_peru = (country_code == "PE") or (-18.5 <= lat <= -0.01 and -81.5 <= lon <= -68.5)

        if not is_peru:
            provenance = DataProvenance(
                source="SENAMHI Perú",
                provider_id=self.id,
                spatial_resolution="National (Peru only)",
                data_quality=DataQuality.UNAVAILABLE,
                status="unavailable",
                limitations=["Provider auto-disabled: field is outside Peru."],
            )
            return SenamhiReport(
                is_peru=False,
                status="disabled_outside_peru",
                nearest_station=None,
                nearby_stations=[],
                provenance=provenance,
                notes=["SENAMHI integration is active only for fields in Peru."],
            )

        # Calculate distances to all cataloged stations
        stations_with_dist = []
        for st in SENAMHI_STATIONS_CATALOG:
            d = haversine_distance_km(lat, lon, st["lat"], st["lon"])
            station_obj = SenamhiStation(
                station_id=st["id"],
                station_name=st["name"],
                department=st["dept"],
                province=st["prov"],
                lat=st["lat"],
                lon=st["lon"],
                altitude_m=st["alt"],
                distance_km=d,
                station_type=st["type"],
                annual_rainfall_normal_mm=st.get("rain_normal"),
                mean_temp_normal_c=st.get("temp_normal"),
            )
            stations_with_dist.append(station_obj)

        stations_with_dist.sort(key=lambda x: x.distance_km)
        nearest = stations_with_dist[0] if stations_with_dist else None
        nearby = [s for s in stations_with_dist if s.distance_km <= 150.0][:3]

        provenance = DataProvenance(
            source="SENAMHI Red Oficial de Estaciones",
            provider_id=self.id,
            spatial_resolution="Point weather stations (In-situ)",
            data_quality=DataQuality.MEASURED,
            status="observed",
            limitations=self.metadata.limitations,
        )

        return SenamhiReport(
            is_peru=True,
            status="active",
            nearest_station=nearest,
            nearby_stations=nearby,
            provenance=provenance,
            notes=[
                f"Nearest operational station is {nearest.station_name} ({nearest.distance_km} km away, {nearest.altitude_m:.0f} m.a.s.l.)." if nearest else "No station cataloged within range.",
                "In Andean geography, elevation differences between the station and your parcel heavily affect temperature and frost risk.",
            ],
        )
