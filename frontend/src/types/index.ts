export type WorkspaceView = 'monitoring' | 'planning'
export type AppView = 'overview' | 'parcel' | 'crops' | 'monitoring' | 'planning' | 'charts' | 'reports' | 'help'
export interface ClimateReference { lat: number; lon: number; start: string; end: string; saved_example: boolean }
export interface ComparisonInput {
  economic_inputs?: EconomicInputs
  rotations: Rotation[]
  rainfall_percent: number
  temperature_delta_c?: number
  habitual_confirmed: boolean
  soil: AgriculturalProfile['soil']
  water: AgriculturalProfile['water']
  climate: ClimateReference | null
  start_month?: number
  hemisphere?: 'southern' | 'northern' | 'equatorial'
}

export interface AssistantProposal {
  kind: 'navigate' | 'update_profile' | 'set_location'
  label: string
  reason: string
  view?: AppView | null
  scene?: JourneyContext['scene'] | null
  profile?: Partial<AgriculturalProfile> | null
  location?: { lat: number; lon: number } | null
}

export interface JourneyContext { scene: 'welcome' | 'field' | 'profile' | 'evidence' | 'crops' | 'climate' | 'planning' | 'charts' | 'summary' | 'help'; step: number; detail: string; mode: 'guided' | 'explore' }

export interface AssistantContext {
  journey?: JourneyContext
  view: AppView
  role: UserRole
  profile: AgriculturalProfile
  location: { lat: number; lon: number } | null
  parcel_area_ha: number | null
  climate: ClimateReference | null
  comparison: ComparisonInput | null
  country_code?: string | null
  country_name?: string | null
  region?: string | null
}

export interface ChartSpec { metric: 'rainfall' | 'temperature' | 'rotation_structure'; chart_type: 'bar' | 'line'; aggregation: 'daily' | 'weekly' }
export interface ChartArtifact {
  id: string; spec: ChartSpec; title: string; description: string; source: string; period: string; retrieved_at: string; created_at: string; spatial_resolution: string; quality: 'complete' | 'partial'; status: 'derived'
  rows: { label: string; value: number | null; repeats?: number | null; fallow?: number | null }[]
  series: { key: 'value' | 'repeats' | 'fallow'; label: string; unit: string }[]
  limitations: string[]
}

export interface AssistantReply {
  message: string
  proposals: AssistantProposal[]
  next_question: string | null
  provider: 'gemini'
  model: string
  evidence: 'verified_climate' | 'interface_only' | 'climate_unavailable'
  charts?: ChartArtifact[]
  tool_steps?: string[]
}

export type UserRole = 'grower' | 'agronomist'

export interface Location {
  lat: number
  lon: number
  source: 'manual' | 'map' | 'parcel'
}

export interface LocationInfo {
  lat: number
  lon: number
  country_code: string
  country_name: string
  region: string
  subregion?: string | null
  hemisphere: 'southern' | 'northern' | 'equatorial'
  elevation_m: number | null
  slope_percent?: number | null
  climate_zone: string
  provenance: Provenance
}

export interface ProviderOverview {
  id: string
  name: string
  organization: string
  source_type: string
  coverage: string
  is_active_for_location: boolean
  status: 'active' | 'degraded' | 'unavailable' | 'disabled' | 'not_applicable' |
          'configured' | 'checking' | 'connected' | 'data_available' | 'partial_data' |
          'empty_response' | 'timeout' | 'not_configured' | 'outside_coverage'
  spatial_resolution: string
  temporal_resolution: string
  documentation_url: string
  last_error?: string | null
  enabled: boolean
}

export interface LocationProvidersReport {
  lat: number
  lon: number
  country_code: string
  country_name: string
  active_providers_count: number
  providers: ProviderOverview[]
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

export interface Provenance {
  source: string
  provider_id: string
  retrieved_at: string
  spatial_resolution: string
  data_quality: string
  status: string
  limitations: string[]
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

export interface SoilPropertyLayer {
  depth_range: string
  mean_value: number | null
  unit: string
  status: string
}

export interface SoilProperty {
  name: string
  description: string
  unit: string
  layers: SoilPropertyLayer[]
  profile_mean: number | null
  status: string
}

export interface SoilProfile {
  lat: number
  lon: number
  ph_h2o: SoilProperty | null
  soil_organic_carbon: SoilProperty | null
  total_nitrogen: SoilProperty | null
  texture_clay_percent: SoilProperty | null
  texture_sand_percent: SoilProperty | null
  texture_silt_percent: SoilProperty | null
  bulk_density: SoilProperty | null
  soil_texture_class: string
  estimated_soil_depth_cm: number | null
  drainage_class: string
  provenance: Provenance
  warnings: string[]
}

export interface Crop {
  id: string
  common_name: string
  scientific_name: string
  spanish_name: string
  alternative_names: string[]
  botanical_family: string
  category: 'cereal' | 'legume' | 'tuber' | 'vegetable' | 'oilseed' | 'forage' | 'cover_crop' | 'pseudo_cereal' | 'fallow'
  requirements: {
    temp_min_c: number | null
    temp_opt_min_c: number | null
    temp_opt_max_c: number | null
    temp_max_c: number | null
    frost_tolerance: string
    water_demand_mm_min: number | null
    water_demand_mm_max: number | null
    ph_min: number | null
    ph_opt_min: number | null
    ph_opt_max: number | null
    ph_max: number | null
    tolerated_textures: string[]
    salinity_tolerance: string
    altitude_min_m: number | null
    altitude_max_m: number | null
  }
  root_depth: 'shallow' | 'medium' | 'deep' | 'not_applicable'
  cycle_duration_days_min: number | null
  cycle_duration_days_max: number | null
  n_demand: 'low' | 'medium' | 'high' | 'restorative' | 'none'
  p_demand: 'low' | 'medium' | 'high' | 'none'
  k_demand: 'low' | 'medium' | 'high' | 'none'
  is_nitrogen_fixer: boolean
  biological_n_fixation_kg_ha: number | null
  soil_cover_quality: 'poor' | 'moderate' | 'good' | 'excellent'
  pest_susceptibilities: string[]
  rotation_good_predecessors: string[]
  rotation_bad_predecessors: string[]
  sources: string[]
}

export interface CandidateEvidence {
  factor: string
  status: 'compatible' | 'marginal' | 'incompatible' | 'unknown' | 'not_applicable'
  crop_requirement: string
  field_condition: string
  details: string
}

export interface CandidateCrop {
  crop: Crop
  suitability_category: 'suitable' | 'marginal' | 'unsuitable' | 'insufficient_data'
  overall_score: number
  confidence_level: 'high' | 'medium' | 'low' | 'exploratory'
  limiting_factors: string[]
  advantages: string[]
  evidence: CandidateEvidence[]
  data_gaps: string[]
}

export interface SequenceCalendarStep {
  campaign_index: number
  crop_id: string
  crop_name: string
  estimated_duration_days: number
  season_label: string
  temporal_fit: 'viable' | 'tight' | 'exceeds_season' | 'fallow_period'
}

export interface SequenceAgronomicAssessment {
  pesticide_dependency_reduction?: 'high' | 'moderate' | 'low'
  ipm_reduction_limitations?: string
  synthetic_fertilizer_offset_kg_n_ha?: null
  family_repetition_count: number
  solanaceae_repetition: boolean
  poaceae_repetition: boolean
  nitrogen_balance_score: number
  estimated_legume_n_fixation_kg_ha: number
  root_depth_stratification: string
  soil_cover_rating: string
  pest_disease_risk_level: 'low' | 'moderate' | 'high' | 'critical'
  calendar_viability: 'viable' | 'tight' | 'conflict' | 'unverified'
  sequence_score: number
  critical_warnings: string[]
  agronomic_strengths: string[]
  calendar_steps: SequenceCalendarStep[]
}

export type CropId = string
export interface Rotation { name: string; crops: CropId[] }

export interface RotationResult {
  name: string
  labels: string[]
  crops: CropId[]
  baseline: boolean
  distinct_crops: { value: number; unit: string; status: string; source: string }
  consecutive_repetitions: { value: number; unit: string }
  fallow_campaigns: { value: number; unit: string }
  tradeoffs: string[]
  assessment: string
  water_demand: null
  expected_yield: null
  profitability: null
  agronomic_assessment?: SequenceAgronomicAssessment | null
}

export interface CompareResponse {
  results: RotationResult[]
  scenario_rainfall: Metric
  baseline_rainfall: Metric | null
  rainfall_percent: number
  habitual_confirmed: boolean
  warnings: string[]
  method: string
}

export interface TerrainInfo {
  lat: number
  lon: number
  elevation_m: number | null
  elevation_min_m: number | null
  elevation_max_m: number | null
  relief_m: number | null
  slope_percent: number | null
  slope_degrees: number | null
  aspect: string | null
  dem_source: string
  provenance: Provenance
  warnings: string[]
}


export interface VegetationIngestionJob {
 id:number;status:'queued'|'running'|'complete'|'partial'|'failed';requested_at:string;finished_at:string|null;error:string|null;completed_batches:number;total_batches:number
}
export interface VegetationResponse {
 ingestion_job?:VegetationIngestionJob|null;
 lat:number;lon:number;start:string;end:string;source:string;product_version:string;status:'observed'|'unavailable';delivery:string;spatial_resolution:string;retrieved_at:string|null;quality:string;limitations:string[];
 data:{date:string;period_end:string;ndvi:number|null;evi:number|null;pixel_reliability:number|null;quality:string;retrieved_at:string;request_url:string}[];
 summary:{ndvi_mean:number|null;ndvi_min:number|null;ndvi_max:number|null;valid_composites_count:number;cloudy_composites_count:number}
}
export interface MonitoringAnalysisResponse {status:string;metrics:Record<string,{value:number|null;unit:string;source:string}>;coverage:{expected_weather_days:number;available_weather_days:number;complete_weather_days:number};limitations:string[]}
export interface NdviPredictionResponse {lat?:number;lon?:number;status:string;reason?:string;target_date?:string;predicted_ndvi?:{value:number;forecast_horizon:string;model_version:string};update_state?:string|null;ingestion_sync?:unknown;adaptive_ml?:unknown;model_metadata?:unknown;limitations:string[]}

export interface EconomicInputs {area_ha:number;cost_per_ha:number;expected_yield_t_ha:number;price_per_ton:number;currency:string;verified_n_credit_kg_ha?:number;price_per_kg_n?:number}
