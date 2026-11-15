"""Tests for dynamic crop catalog, agronomic requirements, and suitability engine."""

import pytest
from app.crops.catalog import CROPS_CATALOG, get_all_crops, get_crop_by_id
from app.crops.models import BotanicalFamily, CropCategory, NutrientDemandLevel, RootDepthClass
from app.crops.suitability import CropSuitabilityEngine
from app.providers.location import LocationContext, DataProvenance, DataQuality
from app.providers.gaez import GAEZService
from app.providers.faostat import FAOSTATService
from tests.test_api import request


def test_crop_catalog_completeness():
    crops = get_all_crops()
    assert len(crops) >= 15

    # Check legacy crops remain present
    for legacy_id in ["maize", "wheat", "potato", "bean", "lentil", "quinoa", "fallow"]:
        assert legacy_id in CROPS_CATALOG

    # Check new crops
    for new_id in ["barley", "soybean", "faba_bean", "alfalfa", "sunflower"]:
        assert new_id in CROPS_CATALOG

    potato = get_crop_by_id("potato")
    assert potato.botanical_family == BotanicalFamily.SOLANACEAE
    assert potato.category == CropCategory.TUBER
    assert potato.root_depth == RootDepthClass.SHALLOW

    bean = get_crop_by_id("bean")
    assert bean.botanical_family == BotanicalFamily.FABACEAE
    assert bean.is_nitrogen_fixer is True
    assert bean.biological_n_fixation_kg_ha is not None
    assert bean.biological_n_fixation_kg_ha > 30.0


def test_suitability_engine_elevation_and_thermal_filter():
    engine = CropSuitabilityEngine()
    gaez = GAEZService()
    faostat = FAOSTATService()

    provenance = DataProvenance(
        source="Test Provenance",
        provider_id="test",
        spatial_resolution="Point",
        data_quality=DataQuality.MEASURED,
        status="observed",
    )

    # Highland Andes context (3300m, cold 11C)
    highland_loc = LocationContext(
        lat=-12.05,
        lon=-75.20,
        country_code="PE",
        country_name="Peru",
        region="Junín",
        hemisphere="southern",
        elevation_m=3300.0,
        climate_zone="Andean Highland",
        provenance=provenance,
    )

    gaez_eval = gaez.evaluate_location(-12.05, -75.20, "Andean Highland", "PE")
    faostat_prof = faostat.get_country_profile("PE")

    candidates = engine.evaluate_candidates(
        location=highland_loc,
        climate_mean_temp_c=11.2,
        climate_rainfall_mm=650.0,
        water_regime="rainfed",
        gaez=gaez_eval,
        faostat=faostat_prof,
    )

    candidate_ids = {c.crop.id: c for c in candidates}

    # Potato, quinoa, and faba bean should be suitable in Andean Highland
    assert candidate_ids["potato"].suitability_category in ("suitable", "marginal")
    assert candidate_ids["quinoa"].suitability_category == "suitable"
    assert candidate_ids["faba_bean"].suitability_category == "suitable"

    # Cassava is a lowland tropical crop (altitude ceiling 1800m, min temp 16C)
    # At 3300m, 11.2C, cassava MUST be classified as unsuitable
    assert candidate_ids["cassava"].suitability_category == "unsuitable"
    assert any("altitude" in lf.lower() or "temperature" in lf.lower() for lf in candidate_ids["cassava"].limiting_factors)


def test_crop_api_endpoints():
    res = request("GET", "/api/v1/crops")
    assert res.status_code == 200
    all_crops = res.json()
    assert len(all_crops) >= 15

    # Filter by category
    legumes_res = request("GET", "/api/v1/crops?category=legume")
    assert legumes_res.status_code == 200
    for c in legumes_res.json():
        assert c["category"] == "legume"

    # Get single crop
    potato_res = request("GET", "/api/v1/crops/potato")
    assert potato_res.status_code == 200
    assert potato_res.json()["botanical_family"] == "Solanaceae"

    # Compare crops
    compare_res = request("POST", "/api/v1/crops/compare", json={"crop_ids": ["maize", "bean", "potato"]})
    assert compare_res.status_code == 200
    comp_data = compare_res.json()
    assert len(comp_data["compared_crops"]) == 3
    assert len(comp_data["tradeoffs_summary"]) >= 1
