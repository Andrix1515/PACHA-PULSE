import hashlib
import json
from pathlib import Path
from app.clients.modis import SOURCE, LIMITATIONS, normalize, fetch_raw
from app.ingestion.store import ObservationStore, MODIS
from app.providers.base import BaseProvider, ProviderMetadata, ProviderStatus, DataSourceType

DEMO = Path(__file__).resolve().parents[2] / "data" / "demo"


def seed_rows(lat, lon):
    if (lat, lon) != (-12.05, -75.2):
        return []
    path = DEMO / "modis-mantaro-2023-2025.raw.json"
    manifest_path = DEMO / "modis-mantaro-2023-2025.source.json"
    if not path.exists() or not manifest_path.exists():
        return []
    content = path.read_bytes()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if hashlib.sha256(content).hexdigest() != manifest["raw_sha256"]:
        raise ValueError("MODIS seed integrity check failed.")
    return normalize(json.loads(content))


class MODISService(BaseProvider):
    def __init__(self):
        super().__init__(ProviderMetadata(id="nasa_modis_vi", name=SOURCE, organization="NASA ORNL DAAC / LP DAAC", source_type=DataSourceType.SATELLITE_VEGETATION, description="Quality-filtered historical point composites", documentation_url="https://doi.org/10.5067/MODIS/MOD13Q1.061", spatial_resolution="Nominal 250 m", temporal_resolution="16-day composites", status=ProviderStatus.CONFIGURED, limitations=LIMITATIONS))

    async def series(self, lat, lon, start, end, refresh=False, store=None):
        store = store or ObservationStore()
        warnings = []
        if refresh:
            try:
                raw = await fetch_raw(lat, lon, start, end)
                store.put(MODIS, "061", lat, lon, normalize(raw))
            except Exception as exc:
                warnings.append(f"MODIS source unavailable: {type(exc).__name__}. Stored observations remain accessible.")
                self.mark_error(warnings[-1])
        rows = store.rows(MODIS, lat, lon, start, end)
        delivery = "ingested"
        if not rows:
            rows = [row for row in seed_rows(lat, lon) if str(start) <= row["date"] <= str(end)]
            delivery = "saved_observation"
        if rows:
            self.mark_success()
        values = [row["ndvi"] for row in rows if row["ndvi"] is not None]
        return {"lat": lat, "lon": lon, "start": str(start), "end": str(end), "source": SOURCE, "product_version": "061", "status": "observed" if rows else "unavailable", "delivery": delivery if rows else "unavailable", "unit": "NDVI/EVI dimensionless ratio", "observed_at": f"{start}/{end}", "spatial_resolution": "Nominal 250 m", "retrieved_at": max((row["retrieved_at"] for row in rows), default=None), "quality": "complete" if rows and len(values) == len(rows) else "partial" if values else "unavailable", "data": rows, "summary": {"ndvi_mean": sum(values)/len(values) if values else None, "ndvi_min": min(values) if values else None, "ndvi_max": max(values) if values else None, "valid_composites_count": len(values), "cloudy_composites_count": len(rows)-len(values)}, "limitations": LIMITATIONS + warnings}
