import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Leaf, LoaderCircle, Search, ShieldAlert } from 'lucide-react'
import type { AgriculturalProfile, CandidateCrop, ClimateReference, Crop, Location, LocationInfo, UserRole } from '../../types'
import { compareCrops, getCandidateCrops, getCrops } from '../../services/api'

type Comparison = Awaited<ReturnType<typeof compareCrops>>
type Suitability = CandidateCrop['suitability_category']

const suitabilityLabels: Record<Suitability, string> = {
  suitable: 'Preliminary match',
  marginal: 'Review some concerns',
  unsuitable: 'Important limitations',
  insufficient_data: 'More evidence needed',
}
const categoryLabels: Record<Crop['category'], string> = {
  cereal: 'Cereal',
  legume: 'Legume',
  tuber: 'Tuber & root',
  vegetable: 'Vegetable',
  oilseed: 'Oilseed',
  forage: 'Forage',
  cover_crop: 'Cover crop',
  pseudo_cereal: 'Pseudo-cereal',
  fallow: 'Fallow',
}
const familyLabels = {
  all: 'All families',
  Fabaceae: 'Fabaceae · legumes',
  Poaceae: 'Poaceae · grasses',
  Solanaceae: 'Solanaceae · nightshades',
  Amaranthaceae: 'Amaranthaceae',
  Asteraceae: 'Asteraceae',
  Convolvulaceae: 'Convolvulaceae',
  Euphorbiaceae: 'Euphorbiaceae',
}

function range(min: number | null, max: number | null, unit: string) {
  if (min == null && max == null) return 'Not specified'
  if (min == null) return `Up to ${max} ${unit}`
  if (max == null) return `From ${min} ${unit}`
  return `${min}–${max} ${unit}`
}

export default function CandidateScene({
  location,
  info,
  climate,
  profile,
  role,
  onField,
  onEvidence,
  onPlan,
}: {
  location: Location | null
  info: LocationInfo | null
  climate: ClimateReference | null
  profile: AgriculturalProfile
  role: UserRole
  onField: () => void
  onEvidence: () => void
  onPlan: (crop: Crop) => void
}) {
  const [catalogue, setCatalogue] = useState<Crop[]>([])
  const [candidates, setCandidates] = useState<CandidateCrop[] | null>(null)
  const [assessmentKey, setAssessmentKey] = useState('')
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [category, setCategory] = useState('all')
  const [family, setFamily] = useState('all')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [comparisonBusy, setComparisonBusy] = useState(false)
  const active = useRef<AbortController | null>(null)
  const compareRequest = useRef<AbortController | null>(null)
  const pointKey = `${location?.lat}/${location?.lon}/${profile.water}/${climate?.start}/${climate?.end}`

  useEffect(() => {
    const controller = new AbortController()
    getCrops(undefined, undefined, controller.signal)
      .then(setCatalogue)
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'The catalogue could not load.')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    active.current?.abort()
    compareRequest.current?.abort()
    setCandidates(null)
    setAssessmentKey('')
    setCategory('all')
    setFamily('all')
    setFilter('all')
    setError('')
    setBusy(false)
    setComparison(null)
    setComparisonBusy(false)
  }, [pointKey])

  useEffect(() => () => {
    active.current?.abort()
    compareRequest.current?.abort()
  }, [])

  const scopedCandidates = assessmentKey === pointKey ? candidates : null
  const availableCrops = catalogue
  const families = useMemo(() => [...new Set(catalogue.map((crop) => crop.botanical_family))].sort(), [catalogue])
  const options = availableCrops.filter((crop) => {
    const matchesSearch = !search || `${crop.common_name} ${crop.spanish_name} ${crop.scientific_name} ${crop.botanical_family} ${crop.alternative_names.join(' ')}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || crop.category === category
    const matchesFamily = family === 'all' || crop.botanical_family === family
    const assessment = scopedCandidates?.find((item) => item.crop.id === crop.id)
    const matchesSuitability = filter === 'all' || assessment?.suitability_category === filter
    return matchesSearch && matchesCategory && matchesFamily && matchesSuitability
  })
  const shownOptions = role === 'agronomist' || showAll ? options : options.slice(0, 4)
  const crop = options.find((item) => item.id === selected) ?? options[0]
  const assessment = scopedCandidates?.find((item) => item.crop.id === crop?.id)

  async function evaluate() {
    if (!location) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError('')
    setCandidates(null)
    setFilter('all')
    const datesMatch = climate && climate.lat === location.lat && climate.lon === location.lon
    try {
      const result = await getCandidateCrops(location.lat, location.lon, profile.water, datesMatch ? climate.start : undefined, datesMatch ? climate.end : undefined, controller.signal)
      if (!controller.signal.aborted) {
        setCandidates(result)
        setAssessmentKey(pointKey)
        setSelected((current) => result.some((item) => item.crop.id === current) ? current : result[0]?.crop.id ?? '')
      }
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Crop screening could not respond.')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  async function compare() {
    compareRequest.current?.abort()
    const controller = new AbortController()
    compareRequest.current = controller
    setComparisonBusy(true)
    setError('')
    try {
      const result = await compareCrops(selection, controller.signal)
      if (!controller.signal.aborted) setComparison(result)
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'The comparison could not respond.')
    } finally {
      if (!controller.signal.aborted) setComparisonBusy(false)
    }
  }

  function toggleSelection(id: string, checked: boolean) {
    setSelection((old) => checked ? [...old, id].slice(0, 3) : old.filter((item) => item !== id))
    setComparison(null)
  }

  return <section className="scene-content candidate-scene" aria-labelledby="crops-scene-heading">
    <p className="eyebrow">ONE CROP. A FEW BETTER QUESTIONS.</p>
    <h1 id="crops-scene-heading" tabIndex={-1}>Explore your planting options.</h1>
    <p className="scene-description">Browse detailed crop profiles, then ask the existing soil, location and crop services for a preliminary screening.</p>
    <p className="candidate-context">{info ? `${info.region}, ${info.country_name}` : location ? `Selected point: ${location.lat.toFixed(5)}°, ${location.lon.toFixed(5)}°` : 'No field point selected. You can still browse the catalogue.'}</p>
    {location ? <button className="primary-button" disabled={busy} onClick={() => void evaluate()}>{busy ? <LoaderCircle size={18} className="loading-icon" /> : <Leaf size={18} />}{busy ? 'Checking the available evidence…' : scopedCandidates ? 'Refresh crop screening' : 'Check crop options for my point'}</button> : <button className="primary-button" onClick={onField}>Choose my field first<ArrowRight size={17} /></button>}
    <p className="helper-text">Screening is rule based, not a certified recommendation, success probability or crop ban. Missing soil or climate can leave important questions unanswered.</p>
    {busy && <p role="status" className="helper-text">The service is checking location and soil data. The catalogue stays available while it works.</p>}
    {error && <p className="field-error" role="alert">{error}</p>}

    <div className="candidate-controls">
      <label>Find a crop<input value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} placeholder="Common, Spanish or scientific name" /></label>
      <label>Crop category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Botanical family<select value={family} onChange={(event) => setFamily(event.target.value)}><option value="all">{familyLabels.all}</option>{families.map((value) => <option key={value} value={value}>{familyLabels[value as keyof typeof familyLabels] ?? value}</option>)}</select></label>
      <label>Screening group<select value={filter} onChange={(event) => setFilter(event.target.value)} disabled={!scopedCandidates}><option value="all">All groups</option>{Object.entries(suitabilityLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="candidate-choose">Full profile<select aria-label="Explore one crop" value={crop?.id ?? ''} onChange={(event) => setSelected(event.target.value)}>{!options.length && <option value="">No matching crops</option>}{options.map((item) => <option value={item.id} key={item.id}>{item.common_name}</option>)}</select></label>
    </div>

    <p className="candidate-result-count" role="status">{scopedCandidates ? `${scopedCandidates.length} preliminary screening results; ${options.length} crop profiles shown.` : `${options.length} crop profiles in the catalogue.`}</p>
    <div className="candidate-option-grid" role="list" aria-label="Crop profiles">
      {shownOptions.map((item) => {
        const result = scopedCandidates?.find((candidate) => candidate.crop.id === item.id)
        const isSelected = selection.includes(item.id)
        return <article className={`candidate-option-card ${result ? `screen-${result.suitability_category}` : ''}`} role="listitem" key={item.id} aria-label={`${item.common_name} crop profile`}>
          <div className="candidate-option-heading">
            <div><h2>{item.common_name} <span>({item.spanish_name})</span></h2><i>{item.scientific_name}</i></div>
            <span className={`candidate-status ${result?.suitability_category ?? 'unassessed'}`}>{result ? suitabilityLabels[result.suitability_category] : 'Catalogue profile'}</span>
          </div>
          <div className="candidate-tags-row">
            <span className="info-chip">{item.botanical_family}</span>
            <span className="info-chip">{categoryLabels[item.category]}</span>
            <span className="info-chip">Roots: {item.root_depth.replaceAll('_', ' ')}</span>
            {item.is_nitrogen_fixer && <span className="info-chip">N₂ fixation reference: {item.biological_n_fixation_kg_ha ?? 'Not specified'} kg/ha</span>}
          </div>
          <p>Cycle: {range(item.cycle_duration_days_min, item.cycle_duration_days_max, 'days')} · Water demand reference: {range(item.requirements.water_demand_mm_min, item.requirements.water_demand_mm_max, 'mm/cycle')}</p>
          {result && <div className="candidate-option-screening">
            <strong>Heuristic screening index: {result.overall_score}/100 · {result.confidence_level} confidence</strong>
            {!!result.advantages.length && <p><Leaf size={15} /> {result.advantages[0]}</p>}
            {!!result.limiting_factors.length && <p><ShieldAlert size={15} /> {result.limiting_factors[0]}</p>}
            {!!result.data_gaps.length && <small>Evidence gaps: {result.data_gaps.join('; ')}</small>}
          </div>}
          <div className="candidate-option-actions">
            <button type="button" className="secondary-button" aria-pressed={crop?.id === item.id} onClick={() => setSelected(item.id)}>View details</button>
            <button type="button" className="text-button" onClick={() => onPlan(item)}>Use {item.common_name} in Alternative A<ArrowRight size={15} /></button>
            <label><input type="checkbox" checked={isSelected} disabled={!isSelected && selection.length >= 3} onChange={(event) => toggleSelection(item.id, event.target.checked)} /> Compare</label>
          </div>
        </article>
      })}
    </div>
    {role === 'grower' && options.length > 4 && <button className="secondary-button crop-list-toggle" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer crops' : `Show all ${options.length} crops`}</button>}
    {!options.length && !busy && <div className="empty-results"><p>No crops match these filters. Clear search or choose all categories; an empty filtered list is not evidence that nothing can grow here.</p></div>}

    {crop && <article className="candidate-card candidate-full-profile" aria-label={`${crop.common_name} detailed crop profile`}>
      <p className="eyebrow">{crop.botanical_family} · {categoryLabels[crop.category]}</p>
      <h2>{crop.common_name}</h2>
      <p><i>{crop.scientific_name}</i> · also known as {crop.alternative_names.join(', ') || 'No alternative names listed'}.</p>
      {assessment && <div className="candidate-assessment">
        <strong>{suitabilityLabels[assessment.suitability_category]}</strong>
        <p>Heuristic screening index: {assessment.overall_score}/100 · {assessment.confidence_level} confidence. This is not a probability of success.</p>
        {!!assessment.limiting_factors.length && <><strong>Factors to review</strong><ul>{assessment.limiting_factors.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
        {!!assessment.data_gaps.length && <><strong>Evidence gaps</strong><ul>{assessment.data_gaps.map((text, i) => <li key={i}>{text}</li>)}</ul></>}
      </div>}
      <p>Root depth: {crop.root_depth.replaceAll('_', ' ')}. Soil cover reference: {crop.soil_cover_quality}.</p>
      <div className="findings-next-actions">
        <button className="secondary-button" onClick={() => onPlan(crop)}>Try in Alternative A<ArrowRight size={17} /></button>
        <label className="candidate-compare-check"><input type="checkbox" checked={selection.includes(crop.id)} disabled={!selection.includes(crop.id) && selection.length >= 3} onChange={(event) => toggleSelection(crop.id, event.target.checked)} />Compare this crop</label>
      </div>
      <details className="candidate-details" open={role === 'agronomist' || undefined}>
        <summary>Requirements, evidence and source references</summary>
        <p>Catalogue requirements vary by variety and growing stage. They are references, not measurements of your field or guaranteed crop needs.</p>
        <dl>
          <div><dt>Temperature reference</dt><dd>{range(crop.requirements.temp_opt_min_c, crop.requirements.temp_opt_max_c, '°C')} optimal; broader limits {range(crop.requirements.temp_min_c, crop.requirements.temp_max_c, '°C')}</dd></div>
          <div><dt>pH reference</dt><dd>{range(crop.requirements.ph_min, crop.requirements.ph_max, 'pH')}</dd></div>
          <div><dt>Water-demand reference</dt><dd>{range(crop.requirements.water_demand_mm_min, crop.requirements.water_demand_mm_max, 'mm per crop cycle')}; not a rainfall or irrigation calculation</dd></div>
          <div><dt>Altitude reference</dt><dd>{range(crop.requirements.altitude_min_m, crop.requirements.altitude_max_m, 'm')}</dd></div>
          <div><dt>Frost tolerance</dt><dd>{crop.requirements.frost_tolerance}</dd></div>
          <div><dt>Soil texture references</dt><dd>{crop.requirements.tolerated_textures.join(', ') || 'Not specified'}</dd></div>
          <div><dt>Nutrient-demand references</dt><dd>N: {crop.n_demand} · P: {crop.p_demand} · K: {crop.k_demand}</dd></div>
          <div><dt>Biological nitrogen fixation</dt><dd>{crop.is_nitrogen_fixer ? `${crop.biological_n_fixation_kg_ha ?? 'Not specified'} kg N/ha reference` : 'Not listed as a nitrogen fixer'}</dd></div>
          <div><dt>Rotation predecessors</dt><dd>Favorable: {crop.rotation_good_predecessors.join(', ') || 'Not specified'} · Avoid: {crop.rotation_bad_predecessors.join(', ') || 'Not specified'}</dd></div>
          <div><dt>Pest vulnerabilities</dt><dd>{crop.pest_susceptibilities.join(', ') || 'Not specified; this is not a pest diagnosis'}</dd></div>
        </dl>
        {assessment && <><h3>Field-screening evidence</h3><ul>{assessment.evidence.map((item, i) => <li key={i}><strong>{item.factor}: {item.status}</strong><br />{item.details}<br />Field: {item.field_condition} · Crop reference: {item.crop_requirement}</li>)}</ul><p>{assessment.advantages.join(' ')}</p></>}
        <h3>References listed for this crop</h3><ul>{crop.sources.map((source, i) => <li key={i}>{source}</li>)}</ul>
      </details>
    </article>}

    <div className="candidate-compare">
      <button className="secondary-button" disabled={selection.length < 2 || comparisonBusy} onClick={() => void compare()}>{comparisonBusy ? 'Comparing catalogue profiles…' : `Compare selected crops (${selection.length}/3)`}</button>
      {comparison && <details open><summary>Catalogue comparison results</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Side-by-side crop comparison">
          <table><thead><tr><th scope="col">Reference</th>{comparison.compared_crops.map(({ crop: item }) => <th scope="col" key={item.id}>{item.common_name}<br /><i>{item.scientific_name}</i></th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">Botanical family</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>{item.botanical_family}</td>)}</tr>
              <tr><th scope="row">Category</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>{categoryLabels[item.category]}</td>)}</tr>
              <tr><th scope="row">Root depth</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>{item.root_depth}</td>)}</tr>
              <tr><th scope="row">Cycle length</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>{range(item.cycle_duration_days_min, item.cycle_duration_days_max, 'days')}</td>)}</tr>
              <tr><th scope="row">Water-demand reference</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>{range(item.requirements.water_demand_mm_min, item.requirements.water_demand_mm_max, 'mm/cycle')}</td>)}</tr>
              <tr><th scope="row">Optimum temperature</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>{range(item.requirements.temp_opt_min_c, item.requirements.temp_opt_max_c, '°C')}</td>)}</tr>
              <tr><th scope="row">Nitrogen fixation</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>{item.is_nitrogen_fixer ? `${item.biological_n_fixation_kg_ha ?? 'Not specified'} kg N/ha reference` : 'Not listed'}</td>)}</tr>
              <tr><th scope="row">Nutrient demand</th>{comparison.compared_crops.map(({ crop: item }) => <td key={item.id}>N: {item.n_demand} · P: {item.p_demand} · K: {item.k_demand}</td>)}</tr>
            </tbody>
          </table>
        </div>
        {comparison.compared_crops.map((item) => <article key={item.crop.id}><h3>{item.crop.common_name}</h3><p>{item.advantages.join(' ')}</p><p>{item.disadvantages.join(' ')}</p><p>Possible predecessors: {item.best_predecessors.join(', ') || 'Not specified'}. Review warnings: {item.rotational_warnings.join(', ') || 'None listed'}.</p></article>)}
        <p>{comparison.tradeoffs_summary.join(' ')}</p><p>Catalogue context only; not a field-specific yield or nutrient prediction.</p>
      </details>}
    </div>
    <button className="text-button" onClick={onEvidence}>Check my location, soil and terrain sources<ArrowRight size={17} /></button>
  </section>
}
