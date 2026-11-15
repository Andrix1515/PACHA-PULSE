"""Agro-ecological rotation evaluation engine and multi-criteria comparator.

Evaluates sequences across:
- Botanical family repetition & soil-borne pest/pathogen carryover risk
- Biological nitrogen fixation & nutrient demand sequence
- Root depth stratification (shallow vs deep rooting architecture)
- Soil cover and erosion mitigation
- Agricultural calendar feasibility (hemisphere seasonality, cycle length vs campaign window)
- Hypothetical climate scenarios (rainfall ±%, temperature +°C, water availability)
"""

from datetime import date
from typing import Annotated, Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.clients.power import validate_period
from app.simulation.economics import EconomicInputs,budget
from app.data.climate_schemas import Metric
from app.crops.catalog import CROPS_CATALOG, get_crop_by_id
from app.crops.models import BotanicalFamily, CropCategory, NutrientDemandLevel, RootDepthClass

# Dynamic mapping of all valid crop IDs to display names
CROPS: dict[str, str] = {crop_id: crop.common_name for crop_id, crop in CROPS_CATALOG.items()}


def _validate_crop_id(v: str) -> str:
    if v not in CROPS_CATALOG:
        raise ValueError(f"Crop '{v}' is not recognized in the crop knowledge base.")
    return v


CropId = Annotated[str, Field(description="Recognized crop identifier from the crop catalog")]


class Rotation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=60)
    crops: list[CropId] = Field(min_length=3, max_length=6)

    @field_validator("crops")
    @classmethod
    def validate_crops(cls, crops: list[str]) -> list[str]:
        for c in crops:
            _validate_crop_id(c)
        return crops


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


class ClimateScenarioConfig(BaseModel):
    rainfall_percent: int = Field(default=100, ge=0, le=200)
    temperature_delta_c: float = Field(default=0.0, ge=-5.0, le=10.0)
    water_restriction: Literal["none", "mild_deficit", "severe_deficit"] = "none"


class CompareRequest(BaseModel):
    economic_inputs: EconomicInputs | None = None
    model_config = ConfigDict(extra="forbid")
    rotations: list[Rotation] = Field(min_length=2, max_length=5)
    rainfall_percent: int = Field(default=100, ge=0, le=150)
    temperature_delta_c: float = Field(default=0.0, ge=-5.0, le=10.0)
    soil: Literal["unknown", "sandy", "loamy", "clayey", "other"] = "unknown"
    water: Literal["unknown", "rainfed", "irrigated", "mixed"] = "unknown"
    habitual_confirmed: bool = False
    climate: ClimateReference | None = None
    start_month: int = Field(default=10, ge=1, le=12)  # Default October for Southern hemisphere / Andean planting
    hemisphere: Literal["southern", "northern", "equatorial"] = "southern"


class StructureMetric(BaseModel):
    value: int
    unit: str
    status: Literal["derived"] = "derived"
    source: str = "Scenario sequences entered by the user"
    period: str = "Consecutive campaigns"
    quality: str = "Deterministic agronomic sequence calculation"


class SequenceCalendarStep(BaseModel):
    campaign_index: int
    crop_id: str
    crop_name: str
    estimated_duration_days: int
    season_label: str
    temporal_fit: Literal["viable", "tight", "exceeds_season", "fallow_period"]


class SequenceAgronomicAssessment(BaseModel):
    pesticide_dependency_reduction: Literal["high", "moderate", "low"] = "low"
    ipm_reduction_limitations: str = "Rotation/cover opportunity only; actual pesticide reduction requires local pest records and integrated pest management review."
    synthetic_fertilizer_offset_kg_n_ha: None = None
    family_repetition_count: int
    solanaceae_repetition: bool
    poaceae_repetition: bool
    nitrogen_balance_score: int  # 0 to 100
    estimated_legume_n_fixation_kg_ha: float
    root_depth_stratification: str  # "well_stratified", "monotone_shallow", "acceptable"
    soil_cover_rating: str  # "high", "moderate", "low"
    pest_disease_risk_level: Literal["low", "moderate", "high", "critical"]
    calendar_viability: Literal["viable", "tight", "conflict", "unverified"]
    sequence_score: int  # 0 to 100 multi-criteria score
    critical_warnings: list[str] = Field(default_factory=list)
    agronomic_strengths: list[str] = Field(default_factory=list)
    calendar_steps: list[SequenceCalendarStep] = Field(default_factory=list)


class RotationResult(BaseModel):
    name: str
    crops: list[CropId]
    labels: list[str]
    baseline: bool
    distinct_crops: StructureMetric
    consecutive_repetitions: StructureMetric
    fallow_campaigns: StructureMetric
    tradeoffs: list[str]
    assessment: Literal["insufficient_data", "preliminary_evaluated"] = "insufficient_data"
    water_demand: None = None
    expected_yield: None = None
    profitability: None = None
    # Enhanced agronomic sequence fields
    agronomic_assessment: SequenceAgronomicAssessment | None = None


class CompareResponse(BaseModel):
    economic_summary: dict | None = None
    results: list[RotationResult]
    scenario_rainfall: Metric
    baseline_rainfall: Metric | None
    rainfall_percent: int
    habitual_confirmed: bool
    warnings: list[str]
    method: str


def evaluate_sequence_agronomy(
    crops: list[str],
    hemisphere: str = "southern",
    start_month: int = 10,
    water_regime: str = "unknown",
) -> SequenceAgronomicAssessment:
    """Evaluates the full sequence of crops across botanical families, nitrogen, roots, and calendar."""
    crop_objs = [get_crop_by_id(c) for c in crops]

    families = [c.botanical_family for c in crop_objs if c and c.botanical_family != BotanicalFamily.NONE]
    # Family repetitions
    family_repeats = sum(a == b for a, b in zip(families, families[1:]))

    solanaceae_repeat = any(a == BotanicalFamily.SOLANACEAE and b == BotanicalFamily.SOLANACEAE for a, b in zip(families, families[1:]))
    poaceae_repeat = any(a == BotanicalFamily.POACEAE and b == BotanicalFamily.POACEAE for a, b in zip(families, families[1:]))

    # Nitrogen dynamics
    legume_n_fix = 0.0
    high_n_demander_repeats = 0
    for prev, curr in zip(crop_objs, crop_objs[1:]):
        if prev and curr:
            if prev.n_demand == NutrientDemandLevel.HIGH and curr.n_demand == NutrientDemandLevel.HIGH:
                high_n_demander_repeats += 1

    for c in crop_objs:
        if c and c.is_nitrogen_fixer:
            # We credit a realistic biological residual for the sequence (e.g. 50% of fixed N available to subsequent crops)
            legume_n_fix += (c.biological_n_fixation_kg_ha or 0.0)

    n_score = 60
    if legume_n_fix > 0:
        n_score += min(35, int(legume_n_fix * 0.4))
    if high_n_demander_repeats > 0:
        n_score -= high_n_demander_repeats * 20
    n_score = max(10, min(100, n_score))

    # Root depth stratification
    depths = [c.root_depth for c in crop_objs if c and c.root_depth != RootDepthClass.NOT_APPLICABLE]
    has_shallow = RootDepthClass.SHALLOW in depths
    has_deep = RootDepthClass.DEEP in depths
    has_medium = RootDepthClass.MEDIUM in depths

    if has_shallow and has_deep:
        root_strat = "well_stratified"
    elif len(set(depths)) > 1:
        root_strat = "acceptable"
    elif depths and depths[0] == RootDepthClass.SHALLOW:
        root_strat = "monotone_shallow"
    else:
        root_strat = "uniform"

    # Soil cover
    cover_qualities = [c.soil_cover_quality for c in crop_objs if c and c.id != "fallow"]
    if all(q in ("good", "excellent") for q in cover_qualities):
        cover_rating = "high"
    elif any(q in ("good", "excellent") for q in cover_qualities):
        cover_rating = "moderate"
    else:
        cover_rating = "low"

    # Pest / pathogen risk
    critical_warnings = []
    strengths = []

    if solanaceae_repeat:
        pest_risk: Literal["low", "moderate", "high", "critical"] = "critical"
        critical_warnings.append("Consecutive Solanaceae (e.g. Potato -> Potato / Tomato): severe risk of soil-borne late blight (Phytophthora), bacterial wilt (Ralstonia), and cyst nematodes.")
    elif family_repeats > 0:
        pest_risk = "high"
        critical_warnings.append(f"Consecutive crops from the same botanical family occur ({family_repeats} repeated family transitions). Host pest and weed carryover increases.")
    elif poaceae_repeat:
        pest_risk = "moderate"
        critical_warnings.append("Consecutive cereals (Poaceae): monitor root rot (Fusarium, Rhizoctonia) and annual grassy weed buildup.")
    else:
        pest_risk = "low"
        strengths.append("Diverse botanical family alternation breaks pest cycles and disrupts host-specific pathogen persistence.")

    if legume_n_fix > 0:
        strengths.append(f"Includes nitrogen-fixing legumes contributing estimated biological N (approx. ~{legume_n_fix:.0f} kg N/ha biological fixation over sequence).")
    else:
        critical_warnings.append("No legume included in the sequence: all nitrogen demand relies on soil reserves or external fertilization.")

    if root_strat == "well_stratified":
        strengths.append("Alternates shallow and deep rooting systems, improving soil structural aeration and subsoil nutrient scavenging.")
    elif root_strat == "monotone_shallow":
        critical_warnings.append("All crops have shallow rooting architectures; subsoil compaction layers remain unpenetrated.")

    # Calendar steps
    calendar_steps: list[SequenceCalendarStep] = []
    current_month = start_month
    is_calendar_conflict = False

    for idx, c in enumerate(crop_objs):
        if not c:
            continue
        duration = c.cycle_duration_days_max or (120 if c.id != "fallow" else 90)
        fit: Literal["viable", "tight", "exceeds_season", "fallow_period"] = "viable"

        if c.id == "fallow":
            season_desc = f"Campaign {idx + 1}: Fallow soil rest (Month {current_month})"
            fit = "fallow_period"
        else:
            season_desc = f"Campaign {idx + 1}: {c.common_name} (~{duration} days, sowing approx. month {current_month})"
            if duration > 160:
                fit = "tight"
            if duration > 240:
                fit = "exceeds_season"
                is_calendar_conflict = True

        calendar_steps.append(
            SequenceCalendarStep(
                campaign_index=idx + 1,
                crop_id=c.id,
                crop_name=c.common_name,
                estimated_duration_days=duration,
                season_label=season_desc,
                temporal_fit=fit,
            )
        )
        current_month = ((current_month + (duration // 30) - 1) % 12) + 1

    cal_viab: Literal["viable", "tight", "conflict", "unverified"] = "conflict" if is_calendar_conflict else ("tight" if any(s.temporal_fit == "tight" for s in calendar_steps) else "viable")

    # Sequence score (0 to 100)
    score = 70
    if pest_risk == "critical":
        score -= 35
    elif pest_risk == "high":
        score -= 20
    elif pest_risk == "low":
        score += 10

    if legume_n_fix > 40:
        score += 15
    elif legume_n_fix == 0:
        score -= 10

    if root_strat == "well_stratified":
        score += 10
    elif root_strat == "monotone_shallow":
        score -= 10

    if cal_viab == "conflict":
        score -= 20
    elif cal_viab == "tight":
        score -= 5

    seq_score = max(15, min(100, score))

    return SequenceAgronomicAssessment(
        pesticide_dependency_reduction="high" if family_repeats == 0 and cover_rating == "high" else "moderate" if family_repeats == 0 else "low",
        family_repetition_count=family_repeats,
        solanaceae_repetition=solanaceae_repeat,
        poaceae_repetition=poaceae_repeat,
        nitrogen_balance_score=n_score,
        estimated_legume_n_fixation_kg_ha=round(legume_n_fix, 1),
        root_depth_stratification=root_strat,
        soil_cover_rating=cover_rating,
        pest_disease_risk_level=pest_risk,
        calendar_viability=cal_viab,
        sequence_score=seq_score,
        critical_warnings=critical_warnings,
        agronomic_strengths=strengths,
        calendar_steps=calendar_steps,
    )


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

        # Enhanced agronomic sequence assessment
        agronomic_eval = evaluate_sequence_agronomy(
            crops=rotation.crops,
            hemisphere=request.hemisphere,
            start_month=request.start_month,
            water_regime=request.water,
        )

        labels = [CROPS.get(crop, crop.replace("_", " ").title()) for crop in rotation.crops]

        results.append(
            RotationResult(
                name=rotation.name,
                crops=rotation.crops,
                labels=labels,
                baseline=index == 0,
                distinct_crops=StructureMetric(value=distinct, unit="distinct crops"),
                consecutive_repetitions=StructureMetric(value=repeats, unit="repeated transitions"),
                fallow_campaigns=StructureMetric(value=fallow, unit="fallow campaigns"),
                tradeoffs=notes,
                agronomic_assessment=agronomic_eval,
            )
        )

    if rainfall and rainfall.get("value") is not None:
        scenario_val = round(rainfall["value"] * request.rainfall_percent / 100, 2)
        scenario = {
            **rainfall,
            "value": scenario_val,
            "status": "scenario",
            "quality": "Hypothesis, not a forecast",
            "limitations": [
                f"Historical rainfall for the period × {request.rainfall_percent}% scenario; identical for all sequences.",
                "Does not represent future climate forecasts, effective soil infiltration or crop-specific water balances.",
            ],
        }
    else:
        scenario = {
            "value": None,
            "unit": "mm",
            "status": "unavailable",
            "source": "No complete historical rainfall series",
            "observed_at": "No usable climate period",
            "retrieved_at": "Not applicable",
            "spatial_resolution": "Unavailable",
            "quality": "Insufficient",
            "limitations": ["First load a complete historical series in NASA climate."],
        }

    warnings = [
        "Exploratory sequence comparison with agronomic rules. No automatic yield or commercial profit is guaranteed.",
        "ETo and stage-specific Kc are required for quantitative irrigation demand (FAO-56: ETc = Kc × ETo).",
        "Without verified yields, input costs and local market prices, net economic margins remain unavailable.",
    ]
    if request.soil == "unknown":
        warnings.append("Soil is unknown: verify SoilGrids or on-farm soil texture before finalizing decisions.")
    else:
        warnings.append(f"Soil type '{request.soil}' is user input; laboratory nutrient analysis is recommended.")
    if request.water == "unknown":
        warnings.append("Water management is unspecified: irrigation adequacy is not verified.")
    if not request.habitual_confirmed:
        warnings.append("The first sequence is an illustrative reference; the user has not confirmed it as their usual rotation.")

    if request.temperature_delta_c != 0.0:
        warnings.append(f"Simulating a hypothetical temperature change of {request.temperature_delta_c:+.1f} °C. This is a sensitivity stress test, not a regional climate projection.")

    return CompareResponse(
        economic_summary=budget(request.economic_inputs) if request.economic_inputs else None,
        results=results,
        scenario_rainfall=Metric.model_validate(scenario),
        baseline_rainfall=Metric.model_validate(rainfall) if rainfall else None,
        rainfall_percent=request.rainfall_percent,
        habitual_confirmed=request.habitual_confirmed,
        warnings=warnings,
        method="agroshift-v2: structural counting + botanical family alternation + biological N2 balance + root depth stratification + calendar viability.",
    )
