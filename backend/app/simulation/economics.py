"""User-supplied budget scenarios, never satellite yield or guaranteed savings."""
from datetime import datetime,timezone
from pydantic import BaseModel,ConfigDict,Field


class EconomicInputs(BaseModel):
    model_config=ConfigDict(extra="forbid")
    area_ha:float=Field(gt=0,le=1e6,allow_inf_nan=False)
    cost_per_ha:float=Field(ge=0,le=1e9,allow_inf_nan=False)
    expected_yield_t_ha:float=Field(ge=0,le=1e4,allow_inf_nan=False)
    price_per_ton:float=Field(ge=0,le=1e9,allow_inf_nan=False)
    currency:str=Field(pattern=r"^[A-Z]{3}$")
    verified_n_credit_kg_ha:float|None=Field(default=None,ge=0,le=1000,allow_inf_nan=False)
    price_per_kg_n:float|None=Field(default=None,ge=0,le=1e5,allow_inf_nan=False)


def budget(inputs:EconomicInputs):
    cost=inputs.area_ha*inputs.cost_per_ha
    revenue=inputs.area_ha*inputs.expected_yield_t_ha*inputs.price_per_ton
    n=inputs.area_ha*inputs.verified_n_credit_kg_ha*inputs.price_per_kg_n if inputs.verified_n_credit_kg_ha is not None and inputs.price_per_kg_n is not None else None
    def metric(value,unit):
        return {"value":round(value,2) if value is not None else None,"unit":unit,"status":"scenario" if value is not None else "unavailable","source":"Arithmetic from the user's local budget assumptions","observed_at":"User-defined campaign","retrieved_at":datetime.now(timezone.utc).isoformat(),"spatial_resolution":"User-specified or selected outline area","quality":"Unverified user inputs","limitations":["Expected harvest is entered by the user, not predicted from satellites.","Net margin excludes unentered costs. Nitrogen credit is not inferred from generic legume fixation."]}
    return {"inputs":inputs.model_dump(),"status":"scenario","total_cost":metric(cost,inputs.currency),"gross_revenue":metric(revenue,inputs.currency),"net_margin":metric(revenue-cost,inputs.currency),"break_even_yield_t_ha":metric(inputs.cost_per_ha/inputs.price_per_ton if inputs.price_per_ton>0 else None,"t/ha"),"potential_n_credit_value":metric(n,inputs.currency),"limitations":["Budget arithmetic is separate from crop suitability and does not rank rotations.","Potential nitrogen credit value is separate; it is not automatically subtracted from costs or added to margin."]}
