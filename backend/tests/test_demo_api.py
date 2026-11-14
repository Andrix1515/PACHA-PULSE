from datetime import date
import json

import pytest

from tests.test_api import request


@pytest.mark.parametrize("query", ["lat=91&lon=0&start=2025-01-01&end=2025-01-31", "lat=0&lon=181&start=2025-01-01&end=2025-01-31", "lat=0&lon=0&start=2025-02-01&end=2025-01-01", "lat=nan&lon=0&start=2025-01-01&end=2025-01-31"])
def test_climate_validation_before_external_request(query):
    response = request("GET", f"/api/v1/observations/climate?{query}")
    assert response.status_code == 422
    assert "error" in response.json()


def test_authentic_saved_series_contract():
    response = request("GET", "/api/v1/observations/climate/demo")
    assert response.status_code == 200
    body = response.json()
    assert body["delivery"] == "saved_observation"
    assert body["lat"] == -12.05
    assert body["product_version"] == "v2.10.3"
    assert body["summary"]["rainfall_total"]["value"] == 60.64
    assert body["summary"]["temperature_mean"]["value"] == 9.41


def test_saved_series_manifest_hash():
    import hashlib
    from pathlib import Path
    directory = Path(__file__).resolve().parents[1] / "data/demo"
    manifest = json.loads((directory / "power-mantaro-2025-01.source.json").read_text(encoding="utf-8"))
    assert manifest["synthetic"] is False
    assert manifest["sha256"] == hashlib.sha256((directory / "power-mantaro-2025-01.raw.json").read_bytes()).hexdigest()
