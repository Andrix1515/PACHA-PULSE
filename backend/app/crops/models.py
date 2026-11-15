"""Data models for the Pacha-Pulse dynamic crop knowledge base."""

from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field


class CropCategory(str, Enum):
    CEREAL = "cereal"
    LEGUME = "legume"
    TUBER = "tuber"
    VEGETABLE = "vegetable"
    OILSEED = "oilseed"
    FORAGE = "forage"
    COVER_CROP = "cover_crop"
    PSEUDO_CEREAL = "pseudo_cereal"
    FALLOW = "fallow"


class BotanicalFamily(str, Enum):
    POACEAE = "Poaceae"              # Cereals (Maize, Wheat, Barley, Oat, Rye, Sorghum)
    FABACEAE = "Fabaceae"            # Legumes (Bean, Pea, Lentil, Faba Bean, Soybean, Alfalfa, Clover, Cowpea)
    SOLANACEAE = "Solanaceae"        # Nightshades (Potato, Tomato, Pepper, Eggplant)
    AMARANTHACEAE = "Amaranthaceae"  # Quinoa, Beet, Spinach
    ASTERACEAE = "Asteraceae"        # Sunflower, Lettuce
    BRASSICACEAE = "Brassicaceae"    # Mustard, Cabbage, Radish
    APIACEAE = "Apiaceae"            # Carrot, Celery
    AMARYLLIDACEAE = "Amaryllidaceae"# Onion, Garlic
    CONVOLVULACEAE = "Convolvulaceae"# Sweet Potato
    EUPHORBIACEAE = "Euphorbiaceae"  # Cassava
    NONE = "None"                    # Fallow


class RootDepthClass(str, Enum):
    SHALLOW = "shallow"  # < 50 cm
    MEDIUM = "medium"    # 50 - 100 cm
    DEEP = "deep"        # > 100 cm
    NOT_APPLICABLE = "not_applicable"


class NutrientDemandLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    RESTORATIVE = "restorative"  # e.g. legumes fixing N
    NONE = "none"


class AgronomicRequirements(BaseModel):
    temp_min_c: float | None = None
    temp_opt_min_c: float | None = None
    temp_opt_max_c: float | None = None
    temp_max_c: float | None = None
    frost_tolerance: Literal["tolerant", "moderate", "sensitive", "unknown"] = "unknown"
    water_demand_mm_min: float | None = None
    water_demand_mm_max: float | None = None
    ph_min: float | None = None
    ph_opt_min: float | None = None
    ph_opt_max: float | None = None
    ph_max: float | None = None
    tolerated_textures: list[str] = Field(default_factory=list)  # e.g. ["loam", "sandy_loam", "clay_loam"]
    salinity_tolerance: Literal["sensitive", "moderately_tolerant", "tolerant", "unknown"] = "unknown"
    altitude_min_m: float | None = None
    altitude_max_m: float | None = None


class Crop(BaseModel):
    id: str
    common_name: str
    scientific_name: str
    spanish_name: str
    alternative_names: list[str] = Field(default_factory=list)
    botanical_family: BotanicalFamily
    category: CropCategory
    requirements: AgronomicRequirements
    root_depth: RootDepthClass
    cycle_duration_days_min: int | None = None
    cycle_duration_days_max: int | None = None
    n_demand: NutrientDemandLevel
    p_demand: NutrientDemandLevel
    k_demand: NutrientDemandLevel
    is_nitrogen_fixer: bool = False
    biological_n_fixation_kg_ha: float | None = None  # Estimated typical N fixed per season
    soil_cover_quality: Literal["poor", "moderate", "good", "excellent"] = "moderate"
    pest_susceptibilities: list[str] = Field(default_factory=list)
    rotation_good_predecessors: list[str] = Field(default_factory=list)
    rotation_bad_predecessors: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class CandidateEvidence(BaseModel):
    factor: str  # "temperature", "water", "soil_ph", "soil_texture", "elevation", "gaez_suitability", "faostat_national"
    status: Literal["compatible", "marginal", "incompatible", "unknown", "not_applicable"]
    crop_requirement: str
    field_condition: str
    details: str


class CandidateCrop(BaseModel):
    crop: Crop
    suitability_category: Literal["suitable", "marginal", "unsuitable", "insufficient_data"]
    overall_score: int  # 0 to 100
    confidence_level: Literal["high", "medium", "low", "exploratory"]
    limiting_factors: list[str] = Field(default_factory=list)
    advantages: list[str] = Field(default_factory=list)
    evidence: list[CandidateEvidence] = Field(default_factory=list)
    data_gaps: list[str] = Field(default_factory=list)
