import pytest
from pydantic import ValidationError

from app.simulation.rotations import CompareRequest, compare


def payload(percent=100):
    return {"rotations": [{"name": "Habitual", "crops": ["maize"] * 3}, {"name": "Alternativa A", "crops": ["maize", "bean", "maize"]}, {"name": "Alternativa B", "crops": ["maize", "fallow", "wheat"]}], "rainfall_percent": percent}


def rain():
    return {"value": 100.0, "unit": "mm", "status": "derived", "source": "MOCK etiquetado para prueba de fórmula, no dato NASA",
            "observed_at": "2025-01-01/2025-01-31", "retrieved_at": "2026-11-14T00:00:00Z", "spatial_resolution": "MOCK",
            "quality": "complete", "limitations": ["Fixture sintético de prueba"]}


def test_structure_and_missing_inputs():
    result = compare(CompareRequest.model_validate(payload()))
    assert [r.distinct_crops.value for r in result.results] == [1, 2, 2]
    assert [r.consecutive_repetitions.value for r in result.results] == [2, 0, 0]
    assert result.results[2].fallow_campaigns.value == 1
    assert all(r.water_demand is None and r.expected_yield is None and r.profitability is None for r in result.results)
    assert result.scenario_rainfall.value is None


@pytest.mark.parametrize("percent,value", [(100, 100), (70, 70), (0, 0), (150, 150)])
def test_rainfall_scenario_formula_and_invariance(percent, value):
    result = compare(CompareRequest.model_validate(payload(percent)), rain())
    assert result.scenario_rainfall.value == value
    assert result.scenario_rainfall.status == "scenario"
    assert result.baseline_rainfall.value == 100
    assert result.results[0].distinct_crops.value == 1


def test_missing_historical_rain_not_turned_into_zero():
    missing = {**rain(), "value": None, "status": "unavailable"}
    result = compare(CompareRequest.model_validate(payload(70)), missing)
    assert result.scenario_rainfall.value is None


@pytest.mark.parametrize("mutate", [lambda p: p.update(rainfall_percent=151), lambda p: p.update(rotations=[]), lambda p: p["rotations"][0].update(crops=["inventado"] * 3)])
def test_bad_input_rejected(mutate):
    data = payload()
    mutate(data)
    with pytest.raises(ValidationError):
        CompareRequest.model_validate(data)
