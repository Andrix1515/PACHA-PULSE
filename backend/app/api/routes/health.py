from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["agroshift-api"] = "agroshift-api"
    version: str = "0.1.0"


@router.get("/health", response_model=HealthResponse, tags=["Estado"])
def health() -> HealthResponse:
    """Check API availability; this does not certify upstream NASA availability."""
    return HealthResponse()
