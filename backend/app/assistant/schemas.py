from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.simulation.rotations import ClimateReference, CompareRequest
from app.assistant.charts import ChartArtifact

View = Literal["overview", "parcel", "monitoring", "planning", "charts", "reports", "help", "crops"]


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, max_length=80)
    crop: str | None = Field(default=None, max_length=80)
    areaHa: float | None = Field(default=None, gt=0, le=1_000_000, allow_inf_nan=False)
    soil: Literal["unknown", "sandy", "loamy", "clayey", "other"] | None = None
    water: Literal["unknown", "rainfed", "irrigated", "mixed"] | None = None
    previousRotation: str | None = Field(default=None, max_length=500)


class PointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)


class JourneyContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scene: Literal["welcome", "field", "profile", "evidence", "crops", "climate", "planning", "charts", "summary", "help"]
    step: int = Field(ge=0, le=5)
    detail: str = Field(max_length=40)
    mode: Literal["guided", "explore"] = "guided"


class Context(BaseModel):
    model_config = ConfigDict(extra="forbid")
    view: View = "overview"
    role: Literal["grower", "agronomist"] = "grower"
    profile: ProfilePatch = Field(default_factory=ProfilePatch)
    location: PointInput | None = None
    parcel_area_ha: float | None = Field(default=None, gt=0, le=1_000_000, allow_inf_nan=False)
    climate: ClimateReference | None = None
    comparison: CompareRequest | None = None
    country_code: str | None = None
    country_name: str | None = None
    region: str | None = None
    journey: JourneyContext | None = None


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=2000)
    context: Context = Field(default_factory=Context)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=8)


class Proposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["navigate", "update_profile", "set_location"]
    label: str = Field(min_length=1, max_length=100)
    reason: str = Field(min_length=1, max_length=300)
    view: View | None = None
    scene: Literal["welcome", "field", "profile", "evidence", "crops", "climate", "planning", "charts", "summary", "help"] | None = None
    profile: ProfilePatch | None = None
    location: PointInput | None = None

    @model_validator(mode="after")
    def valid_action(self):
        if self.kind == "navigate" and self.view is None:
            raise ValueError("Navigation proposals need a valid view.")
        if self.kind == "navigate" and self.scene is not None:
            scene_views = {"welcome": "overview", "field": "parcel", "profile": "parcel", "evidence": "parcel", "crops": "crops", "climate": "monitoring", "planning": "planning", "charts": "charts", "summary": "reports", "help": "help"}
            if scene_views[self.scene] != self.view:
                raise ValueError("The scene must belong to the proposed module.")
        if self.kind == "update_profile" and (self.profile is None or not self.profile.model_dump(exclude_none=True)):
            raise ValueError("A profile proposal needs at least one field.")
        if self.kind == "set_location" and self.location is None:
            raise ValueError("A location proposal needs coordinates.")
        return self


# Tool specs for function calling
class CropDetailsSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    crop_id: str = Field(min_length=1, max_length=50)


class CompareCropsSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    crop_ids: list[str] = Field(min_length=2, max_length=4)


class EvaluateRotationSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    crops: list[str] = Field(min_length=3, max_length=6)


class ScenarioSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rainfall_percent: int = Field(default=100, ge=0, le=200)
    temperature_delta_c: float = Field(default=0.0, ge=-5.0, le=10.0)


class ModelReply(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=2000)
    proposals: list[Proposal] = Field(default_factory=list, max_length=3)
    next_question: str | None = Field(default=None, max_length=300)


class ChatResponse(ModelReply):
    provider: Literal["gemini"] = "gemini"
    model: str
    evidence: Literal["verified_climate", "interface_only", "climate_unavailable"]
    charts: list[ChartArtifact] = Field(default_factory=list, max_length=3)
    tool_steps: list[str] = Field(default_factory=list, max_length=8)
