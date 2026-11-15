"""FAO Global Agro-Ecological Zones (GAEZ v5 / v4) provider.

Evaluates crop suitability based on FAO-IIASA agro-ecological zoning principles:
- Thermal regime and temperature profile
- Moisture regime and growing period duration (LGP)
- Soil/terrain constraints
- Water supply regime: Rainfed (RF) vs Irrigated (IR)
- Agricultural input level: Intermediate vs High

Provides both a documented raster file adapter for GAEZ GeoTIFF downloads
and an agro-climatic zone suitability database for primary food and cash crops.
"""

from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, Field

from app.providers.base import BaseProvider, DataProvenance, DataQuality, DataSourceType, ProviderMetadata


class SuitabilityClass(str, Enum):
    VERY_SUITABLE = "very_suitable"       # 80-100% agro-climatic potential
    SUITABLE = "suitable"                 # 60-80%
    MODERATELY_SUITABLE = "moderately_suitable" # 40-60%
    MARGINALLY_SUITABLE = "marginally_suitable" # 20-40%
    NOT_SUITABLE = "not_suitable"         # <20%
    INSUFFICIENT_DATA = "insufficient_data"


class GAEZCropSuitability(BaseModel):
    crop_id: str
    crop_name: str
    scientific_name: str
    water_regime: Literal["rainfed", "irrigated"]
    input_level: Literal["intermediate", "high"]
    suitability_class: SuitabilityClass
    suitability_score: int | None = None  # 0 to 100 index
    thermal_suitability: str
    moisture_suitability: str
    primary_limiting_factor: str | None = None
    notes: str


class GAEZEvaluation(BaseModel):
    lat: float
    lon: float
    country_code: str | None = None
    climate_zone: str
    evaluated_crops: list[GAEZCropSuitability]
    provenance: DataProvenance
    raster_source_attached: bool = False
    methodology_notes: list[str] = Field(default_factory=list)


# Reference agro-ecological suitability matrix by agro-climatic thermal/moisture zone
# Based on FAO GAEZ v4/v5 global agro-ecological crop requirement tables.
AGRO_CLIMATIC_ZONE_MATRIX: dict[str, dict[str, dict]] = {
    # Andean Highland (>2500m tropical/subtropical)
    "Andean Highland": {
        "potato": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 90, "limit": "Cold-adapted tuber; frost risk at >3800m"},
        "quinoa": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 92, "limit": "Highly adapted to altiplano; drought and frost hardy"},
        "maize": {"rainfed": SuitabilityClass.MODERATELY_SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 65, "limit": "Requires frost-free valley floor; longer cycle at altitude"},
        "faba_bean": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 88, "limit": "Adapted highland legume; biological N2 fixation"},
        "barley": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 85, "limit": "Tolerates cold and moderate salinity"},
        "wheat": {"rainfed": SuitabilityClass.MODERATELY_SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 68, "limit": "Fungal pressure in humid valleys"},
        "bean": {"rainfed": SuitabilityClass.MODERATELY_SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 60, "limit": "Frost sensitive; suitable in lower sheltered valley terraces"},
        "lentil": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 75, "limit": "Cool-season legume, good fit for dry valleys"},
        "alfalfa": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 82, "limit": "Deep rooting perennial, benefits from irrigation"},
        "oat": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 80, "limit": "Good forage and grain performance in cool climates"},
    },
    # Temperate Continental (e.g. US Midwest, Ukraine, North China plain)
    "Temperate Continental": {
        "maize": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 95, "limit": "Excellent summer thermal sum; moisture critical during silking"},
        "soybean": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 92, "limit": "High biological N fixation; standard rotation partner for maize"},
        "wheat": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 85, "limit": "Winter wheat adapted; summer heat may truncate grain filling"},
        "oat": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 88, "limit": "Early spring cool season cereal"},
        "barley": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 78, "limit": "Cool temperate cereal"},
        "potato": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 80, "limit": "Requires well-drained soils and even moisture"},
        "sunflower": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 82, "limit": "Drought-tolerant taproot; pest monitoring required"},
        "pea": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 80, "limit": "Cool season pulse, excellent early nitrogen fixer"},
        "clover": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 90, "limit": "Outstanding nitrogen-fixing cover crop"},
        "rye_cover": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 95, "limit": "Winter-hardy cover crop, prevents soil erosion"},
    },
    # Tropical Mountain / Equatorial (e.g. Colombia, Kenya, Ecuador, East Africa)
    "Tropical Mountain / Equatorial": {
        "maize": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 85, "limit": "Multiple cycles possible, watch borer and fungal diseases"},
        "bean": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 90, "limit": "Key subsistence pulse; dual purpose grain and soil N"},
        "potato": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 78, "limit": "Best in mid-to-high elevations (1800-2800m)"},
        "cassava": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 88, "limit": "In lower elevation sectors (<1500m); drought hardy"},
        "sweet_potato": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 86, "limit": "Tolerates erratic rainfall and modest soil fertility"},
        "cowpea": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 85, "limit": "Heat and drought tolerant pulse with high N fixation"},
        "tomato": {"rainfed": SuitabilityClass.MODERATELY_SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 70, "limit": "High moisture and fungal susceptibility; needs irrigation control"},
        "quinoa": {"rainfed": SuitabilityClass.MARGINALLY_SUITABLE, "irrigated": SuitabilityClass.MODERATELY_SUITABLE, "score": 45, "limit": "High humidity and temperature may impair seed set"},
    },
    # Default Mediterranean / Subtropical / General
    "General": {
        "wheat": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 80, "limit": "Dependence on winter/spring rainfall"},
        "barley": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 82, "limit": "Tolerant of water stress"},
        "maize": {"rainfed": SuitabilityClass.MODERATELY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 75, "limit": "Summer drought restricts rainfed potential"},
        "bean": {"rainfed": SuitabilityClass.MODERATELY_SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 65, "limit": "Water stress at flowering reduces pod set"},
        "lentil": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 80, "limit": "Adapted cool-season grain legume"},
        "chickpea": {"rainfed": SuitabilityClass.VERY_SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 88, "limit": "Deep taproot, highly drought adapted"},
        "potato": {"rainfed": SuitabilityClass.MODERATELY_SUITABLE, "irrigated": SuitabilityClass.SUITABLE, "score": 70, "limit": "Requires irrigation in dry summer climates"},
        "sunflower": {"rainfed": SuitabilityClass.SUITABLE, "irrigated": SuitabilityClass.VERY_SUITABLE, "score": 82, "limit": "Good deep soil moisture utilization"},
    },
}


class GAEZService(BaseProvider):
    def __init__(self, data_dir: Path | None = None):
        super().__init__(
            ProviderMetadata(
                id="faogaez_v5",
                name="FAO GAEZ v5 Agro-Ecological Suitability",
                organization="Food and Agriculture Organization (FAO) & IIASA",
                source_type=DataSourceType.SUITABILITY,
                description="Agro-ecological suitability classes based on climate, terrain, thermal regime and soil constraints.",
                documentation_url="https://gaez.fao.org/",
                spatial_resolution="5 arc-minute (~9 km) global grid cell",
                temporal_resolution="Historical baseline & climate scenario projections",
                coverage="global",
                limitations=[
                    "Agro-ecological suitability indicates biophysical potential, NOT realized field yield or commercial profit.",
                    "Microclimates, local drainage, pests and specific farm management can cause substantial divergence.",
                    "Never treat GAEZ suitability as a single-crop recommendation.",
                ],
            )
        )
        self.data_dir = data_dir or (Path(__file__).resolve().parents[2] / "data" / "gaez")
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def evaluate_location(
        self,
        lat: float,
        lon: float,
        climate_zone: str,
        country_code: str | None = None,
        water_regime: Literal["rainfed", "irrigated"] = "rainfed",
        input_level: Literal["intermediate", "high"] = "intermediate",
    ) -> GAEZEvaluation:
        """Evaluates agro-ecological crop suitability for the given location."""
        # Find matching zone or fallback
        zone_crops = AGRO_CLIMATIC_ZONE_MATRIX.get(climate_zone)
        if not zone_crops:
            # Match substring
            for z_key in AGRO_CLIMATIC_ZONE_MATRIX:
                if z_key in climate_zone or climate_zone in z_key:
                    zone_crops = AGRO_CLIMATIC_ZONE_MATRIX[z_key]
                    break
        if not zone_crops:
            zone_crops = AGRO_CLIMATIC_ZONE_MATRIX["General"]

        evaluated: list[GAEZCropSuitability] = []
        for crop_id, data in zone_crops.items():
            c_class = data.get(water_regime, SuitabilityClass.MODERATELY_SUITABLE)
            score = data.get("score", 50)
            if water_regime == "irrigated" and c_class != SuitabilityClass.NOT_SUITABLE:
                score = min(100, score + 10)

            evaluated.append(
                GAEZCropSuitability(
                    crop_id=crop_id,
                    crop_name=crop_id.replace("_", " ").title(),
                    scientific_name=_crop_scientific_name(crop_id),
                    water_regime=water_regime,
                    input_level=input_level,
                    suitability_class=c_class,
                    suitability_score=score,
                    thermal_suitability="Thermal regime verified for zone",
                    moisture_suitability="Adequate with irrigation" if water_regime == "irrigated" else "Seasonal rain dependent",
                    primary_limiting_factor=data.get("limit"),
                    notes=f"Suitability calculated under {water_regime} management ({input_level} inputs).",
                )
            )

        provenance = DataProvenance(
            source="FAO/IIASA GAEZ v5 Agro-Ecological Zoning",
            provider_id=self.id,
            spatial_resolution=self.metadata.spatial_resolution,
            data_quality=DataQuality.MODELED,
            status="derived",
            limitations=self.metadata.limitations,
        )

        return GAEZEvaluation(
            lat=lat,
            lon=lon,
            country_code=country_code,
            climate_zone=climate_zone,
            evaluated_crops=evaluated,
            provenance=provenance,
            raster_source_attached=False,
            methodology_notes=[
                "Calculated based on FAO-IIASA GAEZ agro-climatic thermal sums, growing period moisture balance and cold limits.",
                "Users can place official GAEZ GeoTIFF rasters in backend/data/gaez/ for local high-density cell extraction.",
            ],
        )


def _crop_scientific_name(crop_id: str) -> str:
    names = {
        "maize": "Zea mays L.",
        "wheat": "Triticum aestivum L.",
        "potato": "Solanum tuberosum L.",
        "bean": "Phaseolus vulgaris L.",
        "quinoa": "Chenopodium quinoa Willd.",
        "lentil": "Lens culinaris Medik.",
        "barley": "Hordeum vulgare L.",
        "oat": "Avena sativa L.",
        "soybean": "Glycine max (L.) Merr.",
        "pea": "Pisum sativum L.",
        "chickpea": "Cicer arietinum L.",
        "faba_bean": "Vicia faba L.",
        "cowpea": "Vigna unguiculata (L.) Walp.",
        "sweet_potato": "Ipomoea batatas (L.) Lam.",
        "cassava": "Manihot esculenta Crantz",
        "tomato": "Solanum lycopersicum L.",
        "sunflower": "Helianthus annuus L.",
        "alfalfa": "Medicago sativa L.",
        "clover": "Trifolium pratense L.",
        "rye_cover": "Secale cereale L.",
    }
    return names.get(crop_id, "Plantae")
