"""Cliente NASA POWER diario: no proporciona pronósticos ni medidas de parcela."""

import asyncio
import math
from datetime import date, datetime, timedelta, timezone

import httpx

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = {"T2M": "C", "T2M_MIN": "C", "T2M_MAX": "C", "PRECTOTCORR": "mm/day"}
LIMITATIONS = [
    "Serie histórica NASA POWER basada en productos de rejilla; no es una estación en tu parcela ni un pronóstico.",
    "La rejilla meteorológica MERRA-2 es nominalmente 0,5° × 0,625°; el relieve de montaña puede no quedar representado.",
    "La precipitación de rejilla no equivale a agua aprovechable por un cultivo.",
]


class PowerError(Exception):
    pass


def validate_period(start: date, end: date) -> None:
    if start > end:
        raise ValueError("La fecha inicial debe ser anterior o igual a la final.")
    if (end - start).days > 365:
        raise ValueError("Consulta como máximo 366 días por solicitud.")
    if start < date(1981, 1, 1) or end >= datetime.now(timezone.utc).date():
        raise ValueError("Selecciona fechas históricas desde 1981 y anteriores a hoy.")


def request_params(lat: float, lon: float, start: date, end: date) -> dict:
    return {"parameters": ",".join(PARAMETERS), "community": "AG", "latitude": lat, "longitude": lon,
            "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"), "format": "JSON", "time-standard": "UTC"}


async def fetch_raw(lat: float, lon: float, start: date, end: date, client: httpx.AsyncClient | None = None) -> tuple[dict, str]:
    params = request_params(lat, lon, start, end)
    own_client = client is None
    if own_client:
        client = httpx.AsyncClient(timeout=httpx.Timeout(25, connect=10), headers={"User-Agent": "AgroShift-local-demo/0.2 (NASA POWER educational use)"})
    try:
        for attempt in range(2):
            try:
                response = await client.get(BASE_URL, params=params)
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt == 0:
                        await asyncio.sleep(0.5)
                        continue
                response.raise_for_status()
                return response.json(), str(response.url)
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == 0:
                    await asyncio.sleep(0.5)
                    continue
                raise PowerError("NASA POWER no respondió a tiempo. Reintenta o utiliza el ejemplo histórico guardado.")
            except (httpx.HTTPStatusError, ValueError) as exc:
                raise PowerError("NASA POWER devolvió una respuesta no utilizable. Reintenta más tarde.") from exc
        raise PowerError("NASA POWER no está disponible temporalmente.")
    finally:
        if own_client:
            await client.aclose()


def normalize(raw: dict, lat: float, lon: float, start: date, end: date, retrieved_at: str, request_url: str) -> dict:
    try:
        parameters = raw["properties"]["parameter"]
        fill = raw["header"].get("fill_value", -999)
        version = raw["header"]["api"]["version"]
        for key, unit in PARAMETERS.items():
            if raw["parameters"][key]["units"] != unit or not isinstance(parameters[key], dict):
                raise PowerError("Las unidades o parámetros de NASA POWER cambiaron; es necesario revisarlos.")
        data = []
        day = start
        while day <= end:
            row = {"date": day.isoformat()}
            for key in PARAMETERS:
                value = parameters[key].get(day.strftime("%Y%m%d"))
                if not isinstance(value, (int, float)) or not math.isfinite(value) or value == fill or value == -999:
                    value = None
                if key == "PRECTOTCORR" and value is not None and value < 0:
                    value = None
                row[key] = value
            data.append(row)
            day += timedelta(days=1)
        source = "NASA POWER · MERRA-2"
        period = f"{start.isoformat()}/{end.isoformat()}"
        spatial_resolution = "MERRA-2 meteorología: nominal 0,5° × 0,625°; no es resolución de parcela"
        def metric(value, unit, quality, limitations=None):
            return {"value": value, "unit": unit, "status": "derived" if value is not None else "unavailable",
                    "source": source, "observed_at": period, "retrieved_at": retrieved_at,
                    "spatial_resolution": spatial_resolution, "quality": quality, "limitations": limitations or LIMITATIONS}
        temperatures = [row["T2M"] for row in data if row["T2M"] is not None]
        rain = [row["PRECTOTCORR"] for row in data if row["PRECTOTCORR"] is not None]
        return {
            "lat": lat, "lon": lon, "start": start.isoformat(), "end": end.isoformat(), "source": source,
            "request_url": request_url, "product_version": version, "retrieved_at": retrieved_at,
            "spatial_resolution": spatial_resolution, "limitations": LIMITATIONS,
            "status": "observed" if temperatures or rain else "unavailable",
            "quality": "complete" if all(row[key] is not None for row in data for key in PARAMETERS) else "partial",
            "variables": {key: {"unit": unit, "source": source, "status": "observed", "missing_value": None} for key, unit in PARAMETERS.items()},
            "data": data,
            "summary": {
                "temperature_mean": metric(round(sum(temperatures) / len(temperatures), 2) if temperatures else None, "°C", "complete" if len(temperatures) == len(data) else "partial"),
                "rainfall_total": metric(round(sum(rain), 2) if len(rain) == len(data) else None, "mm", "complete" if len(rain) == len(data) else "incomplete"),
            },
        }
    except (KeyError, TypeError, AttributeError) as exc:
        raise PowerError("El formato recibido de NASA POWER no es compatible.") from exc
