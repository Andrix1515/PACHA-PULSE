"""Synthetic chronological experiment; does not claim field-model validation."""
from datetime import date,timedelta
import math
from app.ingestion.store import ObservationStore,POWER,MODIS
from app.ml.features import build_features
from app.ml.trainer import train_and_evaluate_adaptive_model,registry
from app.ml.predictor import predict_ndvi


def synthetic_store(tmp_path):
    store=ObservationStore(tmp_path/'test.sqlite')
    last=date.today()-timedelta(days=16)
    first=last-timedelta(days=16*100)
    vi=[]
    for i in range(101):
        day=first+timedelta(days=16*i)
        vi.append({'date':day.isoformat(),'period_end':(day+timedelta(days=15)).isoformat(),'ndvi':.5+.2*math.sin(i*2*math.pi/23),'evi':.4,'quality':'good','retrieved_at':day.isoformat()})
    days=[]
    for i in range((date.today()-first).days+40):
        day=first-timedelta(days=32)+timedelta(days=i)
        days.append({'date':day.isoformat(),'T2M':15,'T2M_MIN':5,'T2M_MAX':25,'PRECTOTCORR':1,'retrieved_at':day.isoformat(),'quality':'complete'})
    store.put(MODIS,'061',1,2,vi);store.put(POWER,'synthetic',1,2,days)
    return store


def test_features_use_only_past_weather_and_preserve_cloud_gaps(tmp_path):
    store=synthetic_store(tmp_path)
    vi=store.rows(MODIS,1,2);weather=store.rows(POWER,1,2)
    before=build_features(vi,weather)
    cutoff=before[5]['as_of']
    changed=[{**r,'PRECTOTCORR':99999} if r['date']>cutoff else r for r in weather]
    after=build_features(vi,changed)
    assert before[5]['features']==after[5]['features']
    assert before[5]['target_date']>before[5]['as_of']
    vi[4]['ndvi']=None
    gapped=build_features(vi,weather)
    assert not any(r['observation_date']==vi[6]['date'] for r in gapped)


def test_temporal_purge_baseline_and_model_integrity(tmp_path):
    store=synthetic_store(tmp_path)
    record=train_and_evaluate_adaptive_model(1,2,store,tmp_path/'models')
    assert record['training_window_end']<record['validation_window'][0]
    assert record['validation_window'][1]<record['test_window'][0]
    assert record['metrics']['baseline_rmse']>0
    assert record['status']=='promoted'
    prediction=predict_ndvi(1,2,store,tmp_path/'models')
    assert prediction['status']=='predicted'
    assert prediction['predicted_ndvi']['status']=='predicted'
    assert prediction['predicted_ndvi']['forecast_horizon']=='16_days'
    assert predict_ndvi(1.01,2,store,tmp_path/'models')['status']=='model_unavailable_for_region'
    artifact=tmp_path/'models'/record['artifact'];artifact.write_text('{}')
    assert predict_ndvi(1,2,store,tmp_path/'models')['status']=='artifact_unavailable'


def test_insufficient_series_never_promotes(tmp_path):
    store=ObservationStore(tmp_path/'empty.sqlite')
    record=train_and_evaluate_adaptive_model(1,2,store,tmp_path/'models')
    assert record['status']=='insufficient_data'
    assert registry(tmp_path/'models')['1.00000000:2.00000000']['active'] is None


def test_authentic_mantaro_archive_temporal_experiment(tmp_path):
    """Actual archived NASA values; no synthetic curves or future weather features."""
    import json
    from pathlib import Path
    from app.providers.modis import seed_rows
    store=ObservationStore(tmp_path/'real.sqlite')
    power=json.loads((Path(__file__).resolve().parents[1]/'data/demo/power-mantaro-2023-2025.normalized.json').read_text(encoding='utf-8'))['data']
    store.put(POWER,'POWER-daily-schema2',-12.05,-75.2,power)
    store.put(MODIS,'061',-12.05,-75.2,seed_rows(-12.05,-75.2))
    record=train_and_evaluate_adaptive_model(-12.05,-75.2,store,tmp_path/'real-model')
    assert record['n_samples']>=30
    assert record['metrics']['rmse']<record['metrics']['baseline_rmse']
    assert record['status']=='promoted'
    assert predict_ndvi(42,-93,store,tmp_path/'real-model')['status']=='model_unavailable_for_region'
    # This archived experiment is not a current forecast.
    assert predict_ndvi(-12.05,-75.2,store,tmp_path/'real-model')['status']!='predicted'
