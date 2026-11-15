from datetime import date, timedelta
import math

FEATURE_NAMES = ["ndvi_t", "ndvi_lag1", "ndvi_lag2", "ndvi_delta", "evi_t", "rain_sum_16d", "rain_sum_32d", "t2m_mean_16d", "t2m_min_abs_16d", "t2m_max_mean_16d", "thermal_range_16d", "sin_doy", "cos_doy"]


def build_features(vegetation, power):
    """No interpolation across QA gaps, no weather after a composite's availability."""
    weather = {row["date"]: row for row in power}
    vi = {row["date"]: row for row in vegetation}
    result = []
    for row in vegetation:
        start = date.fromisoformat(row["date"])
        as_of = date.fromisoformat(row["period_end"])
        lags = [vi.get((start - timedelta(days=offset)).isoformat()) for offset in (16, 32)]
        if row.get("ndvi") is None or row.get("evi") is None or any(not lag or lag.get("ndvi") is None for lag in lags):
            continue
        window = [weather.get((as_of - timedelta(days=offset)).isoformat()) for offset in range(32)]
        if any(not day or any(day.get(name) is None for name in ("T2M", "T2M_MIN", "T2M_MAX", "PRECTOTCORR")) for day in window):
            continue
        recent = window[:16]
        features = [row["ndvi"], lags[0]["ndvi"], lags[1]["ndvi"], row["ndvi"]-lags[0]["ndvi"], row["evi"], sum(day["PRECTOTCORR"] for day in recent), sum(day["PRECTOTCORR"] for day in window), sum(day["T2M"] for day in recent)/16, min(day["T2M_MIN"] for day in recent), sum(day["T2M_MAX"] for day in recent)/16, sum(day["T2M_MAX"]-day["T2M_MIN"] for day in recent)/16, math.sin(2*math.pi*as_of.timetuple().tm_yday/365.25), math.cos(2*math.pi*as_of.timetuple().tm_yday/365.25)]
        following = vi.get((start+timedelta(days=16)).isoformat())
        result.append({"as_of": as_of.isoformat(), "observation_date": row["date"], "target_date": (as_of+timedelta(days=16)).isoformat(), "features": features, "target": following.get("ndvi") if following else None, "baseline": row["ndvi"]})
    return result
