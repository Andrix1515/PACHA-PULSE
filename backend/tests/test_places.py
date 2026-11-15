"""Synthetic Photon fixtures test parsing/limits; live checks are recorded separately."""
import asyncio

import httpx
import pytest

from app.api.routes import places
from tests.test_api import request


@pytest.fixture(autouse=True)
def clean_places(monkeypatch):
    places._cache.clear()
    monkeypatch.setattr(places, "_next_request", 0)
    monkeypatch.delenv("PHOTON_SEARCH_URL", raising=False)


def feature(**overrides):
    return {"properties": {"name": "Peru", "country": "Peru", "type": "country", "countrycode": "PE", "extent": [-81.4, -.02, -68.6, -18.4], **overrides}, "geometry": {"type": "Point", "coordinates": [-75, -9]}}


def test_bounds_are_converted_without_selecting_a_field():
    result = places.normalize_places({"features": [feature(), feature(), feature(type="house"), {"properties": None}, {"properties": {}, "geometry": None}]})
    assert len(result) == 1
    assert result[0]["bounds"] == [[-18.4, -81.4], [-.02, -68.6]]
    assert result[0]["country_code"] == "PE"
    assert "field" not in result[0]


def test_invalid_geometry_and_bounds_are_rejected():
    invalid = feature(); invalid["geometry"]["coordinates"] = [float("inf"), 1]
    result = places.normalize_places({"features": [invalid, feature(extent=[0, 0, 500, 90])]})
    assert len(result) == 1 and result[0]["bounds"] is None


def test_search_transport_cache_and_process_burst_limit():
    calls = []
    def handler(outgoing):
        calls.append(outgoing)
        assert outgoing.url.params.get_list("layer") == ["country", "state", "county", "city"]
        assert outgoing.headers["user-agent"].startswith("PachaPulse/")
        return httpx.Response(200, json={"features": [feature()]})
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            first = await places.search_places("Peru", client)
            cached = await places.search_places("PERU", client)
            busy = await places.search_places("Junin", client)
            assert first["results"][0]["label"] == "Peru"
            assert cached["cached"] is True and cached["retrieved_at"] == first["retrieved_at"]
            assert busy.status_code == 429
    asyncio.run(run())
    assert len(calls) == 1


@pytest.mark.parametrize("body,status", [(b"not json", 200), (b'{"wrong": []}', 200), (b"upstream down", 503), (b"x" * 250001, 200)])
def test_provider_errors_are_typed(body, status):
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(status, content=body))) as client:
            result = await places.search_places("Peru", client)
            assert result.status_code == 503
            assert b"place_search_unavailable" in result.body
    asyncio.run(run())


@pytest.mark.parametrize("query", ["", "x", "x" * 101, "\n", "   "])
def test_bad_query_rejected_before_network(query):
    assert request("GET", "/api/v1/places/search", params={"q": query}).status_code == 422
