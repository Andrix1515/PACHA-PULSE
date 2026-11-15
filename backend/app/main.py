from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

from app.api.routes.health import router as health_router
from app.api.routes.observations import router as observations_router
from app.api.routes.rotations import router as rotations_router
from app.api.routes.assistant import router as assistant_router
from app.api.routes.places import router as places_router

app = FastAPI(
    title="Pacha Pulse API",
    version="0.1.0",
    description="NASA POWER weather and structural crop rotation comparisons, without yield predictions.",
)
app.include_router(health_router, prefix="/api/v1")
app.include_router(observations_router, prefix="/api/v1")
app.include_router(rotations_router, prefix="/api/v1")
app.include_router(assistant_router, prefix="/api/v1")
app.include_router(places_router, prefix="/api/v1")


@app.exception_handler(HTTPException)
async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"http_{exc.status_code}", "message": "Resource or method unavailable."}},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, _exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "validation_error", "message": "Please check the request parameters."}},
    )


@app.exception_handler(Exception)
async def unexpected_error(_request: Request, _exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "An internal error occurred."}},
    )
