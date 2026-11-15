"""API endpoints for Crop Intelligence and dynamic suitability candidate generation."""

from typing import Literal
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.crops.models import CandidateCrop, Crop
from app.crops.catalog import CROPS_CATALOG, get_all_crops, get_crop_by_id
from app.crops.suitability import suitability_engine
from app.providers.location import LocationService
from app.providers.soilgrids import SoilGridsService
from app.providers.gaez import GAEZService
from app.providers.faostat import FAOSTATService
from app.api.routes.observations import cache as climate_cache, cache_key

router = APIRouter(prefix="/crops", tags=["Crop Intelligence"])
location_service = LocationService()
soil_service = SoilGridsService()
gaez_service = GAEZService()
faostat_service = FAOSTATService()


class CropComparisonRequest(BaseModel):
    crop_ids: list[str] = Field(min_length=2, max_length=5)


class CropComparisonItem(BaseModel):
    crop: Crop
    advantages: list[str]
    disadvantages: list[str]
    best_predecessors: list[str]
    rotational_warnings: list[str]


class CropComparisonResponse(BaseModel):
    compared_crops: list[CropComparisonItem]
    tradeoffs_summary: list[str]


@router.get("", response_model=list[Crop])
def list_crops(
    category: str | None = Query(default=None),
    family: str | None = Query(default=None),
    search: str | None = Query(default=None),
):
    """Lists all crops from the knowledge base with optional filtering."""
    crops = get_all_crops()
    if category:
        crops = [c for c in crops if c.category.value == category]
    if family:
        crops = [c for c in crops if c.botanical_family.value.lower() == family.lower()]
    if search:
        s = search.lower()
        crops = [
            c for c in crops
            if s in c.common_name.lower() or s in c.spanish_name.lower() or s in c.scientific_name.lower() or s in c.id.lower()
        ]
    return crops


@router.get("/candidates", response_model=list[CandidateCrop])
async def get_candidate_crops(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
    water: Literal["unknown", "rainfed", "irrigated", "mixed"] = Query(default="unknown"),
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
):
    """Dynamically generates candidate crops tailored to coordinates, climate, soil and elevation."""
    location = await location_service.identify_location(lat, lon)
    soil = await soil_service.get_soil_profile(lat, lon)

    # Check cached climate observations if available
    temp_mean = None
    rain_total = None
    if start and end:
        key = cache_key(lat, lon, start, end)
        obs = climate_cache.get(key)
        if obs and "summary" in obs:
            temp_mean = obs["summary"]["temperature_mean"].get("value")
            rain_total = obs["summary"]["rainfall_total"].get("value")

    # Evaluate GAEZ & FAOSTAT
    water_regime_lit: Literal["rainfed", "irrigated"] = "irrigated" if water in ("irrigated", "mixed") else "rainfed"
    gaez_eval = gaez_service.evaluate_location(
        lat=lat,
        lon=lon,
        climate_zone=location.climate_zone,
        country_code=location.country_code,
        water_regime=water_regime_lit,
    )
    faostat_profile = faostat_service.get_country_profile(location.country_code, location.country_name)

    return suitability_engine.evaluate_candidates(
        location=location,
        climate_mean_temp_c=temp_mean,
        climate_rainfall_mm=rain_total,
        soil=soil,
        water_regime=water,
        gaez=gaez_eval,
        faostat=faostat_profile,
    )


@router.get("/{crop_id}", response_model=Crop)
def get_crop(crop_id: str):
    """Retrieves agronomic profile and requirements for a single crop."""
    crop = get_crop_by_id(crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail=f"Crop '{crop_id}' was not found in the catalog.")
    return crop


@router.post("/compare", response_model=CropComparisonResponse)
def compare_crops(payload: CropComparisonRequest):
    """Provides side-by-side comparative analysis of selected crops."""
    items: list[CropComparisonItem] = []
    for c_id in payload.crop_ids:
        crop = get_crop_by_id(c_id)
        if not crop:
            raise HTTPException(status_code=404, detail=f"Crop '{c_id}' not found.")
        adv = []
        disadv = []
        if crop.is_nitrogen_fixer:
            adv.append(f"Biological nitrogen fixation (~{crop.biological_n_fixation_kg_ha:.0f} kg N/ha).")
        if crop.root_depth.value == "deep":
            adv.append("Deep taproot structure breaks hardpans and explores subsoil moisture.")
        if crop.n_demand.value == "high":
            disadv.append("High nitrogen demand: depletes soil nitrogen if planted after another heavy feeder.")
        if crop.requirements.frost_tolerance == "sensitive":
            disadv.append("Sensitive to frost events.")

        items.append(
            CropComparisonItem(
                crop=crop,
                advantages=adv,
                disadvantages=disadv,
                best_predecessors=crop.rotation_good_predecessors,
                rotational_warnings=crop.rotation_bad_predecessors,
            )
        )

    tradeoffs = [
        "Alternating different botanical families prevents specific pathogen accumulation.",
        "Pairing high nutrient-demanding crops with nitrogen-fixing legumes maintains soil fertility balance.",
    ]
    return CropComparisonResponse(compared_crops=items, tradeoffs_summary=tradeoffs)
