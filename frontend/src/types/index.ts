export type WorkspaceView = 'monitoring' | 'planning'
export type UserRole = 'grower' | 'agronomist'
export interface Location {
  lat: number
  lon: number
  source: 'manual' | 'map' | 'parcel'
}
export interface AgriculturalProfile {
  name: string
  crop: string
  areaHa: number | null
  soil: 'unknown' | 'sandy' | 'loamy' | 'clayey' | 'other'
  water: 'unknown' | 'rainfed' | 'irrigated' | 'mixed'
  previousRotation: string
}
export interface HealthResponse {
  status: 'ok'
  service: 'agroshift-api'
  version: string
}

export interface Metric {
  value: number | null
  unit: string
  status: 'observed' | 'derived' | 'scenario' | 'unavailable'
  source: string
  observed_at: string
  retrieved_at: string
  spatial_resolution: string
  quality: string
  limitations: string[]
}
export interface ClimateResponse {
  lat: number
  lon: number
  start: string
  end: string
  source: string
  request_url: string
  product_version: string
  retrieved_at: string
  spatial_resolution: string
  limitations: string[]
  status: 'observed' | 'unavailable'
  quality: string
  delivery: 'live' | 'cache' | 'saved_observation'
  variables: Record<string, { unit: string; source: string; status: string; missing_value: null }>
  data: { date: string; T2M: number | null; T2M_MIN: number | null; T2M_MAX: number | null; PRECTOTCORR: number | null }[]
  summary: { temperature_mean: Metric; rainfall_total: Metric }
}

export type CropId = 'maize' | 'wheat' | 'potato' | 'bean' | 'lentil' | 'quinoa' | 'fallow'
export interface Rotation { name: string; crops: CropId[] }
export interface CompareResponse {
  results: {
    name: string; labels: string[]; crops: CropId[]; baseline: boolean
    distinct_crops: { value: number; unit: string; status: string; source: string }
    consecutive_repetitions: { value: number; unit: string }
    fallow_campaigns: { value: number; unit: string }
    tradeoffs: string[]; assessment: string; water_demand: null; expected_yield: null; profitability: null
  }[]
  scenario_rainfall: Metric
  baseline_rainfall: Metric | null
  rainfall_percent: number
  habitual_confirmed: boolean
  warnings: string[]
  method: string
}
