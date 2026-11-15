import type {
  CandidateCrop,
  ClimateResponse,
  Crop,
  HealthResponse,
  Location,
  LocationInfo,
  LocationProvidersReport,
  SoilProfile,
  TerrainInfo,
} from '../types'

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('The API could not be reached.')
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || !('status' in body) || body.status !== 'ok' ||
      !('service' in body) || body.service !== 'agroshift-api' || !('version' in body) || typeof body.version !== 'string') {
    throw new Error('The API returned an unexpected response.')
  }
  return body as HealthResponse
}

export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(65000)]) : AbortSignal.timeout(65000), headers: { Accept: 'application/json', ...options.headers } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error?.message || 'The request could not be completed. Check the data or try again.')
  return body as T
}

export function getClimate(location: Location, start: string, end: string, signal: AbortSignal): Promise<ClimateResponse> {
  const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon), start, end })
  return requestJson(`/observations/climate?${params}`, { signal })
}

export function getLocationInfo(lat: number, lon: number, signal?: AbortSignal): Promise<LocationInfo> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  return requestJson(`/location/inspect?${params}`, { signal })
}

export function getLocationProviders(lat: number, lon: number, countryCode?: string, signal?: AbortSignal): Promise<LocationProvidersReport> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  if (countryCode) params.set('country_code', countryCode)
  return requestJson(`/location/providers?${params}`, { signal })
}

export function getSoilProfile(lat: number, lon: number, signal?: AbortSignal): Promise<SoilProfile> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  return requestJson(`/observations/soil?${params}`, { signal })
}

export function getCrops(category?: string, search?: string, signal?: AbortSignal): Promise<Crop[]> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (search) params.set('search', search)
  return requestJson(`/crops?${params}`, { signal })
}

export function getCandidateCrops(
  lat: number,
  lon: number,
  water?: string,
  start?: string,
  end?: string,
  signal?: AbortSignal,
): Promise<CandidateCrop[]> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  if (water) params.set('water', water)
  if (start && end) {
    params.set('start', start)
    params.set('end', end)
  }
  return requestJson(`/crops/candidates?${params}`, { signal })
}

export function getTerrain(
  lat: number,
  lon: number,
  polygonLats?: string,
  polygonLons?: string,
  signal?: AbortSignal,
): Promise<TerrainInfo> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  if (polygonLats && polygonLons) {
    params.set('polygon_lats', polygonLats)
    params.set('polygon_lons', polygonLons)
  }
  return requestJson(`/location/terrain?${params}`, { signal })
}

export function compareCrops(cropIds: string[], signal?: AbortSignal): Promise<{
  compared_crops: {
    crop: Crop
    advantages: string[]
    disadvantages: string[]
    best_predecessors: string[]
    rotational_warnings: string[]
  }[]
  tradeoffs_summary: string[]
}> {
  return requestJson('/crops/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crop_ids: cropIds }),
    signal,
  })
}


export function fetchVegetation(location: Location,start:string,end:string,refresh=false,signal?:AbortSignal):Promise<import('../types').VegetationResponse> {return requestJson(`/observations/vegetation?${new URLSearchParams({lat:String(location.lat),lon:String(location.lon),start,end,refresh:String(refresh)})}`,{signal})}
export function analyzeMonitoring(location:Location,start:string,end:string,signal?:AbortSignal):Promise<import('../types').MonitoringAnalysisResponse> {return requestJson('/monitoring/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:location.lat,lon:location.lon,start,end}),signal})}
export function predictNdvi(location:Location,trigger_update=false,signal?:AbortSignal):Promise<import('../types').NdviPredictionResponse> {return requestJson('/ml/predict-ndvi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:location.lat,lon:location.lon,trigger_update}),signal})}
