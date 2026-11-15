"""Small explicit place searches; no autocomplete, reverse lookup or bulk ingestion."""
import asyncio
import math
import os
import threading
import time
from collections import OrderedDict
from datetime import datetime, timezone
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Place search"])
_cache: OrderedDict[str, tuple[float, dict]] = OrderedDict()
_lock = threading.Lock()
_next_request = 0.0
ATTRIBUTION = "OpenStreetMap contributors / Photon by komoot"


def normalize_places(payload: dict) -> list[dict]:
    results, seen = [], set()
    for item in payload.get("features", [])[:20]:
        try:
            if not isinstance(item, dict) or not isinstance(item.get("properties"), dict) or not isinstance(item.get("geometry"), dict):
                continue
            p = item["properties"]
            if p.get("type", p.get("osm_value")) not in {"country", "state", "county", "city", "district", "region", "province", "town", "village"}:
                continue
            lon, lat = map(float, item["geometry"]["coordinates"])
            if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat) > 90 or abs(lon) > 180:
                continue
            name = str(p.get("name", "")).strip()[:160]
            if not name:
                continue
            label = ", ".join(dict.fromkeys(str(x)[:160] for x in [name, p.get("state"), p.get("country")] if x))
            identity = f'{p.get("osm_type", "")}{p.get("osm_id", "")}-{lat}-{lon}'
            if identity in seen:
                continue
            seen.add(identity)
            bounds = None
            extent = p.get("extent")
            if isinstance(extent, list) and len(extent) == 4:
                west, north, east, south = map(float, extent)
                if all(math.isfinite(x) for x in (west, north, east, south)) and -90 <= south < north <= 90 and -180 <= west < east <= 180:
                    bounds = [[south, west], [north, east]]
            results.append({"id": identity, "label": label, "lat": lat, "lon": lon, "bounds": bounds,
                            "kind": str(p.get("type", p.get("osm_value"))), "country_code": str(p.get("countrycode", ""))[:2].upper() or None})
            if len(results) == 6:
                break
        except (KeyError, ValueError, TypeError):
            continue
    return results


async def search_places(query: str, client: httpx.AsyncClient) -> dict | JSONResponse:
    global _next_request
    key = " ".join(query.split()).casefold()
    now = time.monotonic()
    with _lock:
        saved = _cache.get(key)
        if saved and now - saved[0] < 86400:
            _cache.move_to_end(key)
            return {**saved[1], "cached": True}
        # Reject bursts instead of accumulating an unbounded queue.
        if now < _next_request:
            return JSONResponse(status_code=429, headers={"Retry-After": "1"}, content={"error": {"code": "place_search_busy", "message": "Please wait a second before searching again."}})
        _next_request = now + 1.1
    endpoint = os.environ.get("PHOTON_SEARCH_URL", "https://photon.komoot.io/api/").strip()
    parsed = urlsplit(endpoint)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        return JSONResponse(status_code=503, content={"error": {"code": "place_search_configuration", "message": "Place search is unavailable. Use map or coordinate controls."}})
    params = [("q", query), ("lang", "en"), ("limit", "6"), *[("layer", layer) for layer in ("country", "state", "county", "city")]]
    try:
        async with client.stream("GET", endpoint, params=params, headers={"User-Agent": "PachaPulse/0.1 (agricultural place search)", "Accept": "application/json"}, timeout=8) as response:
            response.raise_for_status()
            data = bytearray()
            async for chunk in response.aiter_bytes():
                data.extend(chunk)
                if len(data) > 250_000:
                    raise ValueError("Response too large")
            import json
            payload = json.loads(data)
            if not isinstance(payload, dict) or not isinstance(payload.get("features"), list):
                raise ValueError("Invalid response")
        result = {"results": normalize_places(payload), "source": ATTRIBUTION, "retrieved_at": datetime.now(timezone.utc).isoformat(), "cached": False}
        with _lock:
            _cache[key] = (time.monotonic(), result)
            _cache.move_to_end(key)
            while len(_cache) > 128:
                _cache.popitem(last=False)
        return result
    except (httpx.HTTPError, ValueError, TypeError, asyncio.TimeoutError):
        return JSONResponse(status_code=503, content={"error": {"code": "place_search_unavailable", "message": "Place search could not respond. You can still move the map or enter coordinates in Field tools."}})


@router.get("/places/search")
async def places(q: str = Query(min_length=2, max_length=100, pattern=r"^[^\x00-\x1f\x7f]+$")):
    query = " ".join(q.split())
    if len(query) < 2:
        return JSONResponse(status_code=422, content={"error": {"code": "invalid_place_query", "message": "Enter at least two letters of a country or region."}})
    async with httpx.AsyncClient(follow_redirects=False) as client:
        return await search_places(query, client)
