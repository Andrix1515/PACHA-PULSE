"""Bounded ORNL DAAC point subsets; no interpolation or synthetic observations."""
import asyncio
from datetime import date, datetime, timedelta, timezone
import math
import httpx

BASE_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
SOURCE = "NASA MODIS MOD13Q1.061 via ORNL DAAC"
LIMITATIONS = [
    "MODIS pixel size is nominally 250 m x 250 m (~6.25 ha); smaller parcels share reflectance with surrounding land.",
    "16-day composites are historical canopy greenness, not yield, soil health or a pest diagnosis.",
    "Composite start dates are not instantaneous acquisitions; a composite is only usable after its observation window ends.",
    "Marginal QA is retained and labelled; snow, cloud, fill and invalid values remain missing.",
]


async def get_json(client, url, params=None):
    for attempt in range(3):
        try:
            response = await client.get(url, params=params, headers={"Accept": "application/json", "User-Agent": "PachaPulse/0.3 point-subset"}, timeout=25)
            response.raise_for_status()
            if len(response.content) > 4_000_000:
                raise ValueError("The MODIS response exceeds the point-subset limit.")
            return response.json(), str(response.url)
        except (httpx.HTTPError, ValueError):
            if attempt == 2:
                raise
            await asyncio.sleep(.5 * 2 ** attempt)


def composite_on_or_after(day):
    first = date(day.year,1,1)
    result = first + timedelta(days=((day-first).days+15)//16*16)
    return date(day.year+1,1,1) if result.year != day.year else result


async def fetch_raw(lat: float, lon: float, start: date, end: date, client=None):
    if start > end or (end - start).days > 1096:
        raise ValueError("Choose an ordered MODIS period of at most three years.")
    own = client is None
    client = client or httpx.AsyncClient()
    try:
        responses = []
        cursor = composite_on_or_after(start)
        while cursor <= end:
            chunk_end = min(end, cursor + timedelta(days=143))
            payload, url = await get_json(client, BASE_URL + "/subset", {"latitude": lat, "longitude": lon, "startDate": cursor.strftime("A%Y%j"), "endDate": chunk_end.strftime("A%Y%j"), "kmAboveBelow": 0, "kmLeftRight": 0})
            if int(payload.get("nrows", 0)) != 1 or int(payload.get("ncols", 0)) != 1:
                raise ValueError("Expected one MODIS pixel; refusing an ambiguous spatial average.")
            responses.append({"request_url": url, "retrieved_at": datetime.now(timezone.utc).isoformat(), "payload": payload})
            cursor = composite_on_or_after(chunk_end + timedelta(days=1))
        return {"lat": lat, "lon": lon, "start": start.isoformat(), "end": end.isoformat(), "responses": responses}
    finally:
        if own:
            await client.aclose()


def normalize(raw):
    grouped = {}
    for response in raw["responses"]:
        for row in response["payload"].get("subset", []):
            day = row["calendar_date"]
            item = grouped.setdefault(day, {"date": day, "tile": row.get("tile"), "retrieved_at": response["retrieved_at"], "request_url": response["request_url"]})
            values = row.get("data", [])
            item[row["band"].removeprefix("250m_16_days_")] = values[0] if len(values) == 1 else None
    result = []
    for day, row in sorted(grouped.items()):
        qa = row.get("pixel_reliability")
        clean = qa in (0, 1)
        def scaled(name):
            value = row.get(name)
            return round(value * .0001, 4) if clean and isinstance(value, (int, float)) and math.isfinite(value) and -2000 <= value <= 10000 else None
        ndvi, evi = scaled("NDVI"), scaled("EVI")
        result.append({"date": day, "period_end": (date.fromisoformat(day) + timedelta(days=15)).isoformat(), "ndvi": ndvi, "evi": evi, "pixel_reliability": qa, "quality": ("good" if qa == 0 else "marginal") if ndvi is not None and evi is not None else "cloudy_or_unreliable", "status": "observed", "source": SOURCE, "tile": row.get("tile"), "retrieved_at": row["retrieved_at"], "request_url": row["request_url"]})
    return result
