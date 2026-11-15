"""Deterministic chart artifacts from verified observations or recomputed rotations."""
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.api.routes.observations import cache, climate_demo
from app.data.climate_cache import cache_key
from app.simulation.rotations import ClimateReference, CompareRequest, CompareResponse, compare


class ChartSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    metric: Literal["rainfall", "temperature", "rotation_structure"]
    chart_type: Literal["bar", "line"] = "bar"
    aggregation: Literal["daily", "weekly"] = "daily"

    @model_validator(mode="after")
    def supported_combination(self):
        if self.metric == "rotation_structure" and (self.chart_type != "bar" or self.aggregation != "daily"):
            raise ValueError("Rotation structure uses grouped bars without time aggregation.")
        return self


class ChartBuildRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    spec: ChartSpec
    climate: ClimateReference | None = None
    comparison: CompareRequest | None = None


class ChartRow(BaseModel):
    label: str
    value: float | None
    repeats: float | None = None
    fallow: float | None = None


class ChartSeries(BaseModel):
    key: Literal["value", "repeats", "fallow"]
    label: str
    unit: str


class ChartArtifact(BaseModel):
    id: str
    spec: ChartSpec
    title: str
    description: str
    source: str
    period: str
    retrieved_at: str
    created_at: str
    spatial_resolution: str
    quality: Literal["complete", "partial"]
    status: Literal["derived"] = "derived"
    rows: list[ChartRow]
    series: list[ChartSeries]
    limitations: list[str]


class ChartDataError(ValueError):
    pass


def resolve_observation(reference: ClimateReference | None) -> dict | None:
    if not reference:
        return None
    if reference.saved_example:
        return climate_demo()
    return cache.get(cache_key(reference.lat, reference.lon, reference.start, reference.end))


def rotation_result(request: CompareRequest | None, observation: dict | None, reference: ClimateReference | None) -> CompareResponse | None:
    if not request:
        return None
    rain = observation["summary"]["rainfall_total"] if observation and request.climate == reference else None
    return compare(request, rain)


def build_chart(spec: ChartSpec, observation: dict | None, comparison: CompareResponse | None) -> ChartArtifact:
    base = {"id": str(uuid4()), "spec": spec, "created_at": datetime.now(timezone.utc).isoformat()}
    if spec.metric == "rotation_structure":
        if comparison is None:
            raise ChartDataError("Compare your three rotations first, then ask Pacha for a rotation chart.")
        return ChartArtifact(**base, title="Crop rotation structure", description="Compare the counts in your three planting sequences. Taller bars do not mean a better crop or higher yield.",
            source="User-entered sequences; recomputed by structure-v1", period="Three undated campaigns", retrieved_at="Not applicable - user input",
            spatial_resolution="Not applicable", quality="complete",
            rows=[ChartRow(label=row.name, value=row.distinct_crops.value, repeats=row.consecutive_repetitions.value, fallow=row.fallow_campaigns.value) for row in comparison.results],
            series=[ChartSeries(key="value", label="Distinct crops", unit="count"), ChartSeries(key="repeats", label="Consecutive repeats", unit="count"), ChartSeries(key="fallow", label="Fallow campaigns", unit="count")],
            limitations=["Structural counts do not assess local crop suitability, yield, soil health or profitability.", "Fallow is excluded from distinct crop counts."])
    if not observation or observation.get("status") != "observed":
        raise ChartDataError("Load historical observations in NASA climate first. If a cloud cache expired, reload the period or use the labelled saved example.")
    rain = spec.metric == "rainfall"
    parameter, unit = ("PRECTOTCORR", "mm") if rain else ("T2M", "°C")
    days = observation["data"]
    size = 7 if spec.aggregation == "weekly" else 1
    rows, partial = [], False
    for offset in range(0, len(days), size):
        group = days[offset:offset + size]
        values = [day[parameter] for day in group if day[parameter] is not None]
        complete = len(values) == len(group)
        partial |= not complete
        value = sum(values) if rain and complete else (sum(values) / len(values) if not rain and values else None)
        label = group[0]["date"] if len(group) == 1 else f'{group[0]["date"]} – {group[-1]["date"]}'
        rows.append(ChartRow(label=label, value=round(value, 2) if value is not None else None))
    if not any(row.value is not None for row in rows):
        raise ChartDataError("This period has no usable values for that chart. Missing rainfall groups are never replaced with zero.")
    interval = "7-day" if size == 7 else "Daily"
    title = f'{interval} {"rainfall" if rain else "mean temperature"}'
    limitations = list(observation["limitations"])
    limitations += ["Rainfall totals require complete groups; a missing day leaves that bar unknown." if rain else "Temperature means use available daily averages; missing days make the chart partial."]
    if size == 7:
        limitations.append("Groups start at the selected period's first day, not calendar weeks. The final group can contain fewer than seven days.")
    description = "How much rain was recorded in each group? This is past grid rainfall, not usable irrigation water." if rain else "How warm was each group on average? These are past grid temperatures, not a forecast or field sensor."
    return ChartArtifact(**base, title=title, description=description, source=observation["source"], period=f'{observation["start"]} to {observation["end"]} at {observation["lat"]}, {observation["lon"]}',
        retrieved_at=observation["retrieved_at"], spatial_resolution=observation["spatial_resolution"], quality="partial" if partial else "complete", rows=rows,
        series=[ChartSeries(key="value", label="Rainfall" if rain else "Mean temperature", unit=unit)], limitations=limitations)


def create_chart(request: ChartBuildRequest) -> ChartArtifact:
    observation = resolve_observation(request.climate)
    comparison = rotation_result(request.comparison, observation, request.climate)
    return build_chart(request.spec, observation, comparison)
