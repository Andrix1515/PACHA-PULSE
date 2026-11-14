"""Petición HTTP real a FastAPI y NASA, y segunda petición servida desde caché."""

import json
from pathlib import Path
import socket
import subprocess
import sys
import time

import httpx


def main():
    with socket.socket() as check:
        check.bind(("127.0.0.1", 8000))
    root = Path(__file__).resolve().parents[1]
    process = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        with httpx.Client(base_url="http://127.0.0.1:8000", timeout=65) as client:
            for _ in range(50):
                try:
                    if client.get("/api/v1/health").status_code == 200:
                        break
                except httpx.ConnectError:
                    time.sleep(.1)
            params = {"lat": -12.05, "lon": -75.2, "start": "2025-01-01", "end": "2025-01-31"}
            response = client.get("/api/v1/observations/climate", params=params)
            response.raise_for_status()
            body = response.json()
            cached = client.get("/api/v1/observations/climate", params=params)
            cached.raise_for_status()
            assert cached.json()["delivery"] == "cache"
            assert len(body["data"]) == 31
            evidence = {"http_status": response.status_code, "first_delivery": body["delivery"], "second_delivery": cached.json()["delivery"],
                        "request_url": body["request_url"], "retrieved_at": body["retrieved_at"], "days": len(body["data"]),
                        "quality": body["quality"], "product_version": body["product_version"], "summary": body["summary"], "mock": False}
            target = root.parent / "docs/evidence/power-integration.json"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps(evidence, ensure_ascii=True))
    finally:
        process.terminate()
        process.wait(timeout=10)


if __name__ == "__main__":
    main()
