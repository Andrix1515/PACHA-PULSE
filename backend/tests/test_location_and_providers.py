"""Tests for location intelligence, geocoding, and data provider registry."""

import asyncio
from pathlib import Path
from app.providers.location import LocationService, determine_hemisphere
from app.providers.registry import registry, ProviderStatus
from app.providers.senamhi import SENAMHIService
from app.providers.soilgrids import SoilGridsService, determine_usda_texture
from app.providers.elevation import ElevationService, TerrainInfo
from app.providers.gaez import GAEZService, SuitabilityClass
from app.providers.faostat import FAOSTATService
from tests.test_api import request


def test_location_identification_peru():
    async def run():
        loc_service = LocationService()
        # Junín, Mantaro Valley, Peru coordinates
        return await loc_service.identify_location(-12.05, -75.20)
    ctx = asyncio.run(run())
    assert ctx.country_code == "PE"
    assert "peru" in ctx.country_name.lower() or "perú" in ctx.country_name.lower()
    assert ctx.hemisphere == "southern"
    assert ctx.elevation_m is not None
    assert ctx.elevation_m > 2000  # Highland Andes


def test_location_identification_usa():
    async def run():
        loc_service = LocationService()
        # Iowa, US Midwest Corn Belt coordinates
        return await loc_service.identify_location(42.03, -93.64)
    ctx = asyncio.run(run())
    assert ctx.country_code == "US"
    assert "united states" in ctx.country_name.lower() or "estados unidos" in ctx.country_name.lower()
    assert ctx.hemisphere == "northern"
    assert ctx.elevation_m is not None


def test_location_identification_colombia():
    async def run():
        loc_service = LocationService()
        # Valle del Cauca, Colombia coordinates
        return await loc_service.identify_location(3.45, -76.53)
    ctx = asyncio.run(run())
    assert ctx.country_code == "CO"
    assert ctx.hemisphere in ("northern", "equatorial")


def test_hemisphere_logic():
    assert determine_hemisphere(45.0) == "northern"
    assert determine_hemisphere(-34.0) == "southern"
    assert determine_hemisphere(0.5) == "equatorial"


def test_provider_registry_listing_and_filtering():
    providers_report = registry.get_providers_for_location(-12.05, -75.20, "PE")
    assert providers_report.country_code == "PE"
    assert providers_report.active_providers_count >= 5

    # Check SENAMHI is active for Peru
    senamhi_prov = next((p for p in providers_report.providers if p.id == "senamhi_peru"), None)
    assert senamhi_prov is not None
    assert senamhi_prov.is_active_for_location is True

    # Check SENAMHI is inactive for US
    us_report = registry.get_providers_for_location(42.03, -93.64, "US")
    us_senamhi = next((p for p in us_report.providers if p.id == "senamhi_peru"), None)
    assert us_senamhi is not None
    assert us_senamhi.is_active_for_location is False
    assert us_senamhi.status == ProviderStatus.NOT_APPLICABLE


def test_senamhi_auto_disables_outside_peru():
    senamhi = SENAMHIService()
    report_us = senamhi.get_stations_for_location(42.03, -93.64, "US")
    assert report_us.is_peru is False
    assert report_us.status == "disabled_outside_peru"
    assert report_us.nearest_station is None

    report_pe = senamhi.get_stations_for_location(-12.05, -75.20, "PE")
    assert report_pe.is_peru is True
    assert report_pe.status == "active"
    assert report_pe.nearest_station is not None
    assert "Huayao" in report_pe.nearest_station.station_name or report_pe.nearest_station.distance_km < 50.0


def test_usda_texture_triangle():
    assert determine_usda_texture(sand=70, silt=20, clay=10) == "sandy_loam"
    assert determine_usda_texture(sand=20, silt=20, clay=60) == "clay"
    assert determine_usda_texture(sand=40, silt=40, clay=20) == "loam"
    assert determine_usda_texture(sand=None, silt=None, clay=None) == "unknown"


def test_soilgrids_retries_after_unavailable_response(monkeypatch):
    import app.providers.soilgrids as soilgrids_module
    import httpx

    monkeypatch.setattr(soilgrids_module, "_SOIL_CACHE", {})
    attempts = 0

    async def mock_query(self, lat, lon, prop_name, depth, client):
        nonlocal attempts
        attempts += 1
        if attempts <= 21:  # First run simulates timeout across all 21 property/depth queries
            raise httpx.ReadTimeout("mock SoilGrids timeout")
        # Second run returns valid mock values (raw numbers before scaling)
        val_map = {
            "phh2o": 60.0,    # 60 * 0.1 = 6.0 pH
            "soc": 300.0,     # 300 * 0.01 = 3.0 %
            "nitrogen": 250.0,# 250 * 0.01 = 2.5 g/kg
            "clay": 300.0,    # 300 * 0.1 = 30.0 %
            "sand": 400.0,    # 400 * 0.1 = 40.0 %
            "silt": 300.0,    # 300 * 0.1 = 30.0 %
            "bdod": 130.0,    # 130 * 0.01 = 1.3 g/cm3
        }
        return val_map.get(prop_name, 50.0)

    monkeypatch.setattr(SoilGridsService, "_query_wcs_property", mock_query)

    async def run():
        service = SoilGridsService()
        async with httpx.AsyncClient() as client:
            unavailable = await service.get_soil_profile(-12.051, -75.201, client)
            available = await service.get_soil_profile(-12.051, -75.201, client)
        return unavailable, available

    unavailable, available = asyncio.run(run())
    assert unavailable.provenance.status == "unavailable"
    assert available.provenance.status == "derived"
    assert available.ph_h2o.profile_mean == 6.0
    assert available.soil_texture_class in ("loam", "clay_loam")


def test_elevation_service_terrain():
    async def run():
        service = ElevationService()
        # Point query in Mantaro Valley, Peru
        terrain = await service.get_terrain(-12.05, -75.20)
        return terrain

    terrain = asyncio.run(run())
    assert terrain.elevation_m is not None
    assert terrain.elevation_m > 2000
    assert terrain.dem_source == "Copernicus DEM 90m / SRTM"
    assert terrain.slope_percent is not None
    assert terrain.aspect is not None


def test_elevation_service_polygon():
    async def run():
        service = ElevationService()
        polygon = [
            (-12.050, -75.200),
            (-12.052, -75.200),
            (-12.052, -75.203),
            (-12.050, -75.203),
        ]
        return await service.get_terrain(-12.051, -75.201, polygon_points=polygon)

    terrain = asyncio.run(run())
    assert terrain.elevation_min_m is not None
    assert terrain.elevation_max_m is not None
    assert terrain.relief_m >= 0.0
    assert terrain.slope_percent is not None


def test_provider_status_enum_granular():
    assert ProviderStatus.DATA_AVAILABLE == "data_available"
    assert ProviderStatus.TIMEOUT == "timeout"
    assert ProviderStatus.OUTSIDE_COVERAGE == "outside_coverage"
    assert ProviderStatus.PARTIAL_DATA == "partial_data"
    assert ProviderStatus.CONFIGURED == "configured"
    assert ProviderStatus.CONNECTED == "connected"


def test_gaez_suitability_evaluation():
    gaez = GAEZService()
    eval_andean = gaez.evaluate_location(-12.05, -75.20, "Andean Highland", "PE", "rainfed")
    assert eval_andean.climate_zone == "Andean Highland"
    potato_suit = next((c for c in eval_andean.evaluated_crops if c.crop_id == "potato"), None)
    assert potato_suit is not None
    assert potato_suit.suitability_class == SuitabilityClass.VERY_SUITABLE


def test_gaez_initialization_does_not_write_to_data_dir(tmp_path, monkeypatch):
    data_dir = tmp_path / "gaez"

    def reject_directory_creation(self, *args, **kwargs):
        if self == data_dir:
            raise OSError("read-only filesystem")
        return original_mkdir(self, *args, **kwargs)

    original_mkdir = Path.mkdir
    monkeypatch.setattr(Path, "mkdir", reject_directory_creation)

    service = GAEZService(data_dir=data_dir)

    assert service.data_dir == data_dir
    assert not data_dir.exists()


def test_faostat_national_statistics():
    faostat = FAOSTATService()
    pe_stats = faostat.get_country_profile("PE", "Peru")
    assert pe_stats.country_code == "PE"
    top_crops = [c.crop_id for c in pe_stats.top_crops_by_area]
    assert "potato" in top_crops
    assert "quinoa" in top_crops


def test_location_api_routes():
    res = request("GET", "/api/v1/location/inspect?lat=-12.05&lon=-75.20")
    assert res.status_code == 200
    data = res.json()
    assert data["country_code"] == "PE"
    assert "provenance" in data

    prov_res = request("GET", "/api/v1/location/providers?lat=-12.05&lon=-75.20")
    assert prov_res.status_code == 200
    prov_data = prov_res.json()
    assert len(prov_data["providers"]) >= 6
