from datetime import date
from typing import Literal
from fastapi import APIRouter,Query,HTTPException
from pydantic import BaseModel,Field,ConfigDict,model_validator
from app.providers.modis import MODISService
from app.ml.predictor import predict_ndvi,model_status
from app.ingestion.store import ObservationStore
from app.monitoring import analyze

router=APIRouter(tags=["Vegetation and offline adaptive ML"])
modis_service=MODISService()


class PointRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    lat:float=Field(ge=-90,le=90,allow_inf_nan=False)
    lon:float=Field(ge=-180,le=180,allow_inf_nan=False)


class PeriodRequest(PointRequest):
    start:date
    end:date

    @model_validator(mode="after")
    def period(self):
        if self.start>self.end or (self.end-self.start).days>1096:
            raise ValueError("Choose an ordered period up to three years.")
        return self


class PredictionRequest(PointRequest):
    trigger_update:bool=False


@router.get("/observations/vegetation")
async def vegetation(lat:float=Query(ge=-90,le=90,allow_inf_nan=False),lon:float=Query(ge=-180,le=180,allow_inf_nan=False),start:date=Query(),end:date=Query(),refresh:bool=False):
    if start>end or (end-start).days>1096:
        raise HTTPException(422,"Invalid MODIS period.")
    return await modis_service.series(lat,lon,start,end,refresh)


@router.post("/monitoring/analyze")
async def monitoring(request:PeriodRequest):
    return await analyze(request.lat,request.lon,request.start,request.end)


@router.post("/ml/predict-ndvi")
def prediction(request:PredictionRequest):
    # Request handlers enqueue bounded work, never train or perform multi-year ingestion.
    store=ObservationStore()
    job=None
    if request.trigger_update:
        try:
            job=store.enqueue(request.lat,request.lon)
        except ValueError as exc:
            raise HTTPException(429,str(exc))
    result=predict_ndvi(request.lat,request.lon,store)
    return {**result,"lat":request.lat,"lon":request.lon,"update_job_id":job,"update_state":"queued_for_offline_worker" if job else None,"ingestion_sync":store.sync_status(request.lat,request.lon),"adaptive_ml":model_status(request.lat,request.lon)}


from app.simulation.economics import EconomicInputs,budget

@router.post("/planning/budget")
def local_budget(inputs:EconomicInputs):
    return budget(inputs)
