from typing import Literal

from pydantic import BaseModel


class Metric(BaseModel):
    value: float | None
    unit: str
    status: Literal["derived", "scenario", "unavailable"]
    source: str
    observed_at: str
    retrieved_at: str
    spatial_resolution: str
    quality: str
    limitations: list[str]


class ClimateDay(BaseModel):
    date: str
    T2M: float | None
    T2M_MIN: float | None
    T2M_MAX: float | None
    PRECTOTCORR: float | None


class Variable(BaseModel):
    unit: str
    source: str
    status: Literal["observed"]
    missing_value: None = None


class Summary(BaseModel):
    temperature_mean: Metric
    rainfall_total: Metric


class ClimateResponse(BaseModel):
    lat: float
    lon: float
    start: str
    end: str
    source: str
    request_url: str
    product_version: str
    retrieved_at: str
    spatial_resolution: str
    limitations: list[str]
    status: Literal["observed", "unavailable"]
    quality: str
    variables: dict[str, Variable]
    data: list[ClimateDay]
    summary: Summary
    delivery: Literal["live", "cache", "saved_observation"]
