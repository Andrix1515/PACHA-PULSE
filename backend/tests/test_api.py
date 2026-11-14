import asyncio

import httpx
import pytest

from app.main import app


def request(method, path):
    async def send():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.request(method, path)
    return asyncio.run(send())


def test_health_contract():
    response = request("get", "/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "agroshift-api", "version": "0.1.0"}


@pytest.mark.parametrize("method,path,status", [("get", "/api/v1/missing", 404), ("post", "/api/v1/health", 405)])
def test_errors_have_consistent_json(method, path, status):
    response = request(method, path)
    assert response.status_code == status
    assert response.json()["error"]["code"] == f"http_{status}"
    assert isinstance(response.json()["error"]["message"], str)
