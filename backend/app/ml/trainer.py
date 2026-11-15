"""Small offline experiment. An unsuccessful model is recorded, never promoted."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from uuid import uuid4
from app.ingestion.store import ObservationStore, POWER, MODIS, cell_key
from app.ml.features import FEATURE_NAMES, build_features

MODEL_DIR = Path(os.environ.get("NDVI_MODEL_DIR", str(Path(__file__).resolve().parents[2] / "models")))


def registry(directory=None):
    path = Path(directory or MODEL_DIR) / "ndvi_model_registry.json"
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    except (OSError, ValueError):
        return {}


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + "." + uuid4().hex + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False), encoding="utf-8")
    os.replace(temporary, path)


def train_and_evaluate_adaptive_model(lat, lon, store=None, directory=None):
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import Ridge
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    store = store or ObservationStore()
    directory = Path(directory or MODEL_DIR)
    samples = [row for row in build_features(store.rows(MODIS, lat, lon), store.rows(POWER, lat, lon)) if row["target"] is not None]
    key = cell_key(lat, lon)
    entries = registry(directory)
    record = {"status": "insufficient_data", "n_samples": len(samples), "trained_at": datetime.now(timezone.utc).isoformat(), "reason": "At least 30 complete lagged vegetation/weather pairs are required, with chronological holdouts."}
    if len(samples) >= 30:
        v, t = int(len(samples)*.70), int(len(samples)*.85)
        # Purge targets not yet known at the next partition's first prediction time.
        train = [r for r in samples[:v] if r["target_date"] < samples[v]["as_of"]]
        validation = [r for r in samples[v:t] if r["target_date"] < samples[t]["as_of"]]
        test = samples[t:]
        if min(len(train), len(validation), len(test)) < 3:
            record["reason"] = "Too few independent holdout samples after temporal purging."
        else:
            x = lambda rows: [r["features"] for r in rows]
            y = lambda rows: [r["target"] for r in rows]
            candidates = {"ridge": make_pipeline(StandardScaler(), Ridge(alpha=1)), "forest": RandomForestRegressor(n_estimators=80, max_depth=5, random_state=42, n_jobs=1)}
            for model in candidates.values():
                model.fit(x(train), y(train))
            scores = {name: mean_squared_error(y(validation), model.predict(x(validation)))**.5 for name,model in candidates.items()}
            winner = min(scores, key=scores.get)
            model = candidates[winner]
            predicted = model.predict(x(test))
            baseline = [r["baseline"] for r in test]
            rmse = mean_squared_error(y(test), predicted)**.5
            baseline_rmse = mean_squared_error(y(test), baseline)**.5
            metrics = {"mae": float(mean_absolute_error(y(test), predicted)), "rmse": float(rmse), "r2": float(r2_score(y(test), predicted)), "baseline_mae": float(mean_absolute_error(y(test), baseline)), "baseline_rmse": float(baseline_rmse), "skill_score": float(1-rmse/baseline_rmse) if baseline_rmse > 1e-12 else None}
            version = "pacha-ndvi-" + winner + "-" + uuid4().hex[:12]
            record = {"status": "promoted" if baseline_rmse > 1e-12 and rmse < baseline_rmse else "baseline_not_beaten", "model_version": version, "trained_at": record["trained_at"], "n_samples": len(samples), "training_window_start": train[0]["as_of"], "training_window_end": train[-1]["target_date"], "validation_window": [validation[0]["as_of"],validation[-1]["target_date"]], "test_window": [test[0]["as_of"],test[-1]["target_date"]], "metrics": metrics, "validation_rmse": {k:float(v) for k,v in scores.items()}, "validated_cells": [key], "feature_names": FEATURE_NAMES, "feature_importances": {}, "reason": "Chronological holdout experiment at this query point; not regional validation."}
            if winner == "ridge":
                scaler, ridge = model.steps[0][1], model.steps[1][1]
                artifact = {"kind":"ridge", "mean":scaler.mean_.tolist(), "scale":scaler.scale_.tolist(), "coef":ridge.coef_.tolist(), "intercept":float(ridge.intercept_)}
                importance = abs(ridge.coef_)
            else:
                artifact = {"kind":"forest", "trees":[{"left":tree.tree_.children_left.tolist(), "right":tree.tree_.children_right.tolist(), "feature":tree.tree_.feature.tolist(), "threshold":tree.tree_.threshold.tolist(), "value":tree.tree_.value[:,0,0].tolist()} for tree in model.estimators_]}
                importance = model.feature_importances_
            record["feature_importances"] = dict(zip(FEATURE_NAMES, [float(i) for i in importance]))
            if record["status"] == "promoted":
                artifact_path = directory / (version + ".json")
                atomic_json(artifact_path, artifact)
                record["artifact"] = artifact_path.name
                record["artifact_sha256"] = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    previous = entries.get(key, {})
    entries[key] = {"last_attempt": record, "active": record if record["status"] == "promoted" else previous.get("active")}
    atomic_json(directory / "ndvi_model_registry.json", entries)
    return record
