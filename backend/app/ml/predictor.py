from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
from app.ingestion.store import ObservationStore, POWER, MODIS, cell_key
from app.ml.features import build_features
from app.ml.trainer import MODEL_DIR, registry
from app.clients.modis import LIMITATIONS


def model_status(lat, lon, directory=None):
    entry = registry(directory).get(cell_key(lat, lon), {})
    active = entry.get("active")
    return {"is_covered_for_ml": bool(active), "model_version": active.get("model_version") if active else None, "trained_at": active.get("trained_at") if active else None, "metrics": active.get("metrics") if active else None, "last_attempt": entry.get("last_attempt")}


def predict_ndvi(lat, lon, store=None, directory=None):
    store = store or ObservationStore()
    metadata = registry(directory).get(cell_key(lat, lon), {}).get("active")
    unavailable = {"status":"model_unavailable_for_region", "reason":"This query point has no promoted MODIS + POWER model that beats persistence.", "fallback":"Historical observations and deterministic planning remain available.", "limitations":LIMITATIONS}
    if not metadata:
        return unavailable
    rows = store.rows(MODIS,lat,lon)
    samples = build_features(rows, store.rows(POWER,lat,lon))
    if not rows or not samples or samples[-1]["observation_date"] != rows[-1]["date"]:
        return {**unavailable, "status":"features_unavailable", "reason":"The newest composite lacks valid lagged vegetation or 32 complete weather days."}
    sample = samples[-1]
    if date.fromisoformat(sample["target_date"]) <= date.today() or (date.today()-date.fromisoformat(sample["as_of"])).days > 48:
        return {**unavailable,"status":"observations_stale","reason":"The latest usable composite is too old for a current 16-day outlook. Run offline synchronization."}
    directory = Path(directory or MODEL_DIR)
    artifact_path = directory / Path(metadata["artifact"]).name
    if not artifact_path.is_file() or hashlib.sha256(artifact_path.read_bytes()).hexdigest() != metadata["artifact_sha256"]:
        return {**unavailable, "status":"artifact_unavailable", "reason":"The local model artifact failed its integrity check."}
    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    x = sample["features"]
    if artifact["kind"] == "ridge":
        value = artifact["intercept"] + sum((v-m)/s*c for v,m,s,c in zip(x,artifact["mean"],artifact["scale"],artifact["coef"]))
    else:
        values=[]
        for tree in artifact["trees"]:
            node=0
            while tree["left"][node] != -1:
                node=tree["left"][node] if x[tree["feature"][node]] <= tree["threshold"][node] else tree["right"][node]
            values.append(tree["value"][node])
        value=sum(values)/len(values)
    value=max(-.2,min(1,value))
    rmse=metadata["metrics"]["rmse"]
    metric={"value":round(value,4),"unit":"NDVI ratio","status":"predicted","source":"Local temporally validated scikit-learn experiment","observed_at":sample["as_of"],"retrieved_at":datetime.now(timezone.utc).isoformat(),"spatial_resolution":"Nominal 250 m","quality":"experimental","forecast_horizon":"16_days","forecast_origin":sample["as_of"],"model_version":metadata["model_version"],"limitations":LIMITATIONS+["The +/- test RMSE band is an error reference, not a calibrated confidence interval. Repeated adaptive holdouts are not independent field validation."]}
    return {"status":"predicted","predicted_ndvi":metric,"current_ndvi":{"value":sample["baseline"],"date":sample["observation_date"]},"target_date":sample["target_date"],"days_until_target":(date.fromisoformat(sample["target_date"])-date.today()).days,"uncertainty_band":[max(-.2,value-rmse),min(1,value+rmse)],"expected_delta":round(value-sample["baseline"],4),"interpretation":"greenness_increasing" if value-sample["baseline"]>.03 else "greenness_decreasing" if value-sample["baseline"]<-.03 else "similar_greenness","model_metadata":metadata,"limitations":metric["limitations"]}
