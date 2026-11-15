import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from app.data.climate_cache import DEFAULT_PATH

POWER = "NASA_POWER"
MODIS = "NASA_MODIS_MOD13Q1"


class IngestionQueueFull(ValueError):
    pass


def cell_key(lat, lon):
    # Query identity, not a claim to know the satellite pixel's footprint.
    return f"{float(lat):.8f}:{float(lon):.8f}"


class ObservationStore:
    def __init__(self, path=None):
        self.path = Path(path or DEFAULT_PATH)

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS observations_timeseries (
            source TEXT NOT NULL, product_version TEXT NOT NULL, cell_id TEXT NOT NULL,
            lat REAL NOT NULL, lon REAL NOT NULL, observation_date TEXT NOT NULL,
            metrics_json TEXT NOT NULL, quality TEXT NOT NULL, retrieved_at TEXT NOT NULL,
            PRIMARY KEY(source,product_version,cell_id,observation_date));
        CREATE TABLE IF NOT EXISTS ingestion_runs (
            run_id TEXT PRIMARY KEY, started_at TEXT, finished_at TEXT, location_key TEXT,
            power_new_rows INTEGER, modis_new_rows INTEGER, retrained_model_version TEXT,
            status TEXT, notes TEXT);
        CREATE TABLE IF NOT EXISTS ingestion_jobs (
            id INTEGER PRIMARY KEY, cell_id TEXT NOT NULL, lat REAL, lon REAL,
            status TEXT NOT NULL, requested_at TEXT NOT NULL, finished_at TEXT, error TEXT);
        CREATE TABLE IF NOT EXISTS modis_completed_batches (
            cell_id TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
            finished_at TEXT NOT NULL, PRIMARY KEY(cell_id,start_date,end_date));
        """)
        # Additive migration for local databases created before period jobs existed.
        conn.execute("BEGIN IMMEDIATE")
        columns = {row[1] for row in conn.execute("PRAGMA table_info(ingestion_jobs)")}
        for name, definition in {"kind": "TEXT NOT NULL DEFAULT 'full'", "start_date": "TEXT", "end_date": "TEXT", "completed_batches": "INTEGER NOT NULL DEFAULT 0", "total_batches": "INTEGER NOT NULL DEFAULT 0"}.items():
            if name not in columns:
                conn.execute(f"ALTER TABLE ingestion_jobs ADD COLUMN {name} {definition}")
        conn.commit()
        return conn

    def rows(self, source, lat, lon, start="0001-01-01", end="9999-12-31"):
        with self.connect() as conn:
            rows = conn.execute("SELECT metrics_json FROM observations_timeseries WHERE source=? AND cell_id=? AND observation_date BETWEEN ? AND ? ORDER BY observation_date", (source, cell_key(lat, lon), str(start), str(end))).fetchall()
        return [json.loads(row[0]) for row in rows]

    def put(self, source, version, lat, lon, rows):
        inserted = 0
        with self.connect() as conn:
            for row in rows:
                result = conn.execute("INSERT OR IGNORE INTO observations_timeseries VALUES (?,?,?,?,?,?,?,?,?)", (source, version, cell_key(lat, lon), lat, lon, row["date"], json.dumps(row, allow_nan=False), row.get("quality", "partial"), row["retrieved_at"]))
                inserted += result.rowcount
        return inserted

    def latest(self, source, lat, lon):
        rows = self.rows(source, lat, lon)
        return rows[-1]["date"] if rows else None

    def enqueue(self, lat, lon, *, start=None, end=None, kind="full"):
        if kind not in ("full", "modis_period") or (kind == "modis_period" and (start is None or end is None)):
            raise ValueError("A MODIS period update needs both dates.")
        start, end = (str(start), str(end)) if kind == "modis_period" else (None, None)
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            existing = conn.execute("SELECT id FROM ingestion_jobs WHERE cell_id=? AND kind=? AND start_date IS ? AND end_date IS ? AND status IN ('queued','running')", (cell_key(lat, lon), kind, start, end)).fetchone()
            if existing:
                return existing[0]
            if conn.execute("SELECT COUNT(*) FROM ingestion_jobs WHERE status IN ('queued','running')").fetchone()[0] >= 20:
                raise IngestionQueueFull("The local update queue is full. Try later.")
            return conn.execute("INSERT INTO ingestion_jobs(cell_id,lat,lon,status,requested_at,kind,start_date,end_date) VALUES (?,?,?,'queued',?,?,?,?)", (cell_key(lat, lon), lat, lon, datetime.now(timezone.utc).isoformat(), kind, start, end)).lastrowid

    def period_job(self, lat, lon, start, end):
        with self.connect() as conn:
            row = conn.execute("SELECT id,status,requested_at,finished_at,error,completed_batches,total_batches FROM ingestion_jobs WHERE cell_id=? AND kind='modis_period' AND start_date=? AND end_date=? ORDER BY id DESC LIMIT 1", (cell_key(lat, lon), str(start), str(end))).fetchone()
        return dict(row) if row else None

    def sync_status(self, lat, lon):
        with self.connect() as conn:
            run = conn.execute("SELECT * FROM ingestion_runs WHERE location_key=? ORDER BY started_at DESC LIMIT 1", (cell_key(lat, lon),)).fetchone()
            job = conn.execute("SELECT id,status,error,requested_at FROM ingestion_jobs WHERE cell_id=? ORDER BY id DESC LIMIT 1", (cell_key(lat, lon),)).fetchone()
        return {"last_power_date": self.latest(POWER, lat, lon), "last_modis_date": self.latest(MODIS, lat, lon), "last_sync_at": run["finished_at"] if run else None, "latest_job": dict(job) if job else None}
