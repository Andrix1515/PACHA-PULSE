"""Crops package initialization."""

from app.crops.models import (
    Crop,
    CropCategory,
    BotanicalFamily,
    RootDepthClass,
    NutrientDemandLevel,
    AgronomicRequirements,
    CandidateCrop,
    CandidateEvidence,
)
from app.crops.catalog import CROPS_CATALOG, get_all_crops, get_crop_by_id
from app.crops.suitability import CropSuitabilityEngine, suitability_engine

__all__ = [
    "Crop",
    "CropCategory",
    "BotanicalFamily",
    "RootDepthClass",
    "NutrientDemandLevel",
    "AgronomicRequirements",
    "CandidateCrop",
    "CandidateEvidence",
    "CROPS_CATALOG",
    "get_all_crops",
    "get_crop_by_id",
    "CropSuitabilityEngine",
    "suitability_engine",
]
