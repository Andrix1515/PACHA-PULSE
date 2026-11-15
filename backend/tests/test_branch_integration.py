"""Integration regression: use the exact POWER cache contract without provider calls."""
import asyncio
from types import SimpleNamespace

from app.api.routes import crops
from app.data.climate_cache import ClimateCache, cache_key


def test_candidates_reuse_exact_climate_period_and_point(monkeypatch, tmp_path):
    cache = ClimateCache(tmp_path / "climate.sqlite")
    cache.put(cache_key(-12.05, -75.2, "2025-01-01", "2025-01-31"), {
        "summary": {"temperature_mean": {"value": 9.41}, "rainfall_total": {"value": 60.64}}
    })
    monkeypatch.setattr(crops, "climate_cache", cache)

    async def location(*args):
        return SimpleNamespace(climate_zone="Synthetic fixture", country_code="PE", country_name="Peru")

    async def soil(*args):
        return None

    calls = []
    monkeypatch.setattr(crops.location_service, "identify_location", location)
    monkeypatch.setattr(crops.soil_service, "get_soil_profile", soil)
    monkeypatch.setattr(crops.suitability_engine, "evaluate_candidates", lambda **kwargs: calls.append(kwargs) or [])

    asyncio.run(crops.get_candidate_crops(-12.05, -75.2, "unknown", "2025-01-01", "2025-01-31"))
    assert calls[-1]["climate_mean_temp_c"] == 9.41
    assert calls[-1]["climate_rainfall_mm"] == 60.64
    # Never borrow a nearby point or a different period's historical weather.
    asyncio.run(crops.get_candidate_crops(-12.051, -75.2, "unknown", "2025-01-01", "2025-01-31"))
    assert calls[-1]["climate_mean_temp_c"] is None
    asyncio.run(crops.get_candidate_crops(-12.05, -75.2, "unknown", "2025-02-01", "2025-02-28"))
    assert calls[-1]["climate_rainfall_mm"] is None
