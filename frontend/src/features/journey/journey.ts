import type { AgriculturalProfile, AppView, ClimateResponse, CompareResponse, Location, UserRole } from '../../types'

export type Scene = 'welcome' | 'field' | 'profile' | 'evidence' | 'crops' | 'climate' | 'planning' | 'charts' | 'summary' | 'help'
export type LessonTopic = 'rainfall' | 'temperature' | 'meaning'
export const scenes: { id: Scene; hash: string; label: string; view: AppView; step: number }[] = [
  { id: 'welcome', hash: '#demo', label: 'Start together', view: 'overview', step: 0 },
  { id: 'field', hash: '#field', label: 'Find my field', view: 'parcel', step: 1 },
  { id: 'profile', hash: '#profile', label: 'About my field', view: 'parcel', step: 2 },
  { id: 'evidence', hash: '#evidence', label: 'Check soil & terrain', view: 'parcel', step: 2 },
  { id: 'crops', hash: '#crops', label: 'Explore crops', view: 'crops', step: 4 },
  { id: 'climate', hash: '#climate', label: 'Understand the weather', view: 'monitoring', step: 3 },
  { id: 'planning', hash: '#rotations', label: 'Explore planting options', view: 'planning', step: 4 },
  { id: 'charts', hash: '#charts', label: 'Make a chart', view: 'charts', step: 4 },
  { id: 'summary', hash: '#reports', label: 'Keep my findings', view: 'reports', step: 5 },
  { id: 'help', hash: '#help', label: 'Help & sources', view: 'help', step: 0 },
]
export function sceneFromHash(): Scene | 'project' {
  const hash = window.location.hash
  if (hash === '#project') return 'project'
  return scenes.find((item) => item.hash === hash)?.id ?? (hash === '#planificar' ? 'planning' : hash === '#monitorear' ? 'climate' : hash === '#cultivos' ? 'crops' : hash === '#soil' || hash === '#terrain' ? 'evidence' : 'welcome')
}
export const initialProfile: AgriculturalProfile = { name: '', crop: '', areaHa: null, soil: 'unknown', water: 'unknown', previousRotation: '' }
const SESSION = 'pacha-pulse.journey.v1'
interface SavedJourney { version: 1; role: UserRole | null; scene: Scene; profile: AgriculturalProfile; location: Location | null; guided: boolean; paused: boolean; profileDone: boolean }
export function readJourney(): SavedJourney | null {
  try {
    const raw = sessionStorage.getItem(SESSION)
    if (!raw || raw.length > 6000) return null
    const value = JSON.parse(raw)
    if (value.version !== 1 || !scenes.some((item) => item.id === value.scene) || ![null, 'grower', 'agronomist'].includes(value.role)) return null
    const p = value.profile
    if (!p || typeof p.name !== 'string' || p.name.length > 80 || typeof p.crop !== 'string' || p.crop.length > 80 || typeof p.previousRotation !== 'string' || p.previousRotation.length > 500) return null
    if (!['unknown', 'sandy', 'loamy', 'clayey', 'other'].includes(p.soil) || !['unknown', 'rainfed', 'irrigated', 'mixed'].includes(p.water)) return null
    if (p.areaHa !== null && (typeof p.areaHa !== 'number' || !Number.isFinite(p.areaHa) || p.areaHa <= 0 || p.areaHa > 1e6)) return null
    const point = value.location
    const location: Location | null = point && typeof point.lat === 'number' && typeof point.lon === 'number' && Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180 ? { lat: point.lat, lon: point.lon, source: ['manual', 'map', 'parcel'].includes(point.source) ? point.source : 'manual' } : null
    return { version: 1, role: value.role, scene: value.scene, profile: { name: p.name, crop: p.crop, areaHa: p.areaHa, soil: p.soil, water: p.water, previousRotation: p.previousRotation }, location, guided: value.guided !== false, paused: value.paused === true, profileDone: value.profileDone === true }
  } catch { return null }
}
export function saveJourney(value: SavedJourney): boolean { try { sessionStorage.setItem(SESSION, JSON.stringify(value)); return true } catch { return false } }
export interface Guidance { title: string; text: string; extra: string; mood: 'welcome' | 'explain' | 'listen' | 'celebrate' | 'think' }
export function guidanceFor(scene: Scene, data: { location: Location | null; boundary: boolean; profile: AgriculturalProfile; climate: ClimateResponse | null; comparison: CompareResponse | null; topic: LessonTopic; loading: boolean; error: string }): Guidance {
  const { climate, location, profile, topic } = data
  if (data.loading) return { title: 'I am looking up the observations.', text: 'This can take a moment. Your field stays right here.', extra: 'I only show observations after the data source responds. A slow response never becomes an invented result.', mood: 'think' }
  if (data.error) return { title: 'Let us try a smaller step.', text: data.error, extra: 'Your saved field is unchanged. You can retry or choose the clearly labelled historical example.', mood: 'listen' }
  if (scene === 'welcome') return { title: 'Hello, I am Pacha.', text: 'Tell me how you work with the land. We will take the next steps together.', extra: 'You can change your work mode later. Both modes use the same evidence and calculations.', mood: 'welcome' }
  if (scene === 'field') return data.boundary ? { title: 'There is your field.', text: 'Your outline is saved. When it looks right, we can give your field a name.', extra: 'The outlined area is approximate. NASA still reads climate at one query point, not across the whole polygon.', mood: 'celebrate' } : location ? { title: 'We have a starting point.', text: 'You can trace the corners of your field, or continue with this location.', extra: 'Choose Draw my field, tap each corner, then tap the first point again to close it. Coordinates are available in Field tools.', mood: 'explain' } : { title: 'Let us find your land.', text: 'Move and zoom the map, then tap where your field is. You can also use your device location.', extra: 'Location access is optional and starts only when you press Find my location. Field tools also accepts coordinates.', mood: 'explain' }
  if (scene === 'evidence') return { title: 'Let us check one source at a time.', text: 'Choose location, terrain or soil, then read that source. Missing data stays unknown.', extra: 'SoilGrids is a model estimate. DEM terrain is a sampled summary. Neither replaces field measurements or changes your own profile answers.', mood: 'explain' }
  if (scene === 'crops') return { title: 'Possibilities, with the questions visible.', text: 'Explore one crop at a time. The service can check available location and soil evidence, with its limitations.', extra: 'A rule-based score is not a guarantee. Review the planting season, soil tests, variety and water before deciding. Trying a crop changes only an alternative sequence.', mood: 'listen' }
  if (scene === 'profile') return { title: profile.crop ? `You grow ${profile.crop}.` : 'You know your field best.', text: 'A little context is enough. Anything you do not know can stay unknown.', extra: 'Your answers are your own inputs, not soil measurements. I can help fill them in, and you always review proposed changes.', mood: 'listen' }
  if (scene === 'climate' && climate) {
    if (topic === 'rainfall') { const value = climate.summary.rainfall_total.value; return { title: value === null ? 'Some rain observations are missing.' : 'This is the rain for that period.', text: value === null ? 'I cannot give you a complete rainfall total. A missing day is not a dry day.' : `${value.toFixed(1)} mm is the total for ${climate.start} to ${climate.end}. Taller bars mean more rain recorded that day.`, extra: 'One millimetre is one litre of rain over one square metre. This grid estimate does not tell us how much water reached crop roots or predict next season.', mood: 'explain' } }
    if (topic === 'temperature') { const value = climate.summary.temperature_mean.value; return { title: 'Let us look at temperature.', text: value === null ? 'There are no usable temperature values for this period.' : `The daily averages give a period mean of ${value.toFixed(1)} °C. Follow the line to see how those daily averages changed.`, extra: 'This is an average of available daily means. It is not the hottest or coldest reading, and mountain conditions may differ from your field.', mood: 'explain' } }
    return { title: 'Useful context. A few honest limits.', text: 'These observations describe past weather around the selected point. They help us ask better questions about planting.', extra: 'They do not diagnose a crop, measure your soil, predict a harvest or tell us the best rotation. We still need local agronomic knowledge.', mood: 'listen' }
  }
  if (scene === 'climate') return { title: 'What has the weather been like?', text: 'Choose a past period for your location. Or try the saved Mantaro example to learn how this works.', extra: 'The example is authentic January 2025 NASA data for Mantaro. It changes the query point to that location and does not describe your own field.', mood: 'explain' }
  if (scene === 'planning') return data.comparison ? { title: 'Let us compare what changed.', text: 'Look at the crops, repeated plantings and rest periods in each sequence. These counts start a conversation.', extra: 'More crop types do not guarantee a better harvest. A rainfall percentage is a hypothetical change to the historical total, not a forecast.', mood: 'explain' } : { title: 'First, your usual planting story.', text: 'What do you plant first, next and after that? Then we will explore two alternatives.', extra: 'The starting sequences are editable examples. Confirm your usual rotation before treating it as your reference.', mood: 'listen' }
  if (scene === 'charts') return { title: 'Let us make the numbers visible.', text: 'Pick one thing you want to understand. I can help you build a chart from the observations or rotations you have loaded.', extra: 'The manual builder works without AI. Every prepared chart keeps its source, dates and exact values, even if you later change fields.', mood: 'explain' }
  if (scene === 'summary') return { title: 'Here is what we learned together.', text: 'Keep a copy of your field, observations and comparisons. You can bring it to an agronomist.', extra: 'Your profile and place in the journey are remembered in this tab. Export your report and outline to keep a separate copy. No cloud farm account is created.', mood: 'celebrate' }
  return { title: 'Ask as many times as you need.', text: 'We can go back, look at an example, or explore the details at your own pace.', extra: 'You can pause motion, switch off guided explanations, and use every essential action with a keyboard. Gemini explanations may make mistakes.', mood: 'listen' }
}
