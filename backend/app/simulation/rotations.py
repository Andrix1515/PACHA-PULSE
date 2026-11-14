"""Structural sequence comparisons without yield or suitability predictions."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.clients.power import validate_period
from app.data.climate_schemas import Metric

CROPS = {
    "maize": "Maize", "wheat": "Wheat", "potato": "Potato", "bean": "Bean",
    "lentil": "Lentil", "quinoa": "Quinoa", "fallow": "Fallow / rest",
}
CropId = Literal["maize", "wheat", "potato", "bean", "lentil", "quinoa", "fallow"]


class Rotation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=60)
    crops: list[CropId] = Field(min_length=3, max_length=3)


class ClimateReference(BaseModel):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    start: date
    end: date
    saved_example: bool = False

    @model_validator(mode="after")
    def valid(self):
        validate_period(self.start, self.end)
        if self.saved_example and (self.lat != -12.05 or self.lon != -75.2 or self.start != date(2025, 1, 1) or self.end != date(2025, 1, 31)):
            raise ValueError("The saved example only covers Mantaro in January 2025.")
        return self


class CompareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rotations: list[Rotation] = Field(min_length=3, max_length=3)
    rainfall_percent: int = Field(default=100, ge=0, le=150)
    soil: Literal["unknown", "sandy", "loamy", "clayey", "other"] = "unknown"
    water: Literal["unknown", "rainfed", "irrigated", "mixed"] = "unknown"
    habitual_confirmed: bool = False
    climate: ClimateReference | None = None


class StructureMetric(BaseModel):
    value: int
    unit: str
    status: Literal["derived"] = "derived"
    source: str = "Scenario sequences entered by the user"
    period: str = "Three consecutive campaigns with no assigned dates"
    quality: str = "Deterministic structural calculation, not a suitability assessment"


class RotationResult(BaseModel):
    name: str
    crops: list[CropId]
    labels: list[str]
    baseline: bool
    distinct_crops: StructureMetric
    consecutive_repetitions: StructureMetric
    fallow_campaigns: StructureMetric
    tradeoffs: list[str]
    assessment: Literal["insufficient_data"] = "insufficient_data"
    water_demand: None = None
    expected_yield: None = None
    profitability: None = None


class CompareResponse(BaseModel):
    results: list[RotationResult]
    scenario_rainfall: Metric
    baseline_rainfall: Metric | None
    rainfall_percent: int
    habitual_confirmed: bool
    warnings: list[str]
    method: str


def compare(request: CompareRequest, rainfall: dict | None = None) -> CompareResponse:
    results = []
    for index, rotation in enumerate(request.rotations):
        non_fallow = [crop for crop in rotation.crops if crop != "fallow"]
        distinct = len(set(non_fallow))
        repeats = sum(a == b and a != "fallow" for a, b in zip(rotation.crops, rotation.crops[1:]))
        fallow = rotation.crops.count("fallow")
        notes = []
        if distinct > 1:
            notes.append("Several crops are included. Check the calendar, equipment, experience and markets needed for each.")
        else:
            notes.append("Fewer crop types in this sequence. Simpler management does not prove sustainability or profitability.")
        if repeats:
            notes.append("The same crop repeats in consecutive campaigns. Review agronomic risks with an adviser; no pest probability is estimated.")
        if fallow:
            notes.append("Fallow does not mean ground cover. Review soil, weeds and periods without a harvest.")
        notes.append("Local crop, soil, climate and management compatibility is not assessed. More diversity does not mean higher yield.")
        results.append(RotationResult(name=rotation.name, crops=rotation.crops, labels=[CROPS[crop] for crop in rotation.crops], baseline=index == 0,
                                      distinct_crops=StructureMetric(value=distinct, unit="distinct crops"),
                                      consecutive_repetitions=StructureMetric(value=repeats, unit="repeated transitions"),
                                      fallow_campaigns=StructureMetric(value=fallow, unit="fallow campaigns"), tradeoffs=notes))
    if rainfall and rainfall["value"] is not None:
        scenario = {**rainfall, "value": round(rainfall["value"] * request.rainfall_percent / 100, 2), "status": "scenario",
                    "quality": "Hypothesis, not a forecast", "limitations": [
                        "Historical rainfall for the period × scenario percentage; identical for all three sequences.",
                        "Does not represent future campaigns, effective rainfall, irrigation water or crop water balance."]}
    else:
        scenario = {"value": None, "unit": "mm", "status": "unavailable", "source": "No complete historical rainfall series",
                    "observed_at": "No usable climate period", "retrieved_at": "Not applicable", "spatial_resolution": "Unavailable",
                    "quality": "Insufficient", "limitations": ["First load a complete historical series in NASA climate."]}
    warnings = [
        "Exploratory structural comparison. No best rotation or probability of success is calculated.",
        "ETo and stage-specific Kc are missing: crop water demand and balance are unavailable (FAO-56: ETc = Kc × ETo).",
        "Without verified yields, costs and prices, production and profitability are unavailable.",
        "Campaigns have no dates or duration; seasons are not assigned by hemisphere.",
    ]
    if request.soil == "unknown":
        warnings.append("Soil is unknown: soil compatibility cannot be assessed.")
    else:
        warnings.append("Soil type is user input; properties, management and local crop validation are still missing.")
    if request.water == "unknown":
        warnings.append("Water availability is unspecified: irrigation sufficiency is not estimated.")
    if not request.habitual_confirmed:
        warnings.append("The first sequence is an illustrative reference; the user has not confirmed it as their usual rotation.")
    return CompareResponse(results=results, scenario_rainfall=Metric.model_validate(scenario),
                           baseline_rainfall=Metric.model_validate(rainfall) if rainfall else None,
                           rainfall_percent=request.rainfall_percent, habitual_confirmed=request.habitual_confirmed,
                           warnings=warnings, method="structure-v1: count of distinct non-fallow crops, adjacent repetitions and fallow campaigns. No ranking or weights.")
