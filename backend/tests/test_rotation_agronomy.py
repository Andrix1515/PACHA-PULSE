"""Tests for multi-criteria rotation evaluation, botanical repetition, and scenarios."""

import pytest
from app.simulation.rotations import CompareRequest, compare, evaluate_sequence_agronomy
from tests.test_api import request


def test_solanaceae_repetition_triggers_critical_pest_warning():
    # Potato followed by Potato
    monoculture_eval = evaluate_sequence_agronomy(["potato", "potato", "potato"])
    assert monoculture_eval.solanaceae_repetition is True
    assert monoculture_eval.pest_disease_risk_level == "critical"
    assert any("solanaceae" in w.lower() for w in monoculture_eval.critical_warnings)
    assert monoculture_eval.sequence_score < 50


def test_diverse_rotation_with_legumes_scores_high():
    # Potato -> Faba bean (legume) -> Quinoa
    diverse_eval = evaluate_sequence_agronomy(["potato", "faba_bean", "quinoa"])
    assert diverse_eval.solanaceae_repetition is False
    assert diverse_eval.family_repetition_count == 0
    assert diverse_eval.pest_disease_risk_level == "low"
    assert diverse_eval.estimated_legume_n_fixation_kg_ha > 50.0
    assert diverse_eval.root_depth_stratification in ("well_stratified", "acceptable")
    assert diverse_eval.sequence_score >= 80


def test_temperature_and_rainfall_scenarios():
    payload = {
        "rotations": [
            {"name": "Habitual", "crops": ["potato", "potato", "barley"]},
            {"name": "Alternative A", "crops": ["potato", "faba_bean", "quinoa"]},
            {"name": "Alternative B", "crops": ["maize", "bean", "wheat"]},
        ],
        "rainfall_percent": 85,
        "temperature_delta_c": 1.5,
    }
    rain_fixture = {
        "value": 120.0,
        "unit": "mm",
        "status": "derived",
        "source": "NASA POWER",
        "observed_at": "2025-01-01/2025-01-31",
        "retrieved_at": "2026-11-14T00:00:00Z",
        "spatial_resolution": "MERRA-2 0.5 deg",
        "quality": "complete",
        "limitations": [],
    }

    req = CompareRequest.model_validate(payload)
    res = compare(req, rain_fixture)

    assert res.scenario_rainfall.value == round(120.0 * 0.85, 2)
    assert any("temperature" in w.lower() for w in res.warnings)
    assert len(res.results) == 3
    # Check that agronomic assessment is attached
    assert res.results[1].agronomic_assessment is not None
    assert res.results[1].agronomic_assessment.pest_disease_risk_level == "low"
