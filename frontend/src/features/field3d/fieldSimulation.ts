import type { ClimateResponse } from '../../types'

export interface CropSimSpec {
  id: string
  name: string
  cycleDaysMin: number
  cycleDaysMax: number
  defaultDays: number
  tempOptMinC: number
  tempOptMaxC: number
  tempMinC: number
  tempMaxC: number
  waterMinMm: number
  waterMaxMm: number
  frostTolerance: 'sensitive' | 'moderately_tolerant' | 'tolerant'
  nFixer: boolean
  nFixationKgHa: number
  source: string
}

export const CROP_SIM_SPECS: Record<string, CropSimSpec> = {
  maize: { id: 'maize', name: 'Maize', cycleDaysMin: 100, cycleDaysMax: 180, defaultDays: 135, tempOptMinC: 18, tempOptMaxC: 28, tempMinC: 10, tempMaxC: 36, waterMinMm: 450, waterMaxMm: 800, frostTolerance: 'sensitive', nFixer: false, nFixationKgHa: 0, source: 'FAO-56 & FAO ECOCROP (Zea mays)' },
  bean: { id: 'bean', name: 'Bean', cycleDaysMin: 75, cycleDaysMax: 120, defaultDays: 95, tempOptMinC: 15, tempOptMaxC: 23, tempMinC: 10, tempMaxC: 30, waterMinMm: 300, waterMaxMm: 500, frostTolerance: 'sensitive', nFixer: true, nFixationKgHa: 60, source: 'FAO Feedipedia & CIAT (Phaseolus vulgaris)' },
  potato: { id: 'potato', name: 'Potato', cycleDaysMin: 90, cycleDaysMax: 160, defaultDays: 125, tempOptMinC: 15, tempOptMaxC: 20, tempMinC: 7, tempMaxC: 26, waterMinMm: 400, waterMaxMm: 700, frostTolerance: 'sensitive', nFixer: false, nFixationKgHa: 0, source: 'FAO / CIP Potato Reference' },
  wheat: { id: 'wheat', name: 'Wheat', cycleDaysMin: 110, cycleDaysMax: 160, defaultDays: 130, tempOptMinC: 15, tempOptMaxC: 22, tempMinC: 4, tempMaxC: 32, waterMinMm: 350, waterMaxMm: 600, frostTolerance: 'tolerant', nFixer: false, nFixationKgHa: 0, source: 'FAO-56 & CIMMYT Wheat Program' },
  quinoa: { id: 'quinoa', name: 'Quinoa', cycleDaysMin: 120, cycleDaysMax: 180, defaultDays: 150, tempOptMinC: 15, tempOptMaxC: 20, tempMinC: -4, tempMaxC: 28, waterMinMm: 250, waterMaxMm: 450, frostTolerance: 'tolerant', nFixer: false, nFixationKgHa: 0, source: 'FAO Quinoa Reference (Chenopodium quinoa)' },
  lentil: { id: 'lentil', name: 'Lentil', cycleDaysMin: 85, cycleDaysMax: 130, defaultDays: 105, tempOptMinC: 15, tempOptMaxC: 24, tempMinC: 5, tempMaxC: 30, waterMinMm: 250, waterMaxMm: 450, frostTolerance: 'moderately_tolerant', nFixer: true, nFixationKgHa: 55, source: 'FAO-56 & ICARDA (Lens culinaris)' },
  soybean: { id: 'soybean', name: 'Soybean', cycleDaysMin: 95, cycleDaysMax: 150, defaultDays: 120, tempOptMinC: 20, tempOptMaxC: 30, tempMinC: 10, tempMaxC: 36, waterMinMm: 450, waterMaxMm: 700, frostTolerance: 'sensitive', nFixer: true, nFixationKgHa: 80, source: 'FAO-56 (Glycine max)' },
  fallow: { id: 'fallow', name: 'Fallow / rest', cycleDaysMin: 30, cycleDaysMax: 180, defaultDays: 90, tempOptMinC: 0, tempOptMaxC: 40, tempMinC: -15, tempMaxC: 45, waterMinMm: 0, waterMaxMm: 0, frostTolerance: 'tolerant', nFixer: false, nFixationKgHa: 0, source: 'Resting campaign reference' },
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface ParcelSimulationSummary {
  spec: CropSimSpec
  totalAreaHa: number
  allocatedAreaHa: number
  activeZoneCount: number
  coveragePercent: number
  durationDays: number
  stageDay: number
  startMonth: number
  harvestMonth: number
  activeMonthLabel: string
  durationStatus: 'within_catalog' | 'short_cycle' | 'long_cycle' | 'resting'
  thermalStatus: 'within_band' | 'cool_watch' | 'warm_watch' | 'frost_watch' | 'unknown'
  waterStatus: 'within_band' | 'deficit_watch' | 'surplus_watch' | 'unknown'
  observedMeanTempC: number | null
  observedMinTempC: number | null
  projectedCycleRainMm: number | null
  interceptedRainM3: number | null
  estimatedNFixationKg: number | null
  growerText: string
  agronomistText: string
}

export function getCropSimSpec(cropId: string, label?: string): CropSimSpec {
  const key = cropId.toLowerCase()
  if (CROP_SIM_SPECS[key]) return CROP_SIM_SPECS[key]
  return {
    id: key,
    name: label || cropId,
    cycleDaysMin: 90,
    cycleDaysMax: 150,
    defaultDays: 120,
    tempOptMinC: 15,
    tempOptMaxC: 25,
    tempMinC: 7,
    tempMaxC: 32,
    waterMinMm: 350,
    waterMaxMm: 600,
    frostTolerance: 'moderately_tolerant',
    nFixer: false,
    nFixationKgHa: 0,
    source: 'FAO-56 general reference',
  }
}

export function simulateParcelCrop(params: {
  cropId: string
  cropLabel?: string
  totalAreaHa: number
  allocatedAreaHa: number
  activeZoneCount: number
  durationDays: number
  startMonth: number
  stageIndex: number
  climate: ClimateResponse | null
}): ParcelSimulationSummary {
  const { cropId, cropLabel, totalAreaHa, allocatedAreaHa, activeZoneCount, durationDays, startMonth, stageIndex, climate } = params
  const spec = getCropSimSpec(cropId, cropLabel)
  const coveragePercent = totalAreaHa > 0 ? Math.round((allocatedAreaHa / totalAreaHa) * 100) : 0
  const stageFractions = [0.05, 0.22, 0.55, 0.80, 1.0]
  const fraction = stageFractions[Math.max(0, Math.min(4, stageIndex))] ?? 0.55
  const stageDay = Math.max(1, Math.round(durationDays * fraction))
  const elapsedMonths = Math.floor((stageDay - 1) / 30.4)
  const totalMonths = Math.max(1, Math.round(durationDays / 30.4))
  const activeMonthIdx = ((startMonth - 1 + elapsedMonths) % 12 + 12) % 12
  const harvestMonthIdx = ((startMonth - 1 + totalMonths) % 12 + 12) % 12
  const activeMonthLabel = `${SHORT_MONTHS[startMonth - 1]} → ${SHORT_MONTHS[harvestMonthIdx]} (now ${SHORT_MONTHS[activeMonthIdx]}, day ${stageDay}/${durationDays})`

  const durationStatus: ParcelSimulationSummary['durationStatus'] =
    spec.id === 'fallow'
      ? 'resting'
      : durationDays < spec.cycleDaysMin
      ? 'short_cycle'
      : durationDays > spec.cycleDaysMax
      ? 'long_cycle'
      : 'within_catalog'

  const observedMeanTempC = climate?.summary.temperature_mean.value ?? null
  const minTemps = climate?.data.map((d) => d.T2M_MIN).filter((v): v is number => v !== null && Number.isFinite(v)) ?? []
  const observedMinTempC = minTemps.length > 0 ? Math.min(...minTemps) : null
  const obsDays = climate?.data.length || 0
  const obsRainTotal = climate?.summary.rainfall_total.value ?? null
  const dailyRainRate = obsDays > 0 && obsRainTotal !== null ? obsRainTotal / obsDays : null
  const projectedCycleRainMm = dailyRainRate !== null ? +(dailyRainRate * durationDays).toFixed(1) : null
  const interceptedRainM3 = projectedCycleRainMm !== null ? Math.round(projectedCycleRainMm * allocatedAreaHa * 10) : null
  const estimatedNFixationKg = spec.nFixer ? +(spec.nFixationKgHa * allocatedAreaHa).toFixed(1) : null

  let thermalStatus: ParcelSimulationSummary['thermalStatus'] = 'unknown'
  if (spec.id !== 'fallow' && observedMeanTempC !== null) {
    if (observedMinTempC !== null && observedMinTempC < 2 && spec.frostTolerance === 'sensitive') {
      thermalStatus = 'frost_watch'
    } else if (observedMeanTempC < spec.tempOptMinC) {
      thermalStatus = 'cool_watch'
    } else if (observedMeanTempC > spec.tempOptMaxC) {
      thermalStatus = 'warm_watch'
    } else {
      thermalStatus = 'within_band'
    }
  }

  let waterStatus: ParcelSimulationSummary['waterStatus'] = 'unknown'
  if (spec.id !== 'fallow' && projectedCycleRainMm !== null) {
    if (projectedCycleRainMm < spec.waterMinMm) {
      waterStatus = 'deficit_watch'
    } else if (projectedCycleRainMm > spec.waterMaxMm * 1.15) {
      waterStatus = 'surplus_watch'
    } else {
      waterStatus = 'within_band'
    }
  }

  const areaStr = `${allocatedAreaHa.toFixed(3)} ha (${coveragePercent}% of parcel)`
  const tempNoteGrower =
    thermalStatus === 'within_band'
      ? `Observed temperature (${observedMeanTempC?.toFixed(1)} °C) fits ${spec.name}'s comfort zone.`
      : thermalStatus === 'frost_watch'
      ? `Watch for cold nights (${observedMinTempC?.toFixed(1)} °C min) — ${spec.name} is sensitive to frost.`
      : thermalStatus === 'cool_watch'
      ? `Observed weather (${observedMeanTempC?.toFixed(1)} °C) is cooler than ${spec.name}'s ${spec.tempOptMinC}–${spec.tempOptMaxC} °C reference.`
      : thermalStatus === 'warm_watch'
      ? `Observed weather (${observedMeanTempC?.toFixed(1)} °C) is warmer than ${spec.name}'s ${spec.tempOptMinC}–${spec.tempOptMaxC} °C reference.`
      : 'Load NASA weather to check how temperature and rain match this crop.'

  const durNoteGrower =
    durationStatus === 'short_cycle'
      ? `${durationDays} days is shorter than typical (${spec.cycleDaysMin}–${spec.cycleDaysMax} days).`
      : durationStatus === 'long_cycle'
      ? `${durationDays} days is longer than typical (${spec.cycleDaysMin}–${spec.cycleDaysMax} days).`
      : `${durationDays} days fits the ${spec.cycleDaysMin}–${spec.cycleDaysMax} day cycle.`

  const growerText =
    spec.id === 'fallow'
      ? `Resting ${areaStr} for ${durationDays} days helps the soil recover between plantings.`
      : `Planting ${spec.name} on ${areaStr} for ${durationDays} days (${SHORT_MONTHS[startMonth - 1]}–${SHORT_MONTHS[harvestMonthIdx]}). ${durNoteGrower} ${tempNoteGrower}`

  const agronomistText =
    spec.id === 'fallow'
      ? `Fallow allocation: ${allocatedAreaHa.toFixed(4)} ha (${activeZoneCount}/4 zones, ${coveragePercent}% of ${totalAreaHa.toFixed(4)} ha polygon) over ${durationDays} d.`
      : `Zone allocation: ${allocatedAreaHa.toFixed(4)} ha (${activeZoneCount}/4 sectors) · Cycle: ${durationDays} d (catalog ${spec.cycleDaysMin}–${spec.cycleDaysMax} d, stage day ${stageDay}). Thermal ref: ${spec.tempOptMinC}–${spec.tempOptMaxC} °C (obs mean: ${observedMeanTempC !== null ? `${observedMeanTempC.toFixed(1)} °C` : 'unloaded'}). Water ref: ${spec.waterMinMm}–${spec.waterMaxMm} mm/cycle (scaled hist rate: ${projectedCycleRainMm !== null ? `${projectedCycleRainMm} mm · ~${interceptedRainM3} m³ on selected area` : 'unloaded'}).${estimatedNFixationKg !== null ? ` Est. biological N₂ fixation ref: ~${estimatedNFixationKg} kg N across selected area.` : ''}`

  return {
    spec,
    totalAreaHa,
    allocatedAreaHa,
    activeZoneCount,
    coveragePercent,
    durationDays,
    stageDay,
    startMonth,
    harvestMonth: harvestMonthIdx + 1,
    activeMonthLabel,
    durationStatus,
    thermalStatus,
    waterStatus,
    observedMeanTempC,
    observedMinTempC,
    projectedCycleRainMm,
    interceptedRainM3,
    estimatedNFixationKg,
    growerText,
    agronomistText,
  }
}
