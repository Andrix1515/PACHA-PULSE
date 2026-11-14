"""Refresh only the authentic Mantaro January 2025 example and its provenance."""

import asyncio
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.clients.power import fetch_raw, normalize


async def main():
    start, end = date(2025, 1, 1), date(2025, 1, 31)
    raw, url = await fetch_raw(-12.05, -75.2, start, end)
    retrieved_at = datetime.now(timezone.utc).isoformat()
    result = normalize(raw, -12.05, -75.2, start, end, retrieved_at, url)
    directory = Path(__file__).resolve().parents[1] / "data" / "demo"
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / "power-mantaro-2025-01.raw.json"
    target.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest = {"source": "NASA POWER", "request_url": url, "retrieved_at": retrieved_at,
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(), "synthetic": False,
                "product_version": result["product_version"], "period": "2025-01-01/2025-01-31",
                "lat": -12.05, "lon": -75.2, "limitations": result["limitations"]}
    (directory / "power-mantaro-2025-01.source.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"result": "ok", "days": len(result["data"]), "quality": result["quality"], "retrieved_at": retrieved_at}, ensure_ascii=True))


if __name__ == "__main__":
    asyncio.run(main())
