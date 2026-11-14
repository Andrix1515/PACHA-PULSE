from fastapi import APIRouter

from app.api.routes.observations import climate, climate_demo
from app.simulation.rotations import CROPS, CompareRequest, CompareResponse, compare

router = APIRouter(tags=["Rotaciones"])


@router.get("/crops")
def crops():
    return {"crops": [{"id": key, "name": name} for key, name in CROPS.items()],
            "source": "Catálogo demostrativo de nombres comunes; sin coeficientes ni aptitud regional",
            "limitations": ["Disponibilidad y adecuación deben verificarse localmente; no es un catálogo agronómico completo."]}


@router.post("/rotations/compare", response_model=CompareResponse)
async def compare_rotations(request: CompareRequest):
    rainfall = None
    climate_error = False
    if request.climate:
        reference = request.climate
        result = climate_demo() if reference.saved_example else await climate(reference.lat, reference.lon, reference.start, reference.end)
        if isinstance(result, dict):
            rainfall = result["summary"]["rainfall_total"]
        else:
            climate_error = True
    result = compare(request, rainfall)
    if climate_error:
        result.warnings.append("La fuente climática no respondió. Se conserva únicamente la comparación estructural, sin lluvia de escenario.")
    return result
