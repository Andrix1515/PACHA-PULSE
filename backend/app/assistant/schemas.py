from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.simulation.rotations import ClimateReference, CompareRequest
from app.assistant.charts import ChartArtifact

View = Literal["overview", "parcel", "monitoring", "planning", "charts", "reports", "help"]


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


class Context(BaseModel):
    model_config = ConfigDict(extra="forbid")
    view: View = "overview"
    role: Literal["grower", "agronomist"] = "grower"
    profile: ProfilePatch = Field(default_factory=ProfilePatch)
    location: PointInput | None = None
    parcel_area_ha: float | None = Field(default=None, gt=0, le=1_000_000, allow_inf_nan=False)
    climate: ClimateReference | None = None
    comparison: CompareRequest | None = None


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
    profile: ProfilePatch | None = None
    location: PointInput | None = None

    @model_validator(mode="after")
    def valid_action(self):
        if self.kind == "navigate" and self.view is None:
            raise ValueError("Navigation proposals need a valid view.")
        if self.kind == "update_profile" and (self.profile is None or not self.profile.model_dump(exclude_none=True)):
            raise ValueError("A profile proposal needs at least one field.")
        if self.kind == "set_location" and self.location is None:
            raise ValueError("A location proposal needs coordinates.")
        return self


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
    tool_steps: list[str] = Field(default_factory=list, max_length=6)
