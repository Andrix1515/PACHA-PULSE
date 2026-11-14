"""Caché SQLite local de respuestas normalizadas; conserva fecha de descarga."""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "cache" / "observations.sqlite"


class ClimateCache:
    def __init__(self, path: Path = DEFAULT_PATH):
        self.path = path

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=5)
        connection.execute("CREATE TABLE IF NOT EXISTS climate_cache (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, stored_at TEXT NOT NULL)")
        return connection

    def get(self, key: str) -> dict | None:
        with self.connect() as connection:
            row = connection.execute("SELECT payload, stored_at FROM climate_cache WHERE cache_key = ?", (key,)).fetchone()
        if not row or datetime.fromisoformat(row[1]) < datetime.now(timezone.utc) - timedelta(days=7):
            return None
        return json.loads(row[0])

    def put(self, key: str, payload: dict):
        with self.connect() as connection:
            connection.execute("INSERT OR REPLACE INTO climate_cache VALUES (?, ?, ?)", (key, json.dumps(payload, allow_nan=False), datetime.now(timezone.utc).isoformat()))


def cache_key(lat, lon, start, end):
    return f"POWER:daily:UTC:T2M,T2M_MIN,T2M_MAX,PRECTOTCORR:schema1:{lat}:{lon}:{start}:{end}"
