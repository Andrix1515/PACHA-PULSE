export type WorkspaceView = 'monitoring' | 'planning'
export type AppView = 'overview' | 'parcel' | 'monitoring' | 'planning' | 'charts' | 'reports' | 'help'
export interface ClimateReference { lat: number; lon: number; start: string; end: string; saved_example: boolean }
export interface ComparisonInput { rotations: Rotation[]; rainfall_percent: number; habitual_confirmed: boolean; soil: AgriculturalProfile['soil']; water: AgriculturalProfile['water']; climate: ClimateReference | null }
export interface AssistantProposal { kind: 'navigate' | 'update_profile' | 'set_location'; label: string; reason: string; view?: AppView | null; scene?: JourneyContext['scene'] | null; profile?: Partial<AgriculturalProfile> | null; location?: { lat: number; lon: number } | null }
export interface JourneyContext { scene: 'welcome' | 'field' | 'profile' | 'climate' | 'planning' | 'charts' | 'summary' | 'help'; step: number; detail: string; mode: 'guided' | 'explore' }
export interface AssistantContext { journey?: JourneyContext; view: AppView; role: UserRole; profile: AgriculturalProfile; location: { lat: number; lon: number } | null; parcel_area_ha: number | null; climate: ClimateReference | null; comparison: ComparisonInput | null }
export interface ChartSpec { metric: 'rainfall' | 'temperature' | 'rotation_structure'; chart_type: 'bar' | 'line'; aggregation: 'daily' | 'weekly' }
export interface ChartArtifact {
  id: string; spec: ChartSpec; title: string; description: string; source: string; period: string; retrieved_at: string; created_at: string; spatial_resolution: string; quality: 'complete' | 'partial'; status: 'derived'
  rows: { label: string; value: number | null; repeats?: number | null; fallow?: number | null }[]
  series: { key: 'value' | 'repeats' | 'fallow'; label: string; unit: string }[]
  limitations: string[]
}
export interface AssistantReply { message: string; proposals: AssistantProposal[]; next_question: string | null; provider: 'gemini'; model: string; evidence: 'verified_climate' | 'interface_only' | 'climate_unavailable'; charts?: ChartArtifact[]; tool_steps?: string[] }
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
