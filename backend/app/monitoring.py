"""Descriptive monitoring; missing days are not dry days and NDVI is not diagnosis."""
from datetime import date,datetime,timedelta,timezone
import statistics
from app.ingestion.store import ObservationStore, POWER
from app.providers.modis import MODISService
from app.clients.modis import LIMITATIONS
from app.data.climate_cache import ClimateCache,cache_key


def metric(value,unit,source,period,retrieved=None,limitations=None):
    return {"value":value,"unit":unit,"status":"derived" if value is not None else "unavailable","source":source,"observed_at":period,"retrieved_at":retrieved,"spatial_resolution":"Historical grid point; not a field sensor","quality":"descriptive" if value is not None else "unavailable","limitations":limitations or []}


async def analyze(lat,lon,start,end,store=None):
    store=store or ObservationStore()
    rows=store.rows(POWER,lat,lon,start,end)
    if not rows:
        observation=ClimateCache().get(cache_key(lat,lon,start,end))
        if observation:
            rows=observation["data"]
        elif (lat,lon)==(-12.05,-75.2):
            from app.api.routes.observations import climate_demo
            rows=[r for r in climate_demo()["data"] if str(start)<=r["date"]<=str(end)]
    days={r["date"]:r for r in rows}
    ordered=[days.get((start+timedelta(days=i)).isoformat()) for i in range((end-start).days+1)]
    rain=[r["PRECTOTCORR"] for r in rows if r.get("PRECTOTCORR") is not None]
    temps=[r["T2M"] for r in rows if r.get("T2M") is not None]
    minimum=[r["T2M_MIN"] for r in rows if r.get("T2M_MIN") is not None]
    dry=longest=0
    for row in ordered:
        dry=dry+1 if row and row.get("PRECTOTCORR") is not None and row["PRECTOTCORR"]<1 else 0
        longest=max(longest,dry)
    cutoff=statistics.quantiles(temps,n=10,method="inclusive")[8] if len(temps)>=10 else None
    vegetation=await MODISService().series(lat,lon,start,end,store=store)
    valid=[r for r in vegetation["data"] if r["ndvi"] is not None]
    previous=[r["ndvi"] for r in valid[:-1]]
    sd=statistics.pstdev(previous) if len(previous)>=3 else 0
    z=(valid[-1]["ndvi"]-statistics.mean(previous))/sd if sd>0 else None
    delta=valid[-1]["ndvi"]-valid[-2]["ndvi"] if len(valid)>1 and (date.fromisoformat(valid[-1]["date"])-date.fromisoformat(valid[-2]["date"])).days==16 else None
    period=f"{start}/{end}"
    retrieved=max((r.get("retrieved_at", "") for r in rows),default="") or vegetation.get("retrieved_at")
    wrap=lambda v,u,s:metric(v,u,s,period,retrieved,limitations=["Describes only this selected historical period; no pest, soil-health or yield diagnosis."])
    return {"lat":lat,"lon":lon,"start":str(start),"end":str(end),"status":"derived" if rows or valid else "unavailable","metrics":{"frost_watch_days":wrap(sum(t<2 for t in minimum) if minimum else None,"days","NASA POWER daily minimum below 2 C"),"hot_days_above_period_p90":wrap(sum(t>cutoff for t in temps) if cutoff is not None else None,"days","NASA POWER selected-period 90th percentile"),"longest_observed_dry_spell":wrap(longest if rain else None,"days","NASA POWER rain <1 mm/day; missing days break the run"),"rainfall_concentration":wrap(max(rain)/sum(rain) if rain and sum(rain)>0 else None,"fraction","Maximum daily rainfall / available-period total"),"latest_ndvi_z_score":wrap(z,"standard deviations","Latest MODIS NDVI vs preceding valid composites within selected period"),"latest_ndvi_delta":wrap(delta,"NDVI ratio","Adjacent 16-day MODIS composites")},"coverage":{"expected_weather_days":len(ordered),"available_weather_days":len(rows),"complete_weather_days":sum(bool(r) and all(r.get(k) is not None for k in ('T2M','T2M_MIN','T2M_MAX','PRECTOTCORR')) for r in ordered)},"limitations":LIMITATIONS+["Thresholds are descriptive screening conventions, not calibrated local alerts.","A decline greater than 0.12 is a change to investigate, not evidence of a specific cause."]}
