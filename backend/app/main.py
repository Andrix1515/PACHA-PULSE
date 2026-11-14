from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.api.routes.health import router as health_router
from app.api.routes.observations import router as observations_router
from app.api.routes.rotations import router as rotations_router

app = FastAPI(
    title="AgroShift API",
    version="0.1.0",
    description="Demo local: clima NASA POWER y comparación estructural de rotaciones, sin predicción de rendimiento.",
)
app.include_router(health_router, prefix="/api/v1")
app.include_router(observations_router, prefix="/api/v1")
app.include_router(rotations_router, prefix="/api/v1")


@app.exception_handler(HTTPException)
async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"http_{exc.status_code}", "message": "Recurso o método no disponible."}},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, _exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "validation_error", "message": "Revisa los parámetros de la solicitud."}},
    )


@app.exception_handler(Exception)
async def unexpected_error(_request: Request, _exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "Ocurrió un error interno."}},
    )
