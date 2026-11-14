from fastapi import APIRouter

from app.api.routes.observations import climate, climate_demo
from app.simulation.rotations import CROPS, CompareRequest, CompareResponse, compare

router = APIRouter(tags=["Rotations"])


@router.get("/crops")
def crops():
    return {"crops": [{"id": key, "name": name} for key, name in CROPS.items()],
            "source": "Demonstration catalogue of common crop names; no coefficients or regional suitability",
            "limitations": ["Availability and suitability need local verification; this is not a complete agronomic catalogue."]}


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
        result.warnings.append("The climate provider did not respond. Only the structural comparison is available, without scenario rainfall.")
    return result
