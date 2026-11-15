import type { ClimateResponse, Location } from '../../types'

export interface CropReference { id: string; name: string; band: [number, number] | null; scope: string; context: string; source: string; url: string; reviewed: string }
export const cropReferences: CropReference[] = [
  { id: 'bean', name: 'Bean', band: [15, 23], scope: 'Published average-temperature range for common bean', context: 'Common bean varieties and local conditions differ. Drainage, season and frost still need checking.', source: 'FAO / INRAE / CIRAD / AFZ Feedipedia: Common bean', url: 'https://feedipedia.review.fao.org/node/266', reviewed: '2026-11-15' },
  { id: 'maize', name: 'Maize', band: [20, 30], scope: 'Optimum growth and photosynthesis range for maize', context: 'This is a general growth reference, not a germination threshold or a rule for every highland cultivar.', source: 'FAO / IIASA GAEZ v4 maize crop profile', url: 'https://s3.eu-west-1.amazonaws.com/data.gaezdev.aws.fao.org/crop_profiles/GAEZ_Crop_profile_maize.pdf', reviewed: '2026-11-15' },
  { id: 'potato', name: 'Potato', band: [18, 20], scope: 'Reported favourable mean daily temperature for tuber production', context: 'Tuber development and variety matter. A colder or warmer historical month does not rule out potato growing in another season.', source: 'FAO: International Year of the Potato 2008', url: 'https://www.fao.org/4/i0500e/i0500e.pdf', reviewed: '2026-11-15' },
  { id: 'quinoa', name: 'Quinoa', band: [15, 20], scope: 'Indicative favourable cultivation temperature', context: 'Quinoa has diverse ecotypes adapted to different climates. This narrow reference is not its survival range.', source: 'FAO: Quinoa, an ancient crop to contribute to world food security', url: 'https://www.fao.org/4/aq287e/aq287e.pdf', reviewed: '2026-11-15' },
  { id: 'wheat', name: 'Wheat', band: null, scope: 'No comparable numerical band configured', context: 'Winter and spring wheat have different seasonal needs. Check the variety and growing calendar with local agronomic advice.', source: 'FAO: Climate and crop growth', url: 'https://www.fao.org/4/s2022e/s2022e06.htm', reviewed: '2026-11-15' },
]
export type CropCheck = 'within' | 'outside' | 'unknown'
export function referenceCheck(crop: CropReference, climate: ClimateResponse | null, location: Location | null): { state: CropCheck; value: number | null; reason: string } {
  if (!climate || !location || Math.abs(climate.lat - location.lat) > .00001 || Math.abs(climate.lon - location.lon) > .00001) return { state: 'unknown', value: null, reason: 'Load historical weather for the selected query point first.' }
  if (!crop.band) return { state: 'unknown', value: null, reason: 'No comparable temperature band is configured for this crop.' }
  const value = climate.summary.temperature_mean.value
  if (value === null || !Number.isFinite(value) || !climate.data.length || climate.data.some((day) => day.T2M === null || !Number.isFinite(day.T2M))) return { state: 'unknown', value: null, reason: 'Complete daily temperature observations are needed for this simple period comparison.' }
  return { state: value >= crop.band[0] && value <= crop.band[1] ? 'within' : 'outside', value, reason: 'Compares a historical period mean with a general published reference. It is not a crop suitability test.' }
}
