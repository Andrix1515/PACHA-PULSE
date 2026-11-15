"""Synthetic transport regression tests, separate from archived NASA observations."""
import asyncio
from datetime import date,datetime,timezone
import pytest
from app.clients.modis import normalize
from app.ingestion.store import ObservationStore,MODIS,POWER
from app.ingestion.updater import update_observations
from app.simulation.economics import EconomicInputs,budget
from app.providers.modis import MODISService,seed_rows


def raw_fixture(qa=0,ndvi=6000,evi=4000):
    return {"responses":[{"request_url":"https://synthetic.invalid/fixture","retrieved_at":"2026-01-01T00:00:00Z","payload":{"subset":[{"calendar_date":"2025-01-01","band":"250m_16_days_"+key,"data":[value],"tile":"synthetic"} for key,value in [('NDVI',ndvi),('EVI',evi),('pixel_reliability',qa)]]}}]}


@pytest.mark.parametrize('qa,expected',[(0,.6),(1,.6),(2,None),(3,None),(-1,None),(None,None)])
def test_modis_qa_and_scaling(qa,expected):
    result=normalize(raw_fixture(qa))[0]
    assert result['ndvi']==expected
    assert result['period_end']=='2025-01-16'
    assert result['evi']==(.4 if qa in (0,1) else None)


def test_fill_invalid_values_and_valid_zero():
    assert normalize(raw_fixture(ndvi=-3000))[0]['ndvi'] is None
    assert normalize(raw_fixture(ndvi=10001))[0]['ndvi'] is None
    assert normalize(raw_fixture(ndvi=0))[0]['ndvi']==0


def test_incremental_updates_are_idempotent_and_fetch_only_missing(monkeypatch,tmp_path):
    from app.ingestion import updater
    store=ObservationStore(tmp_path/'test.sqlite')
    calls=[]
    async def power(*args):
        calls.append((args[2],args[3]));return {},'synthetic'
    def normalized(*args):
        return {'data':[{'date':args[3].isoformat(),'T2M':10,'T2M_MIN':5,'T2M_MAX':15,'PRECTOTCORR':0}]}
    async def satellite(*args):
        return raw_fixture()
    monkeypatch.setattr(updater.power,'fetch_raw',power)
    monkeypatch.setattr(updater.power,'normalize',normalized)
    monkeypatch.setattr(updater.modis,'fetch_raw',satellite)
    import app.ml.trainer as trainer
    monkeypatch.setattr(trainer,'train_and_evaluate_adaptive_model',lambda *args:{'status':'synthetic_no_training'})
    first=asyncio.run(update_observations(1,2,date(2025,1,1),date(2025,1,1),store=store))
    second=asyncio.run(update_observations(1,2,date(2025,1,1),date(2025,1,1),store=store))
    third=asyncio.run(update_observations(1,2,date(2025,1,1),date(2025,1,2),store=store))
    assert (first['power_new_rows'],second['power_new_rows'],third['power_new_rows'])==(1,0,1)
    assert first['modis_new_rows']==1 and second['modis_new_rows']==0
    assert calls==[(date(2025,1,1),date(2025,1,1)),(date(2025,1,2),date(2025,1,2))]
    assert len(store.rows(POWER,1,2))==2


def test_queue_deduplicates_and_does_not_mix_points(tmp_path):
    store=ObservationStore(tmp_path/'test.sqlite')
    assert store.enqueue(1,2)==store.enqueue(1,2)
    assert store.enqueue(1,2)!=store.enqueue(1.001,2)


def test_budget_inputs_and_missing_price_no_invented_fertilizer_saving():
    result=budget(EconomicInputs(area_ha=2,cost_per_ha=1000,expected_yield_t_ha=3,price_per_ton=500,currency='PEN'))
    assert result['total_cost']['value']==2000
    assert result['gross_revenue']['value']==3000
    assert result['net_margin']['value']==1000
    assert result['break_even_yield_t_ha']['value']==2
    assert result['potential_n_credit_value']['value'] is None
    assert result['net_margin']['status']=='scenario'
    result=budget(EconomicInputs(area_ha=2,cost_per_ha=1000,expected_yield_t_ha=3,price_per_ton=0,currency='PEN'))
    assert result['break_even_yield_t_ha']['value'] is None


def test_authentic_seed_integrity_and_location_scope(tmp_path):
    rows=seed_rows(-12.05,-75.2)
    assert len(rows)>=46
    assert all(row['source'].startswith('NASA MODIS') for row in rows)
    assert seed_rows(-12.051,-75.2)==[]
    response=asyncio.run(MODISService().series(42,-93,date(2023,1,1),date(2025,12,31),store=ObservationStore(tmp_path/'test.sqlite')))
    assert response['status']=='unavailable' and response['data']==[]


def test_prediction_trigger_only_queues_never_trains(monkeypatch,tmp_path):
    from app.api.routes import earth
    import app.ml.trainer as trainer
    from tests.test_api import request
    store=ObservationStore(tmp_path/'test.sqlite')
    monkeypatch.setattr(earth,'ObservationStore',lambda:store)
    def forbidden(*args,**kwargs):
        raise AssertionError('Training must never execute inside HTTP')
    monkeypatch.setattr(trainer,'train_and_evaluate_adaptive_model',forbidden)
    response=request('POST','/api/v1/ml/predict-ndvi',json={'lat':42.001,'lon':-93.002,'trigger_update':True})
    assert response.status_code==200
    assert response.json()['status']=='model_unavailable_for_region'
    assert response.json()['update_state']=='queued_for_offline_worker'


def test_descriptive_dry_spell_breaks_at_missing_day(tmp_path):
    from app.monitoring import analyze
    store=ObservationStore(tmp_path/'test.sqlite')
    rows=[{'date':day,'T2M':10,'T2M_MIN':0,'T2M_MAX':20,'PRECTOTCORR':0,'retrieved_at':'2026-01-01','quality':'complete'} for day in ['2025-01-01','2025-01-02','2025-01-04']]
    store.put(POWER,'synthetic',1,2,rows)
    result=asyncio.run(analyze(1,2,date(2025,1,1),date(2025,1,4),store))
    assert result['metrics']['longest_observed_dry_spell']['value']==2
    assert result['coverage']['complete_weather_days']==3
    assert result['metrics']['rainfall_concentration']['value'] is None


def test_rotation_budget_is_optional_and_never_becomes_observed_profit():
    from tests.test_api import request
    payload={"rotations":[{"name":"usual","crops":["maize","maize","maize"]},{"name":"alternative","crops":["maize","bean","potato"]}]}
    plain=request('POST','/api/v1/rotations/compare',json=payload).json()
    assert plain['economic_summary'] is None
    assert all(row['profitability'] is None for row in plain['results'])
    payload['economic_inputs']={"area_ha":2,"cost_per_ha":1000,"expected_yield_t_ha":3,"price_per_ton":500,"currency":"PEN"}
    scenario=request('POST','/api/v1/rotations/compare',json=payload)
    assert scenario.status_code==200
    assert scenario.json()['economic_summary']['net_margin']['value']==1000
    assert scenario.json()['economic_summary']['net_margin']['status']=='scenario'
    assert scenario.json()['results'][1]['agronomic_assessment']['synthetic_fertilizer_offset_kg_n_ha'] is None
