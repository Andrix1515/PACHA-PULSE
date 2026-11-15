import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Leaf, LoaderCircle } from 'lucide-react'
import type { AgriculturalProfile, CandidateCrop, ClimateReference, Crop, Location, LocationInfo, UserRole } from '../../types'
import { compareCrops, getCandidateCrops, getCrops } from '../../services/api'

type Comparison = Awaited<ReturnType<typeof compareCrops>>
const categories = { suitable: 'Preliminary match', marginal: 'Some concerns to review', unsuitable: 'Important limitations', insufficient_data: 'More evidence needed' }
export default function CandidateScene({ location, info, climate, profile, role, onField, onEvidence, onPlan }: { location: Location | null; info: LocationInfo | null; climate: ClimateReference | null; profile: AgriculturalProfile; role: UserRole; onField: () => void; onEvidence: () => void; onPlan: (crop: Crop) => void }) {
  const [catalogue, setCatalogue] = useState<Crop[]>([])
  const [candidates, setCandidates] = useState<CandidateCrop[] | null>(null)
  const [assessmentKey, setAssessmentKey] = useState('')
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [comparisonBusy, setComparisonBusy] = useState(false)
  const active = useRef<AbortController | null>(null)
  const compareRequest = useRef<AbortController | null>(null)
  const pointKey = `${location?.lat}/${location?.lon}/${profile.water}/${climate?.start}/${climate?.end}`
  useEffect(() => { const controller = new AbortController(); getCrops(undefined, undefined, controller.signal).then(setCatalogue).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'The catalogue could not load.') }); return () => controller.abort() }, [])
  useEffect(() => { active.current?.abort(); compareRequest.current?.abort(); setCandidates(null); setFilter('all'); setError(''); setBusy(false); setComparison(null); setComparisonBusy(false) }, [pointKey])
  useEffect(() => () => { active.current?.abort(); compareRequest.current?.abort() }, [])
  const scopedCandidates = assessmentKey === pointKey ? candidates : null
  const options = (scopedCandidates ? scopedCandidates.map((item) => item.crop) : catalogue).filter((crop) => (!search || `${crop.common_name} ${crop.scientific_name} ${crop.botanical_family}`.toLowerCase().includes(search.toLowerCase())) && (filter === 'all' || scopedCandidates?.some((item) => item.crop.id === crop.id && item.suitability_category === filter)))
  const crop = options.find((item) => item.id === selected) ?? options[0]
  const assessment = scopedCandidates?.find((item) => item.crop.id === crop?.id)
  async function evaluate() {
    if (!location) return
    active.current?.abort(); const controller = new AbortController(); active.current = controller
    setBusy(true); setError(''); setCandidates(null); setFilter('all')
    const datesMatch = climate && climate.lat === location.lat && climate.lon === location.lon
    try {
      const result = await getCandidateCrops(location.lat, location.lon, profile.water, datesMatch ? climate.start : undefined, datesMatch ? climate.end : undefined, controller.signal)
      if (!controller.signal.aborted) { setCandidates(result); setAssessmentKey(pointKey) }
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Crop screening could not respond.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  async function compare() {
    compareRequest.current?.abort(); const controller = new AbortController(); compareRequest.current = controller
    setComparisonBusy(true); setError('')
    try { const result = await compareCrops(selection, controller.signal); if (!controller.signal.aborted) setComparison(result) }
    catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'The comparison could not respond.') }
    finally { if (!controller.signal.aborted) setComparisonBusy(false) }
  }
  return <section className="scene-content candidate-scene" aria-labelledby="crops-scene-heading"><p className="eyebrow">ONE CROP. A FEW BETTER QUESTIONS.</p><h1 id="crops-scene-heading" tabIndex={-1}>Explore your planting options.</h1><p className="scene-description">Browse the shared crop catalogue, then ask the existing soil, location and crop services for a preliminary screening.</p>
    <p className="candidate-context">{info ? `${info.region}, ${info.country_name}` : location ? `Selected point: ${location.lat.toFixed(5)}°, ${location.lon.toFixed(5)}°` : 'No field point selected. You can still browse the catalogue.'}</p>
    {location ? <button className="primary-button" disabled={busy} onClick={() => void evaluate()}>{busy ? <LoaderCircle size={18} className="loading-icon" /> : <Leaf size={18} />}{busy ? 'Checking the available evidence…' : 'Check crop options for my point'}</button> : <button className="primary-button" onClick={onField}>Choose my field first<ArrowRight size={17} /></button>}
    <p className="helper-text">Screening is rule based, not a certified recommendation or a crop ban. Missing soil or climate can leave important questions unanswered.</p>
    {busy && <p role="status" className="helper-text">The service is checking location and soil data. The catalogue stays available while it works.</p>}{error && <p className="field-error" role="alert">{error}</p>}
    <div className="candidate-controls"><label>Find a crop<input value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} placeholder="Name or botanical family" /></label><label>Evidence group<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All crops</option>{Object.entries(categories).map(([id, label]) => <option key={id} value={id} disabled={!scopedCandidates}>{label}</option>)}</select></label><label className="candidate-choose">Explore one crop<select value={crop?.id ?? ''} onChange={(event) => setSelected(event.target.value)}>{!options.length && <option value="">No matching crops</option>}{options.map((item) => <option value={item.id} key={item.id}>{item.common_name}</option>)}</select></label></div>
    {crop ? <article className="candidate-card" aria-label={`${crop.common_name} crop profile`}><p className="eyebrow">{crop.botanical_family} · {crop.category.replaceAll('_', ' ')}</p><h2>{crop.common_name}</h2><p><i>{crop.scientific_name}</i></p>{assessment && <div className="candidate-assessment"><strong>{categories[assessment.suitability_category]}</strong><p>Confidence: {assessment.confidence_level}. This is the service's preliminary assessment.</p><ul>{assessment.limiting_factors.slice(0, 3).map((text, i) => <li key={i}>{text}</li>)}</ul>{assessment.data_gaps.length > 0 && <p>Still needed: {assessment.data_gaps.join('; ')}</p>}</div>}
      <p>Root depth: {crop.root_depth.replaceAll('_', ' ')}. Soil cover reference: {crop.soil_cover_quality}.</p>
      <div className="findings-next-actions"><button className="secondary-button" onClick={() => onPlan(crop)}>Try in Alternative A<ArrowRight size={17} /></button><label className="candidate-compare-check"><input type="checkbox" checked={selection.includes(crop.id)} disabled={!selection.includes(crop.id) && selection.length >= 3} onChange={(event) => { setSelection((old) => event.target.checked ? [...old, crop.id] : old.filter((id) => id !== crop.id)); setComparison(null) }} />Compare this crop</label></div>
      <details className="candidate-details" open={role === 'agronomist' || undefined}><summary>Requirements, evidence and source references</summary><p>Catalogue requirements vary by variety and growing stage. They are not measurements of your field.</p><dl><div><dt>Optimum temperature reference</dt><dd>{crop.requirements.temp_opt_min_c ?? 'Unknown'} to {crop.requirements.temp_opt_max_c ?? 'Unknown'} °C</dd></div><div><dt>pH reference</dt><dd>{crop.requirements.ph_min ?? 'Unknown'} to {crop.requirements.ph_max ?? 'Unknown'}</dd></div><div><dt>Water-demand reference</dt><dd>{crop.requirements.water_demand_mm_min ?? 'Unknown'} to {crop.requirements.water_demand_mm_max ?? 'Unknown'} mm per crop cycle; not a monthly rain comparison</dd></div><div><dt>Altitude reference</dt><dd>{crop.requirements.altitude_min_m ?? 'Unknown'} to {crop.requirements.altitude_max_m ?? 'Unknown'} m</dd></div><div><dt>Frost tolerance</dt><dd>{crop.requirements.frost_tolerance}</dd></div></dl>{assessment && <><p>Internal screening score: {assessment.overall_score}. This is a heuristic, not a success probability.</p><ul>{assessment.evidence.map((item, i) => <li key={i}><strong>{item.factor}: {item.status}</strong><br />{item.crop_requirement}<br />{item.field_condition}<br />{item.details}</li>)}</ul><p>{assessment.advantages.join(' ')}</p></>}<ul>{crop.sources.map((source, i) => <li key={i}>{source}</li>)}</ul></details>
    </article> : <p role="status" className="helper-text">No crops in this view. Change the filter; an empty list is not evidence that nothing can grow here.</p>}
    <div className="candidate-compare"><button className="secondary-button" disabled={selection.length < 2 || comparisonBusy} onClick={() => void compare()}>{comparisonBusy ? 'Comparing catalogue profiles…' : `Compare selected crops (${selection.length}/3)`}</button>{comparison && <details open><summary>Catalogue comparison results</summary>{comparison.compared_crops.map((item) => <article key={item.crop.id}><h3>{item.crop.common_name}</h3><p>{item.advantages.join(' ')}</p><p>{item.disadvantages.join(' ')}</p><p>Possible predecessors: {item.best_predecessors.join(', ') || 'Not specified'}. Review warnings: {item.rotational_warnings.join(', ') || 'None listed'}.</p></article>)}<p>{comparison.tradeoffs_summary.join(' ')}</p><p>Catalogue context, not a field-specific yield or nutrient prediction.</p></details>}</div>
    <button className="text-button" onClick={onEvidence}>Check my soil and terrain sources<ArrowRight size={17} /></button>
  </section>
}
