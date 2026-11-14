"""Comparación estructural de secuencias, sin modelo de rendimiento ni aptitud."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.clients.power import validate_period
from app.data.climate_schemas import Metric

CROPS = {
    "maize": "Maíz", "wheat": "Trigo", "potato": "Papa", "bean": "Frijol",
    "lentil": "Lenteja", "quinoa": "Quinua", "fallow": "Descanso / barbecho",
}
CropId = Literal["maize", "wheat", "potato", "bean", "lentil", "quinoa", "fallow"]


class Rotation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=60)
    crops: list[CropId] = Field(min_length=3, max_length=3)


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
            raise ValueError("El ejemplo guardado solo corresponde a Mantaro, enero de 2025.")
        return self


class CompareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rotations: list[Rotation] = Field(min_length=3, max_length=3)
    rainfall_percent: int = Field(default=100, ge=0, le=150)
    soil: Literal["unknown", "sandy", "loamy", "clayey", "other"] = "unknown"
    water: Literal["unknown", "rainfed", "irrigated", "mixed"] = "unknown"
    habitual_confirmed: bool = False
    climate: ClimateReference | None = None


class StructureMetric(BaseModel):
    value: int
    unit: str
    status: Literal["derived"] = "derived"
    source: str = "Secuencias de escenario ingresadas por el usuario"
    period: str = "Tres campañas consecutivas, sin fechas asignadas"
    quality: str = "Cálculo determinista de estructura, sin validación de idoneidad"


class RotationResult(BaseModel):
    name: str
    crops: list[CropId]
    labels: list[str]
    baseline: bool
    distinct_crops: StructureMetric
    consecutive_repetitions: StructureMetric
    fallow_campaigns: StructureMetric
    tradeoffs: list[str]
    assessment: Literal["insufficient_data"] = "insufficient_data"
    water_demand: None = None
    expected_yield: None = None
    profitability: None = None


class CompareResponse(BaseModel):
    results: list[RotationResult]
    scenario_rainfall: Metric
    baseline_rainfall: Metric | None
    rainfall_percent: int
    habitual_confirmed: bool
    warnings: list[str]
    method: str


def compare(request: CompareRequest, rainfall: dict | None = None) -> CompareResponse:
    results = []
    for index, rotation in enumerate(request.rotations):
        non_fallow = [crop for crop in rotation.crops if crop != "fallow"]
        distinct = len(set(non_fallow))
        repeats = sum(a == b and a != "fallow" for a, b in zip(rotation.crops, rotation.crops[1:]))
        fallow = rotation.crops.count("fallow")
        notes = []
        if distinct > 1:
            notes.append("Incluye varios cultivos: requiere revisar calendarios, maquinaria, experiencia y mercados para cada uno.")
        else:
            notes.append("Menor variedad de cultivos en la secuencia; la simplicidad de manejo no demuestra sostenibilidad ni rentabilidad.")
        if repeats:
            notes.append("Hay repetición consecutiva del mismo cultivo. Revisar riesgos agronómicos con un asesor; no se estima probabilidad de plagas.")
        if fallow:
            notes.append("El descanso no equivale a cobertura vegetal: verificar manejo de suelo, malezas y periodos sin cosecha.")
        notes.append("La compatibilidad local cultivo–suelo–clima–manejo está sin evaluar. Más diversidad no significa mayor rendimiento.")
        results.append(RotationResult(name=rotation.name, crops=rotation.crops, labels=[CROPS[crop] for crop in rotation.crops], baseline=index == 0,
                                      distinct_crops=StructureMetric(value=distinct, unit="cultivos distintos"),
                                      consecutive_repetitions=StructureMetric(value=repeats, unit="transiciones repetidas"),
                                      fallow_campaigns=StructureMetric(value=fallow, unit="campañas de descanso"), tradeoffs=notes))
    if rainfall and rainfall["value"] is not None:
        scenario = {**rainfall, "value": round(rainfall["value"] * request.rainfall_percent / 100, 2), "status": "scenario",
                    "quality": "Hipótesis, no pronóstico", "limitations": [
                        "Lluvia histórica del periodo × porcentaje de escenario; igual para las tres secuencias.",
                        "No representa campañas futuras, precipitación efectiva, agua de riego ni balance hídrico de cultivos."]}
    else:
        scenario = {"value": None, "unit": "mm", "status": "unavailable", "source": "Sin lluvia histórica completa",
                    "observed_at": "Sin periodo climático utilizable", "retrieved_at": "No aplica", "spatial_resolution": "No disponible",
                    "quality": "Insuficiente", "limitations": ["Consulta primero una serie climática completa en Monitorear."]}
    warnings = [
        "Comparación exploratoria de estructura. No se calcula una mejor rotación ni una probabilidad de éxito.",
        "Faltan ETo y Kc por etapa: demanda hídrica y balance de agua no disponibles (FAO-56: ETc = Kc × ETo).",
        "Sin rendimientos, costos y precios verificados: producción y rentabilidad no disponibles.",
        "Las campañas no tienen fechas ni duración; no se asignan estaciones según hemisferio.",
    ]
    if request.soil == "unknown":
        warnings.append("Suelo desconocido: no es posible evaluar compatibilidad edáfica.")
    else:
        warnings.append("El tipo de suelo es un dato del usuario; faltan propiedades, manejo y validación local de cada cultivo.")
    if request.water == "unknown":
        warnings.append("Disponibilidad de agua sin especificar: no se estima suficiencia de riego.")
    if not request.habitual_confirmed:
        warnings.append("La primera secuencia es una referencia ilustrativa; todavía no fue confirmada como habitual por el usuario.")
    return CompareResponse(results=results, scenario_rainfall=Metric.model_validate(scenario),
                           baseline_rainfall=Metric.model_validate(rainfall) if rainfall else None,
                           rainfall_percent=request.rainfall_percent, habitual_confirmed=request.habitual_confirmed,
                           warnings=warnings, method="structure-v1: cardinalidad de cultivos sin barbecho, repeticiones adyacentes y conteo de descansos. Sin ranking ni pesos.")
