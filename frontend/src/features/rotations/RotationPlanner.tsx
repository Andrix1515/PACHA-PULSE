import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowDownToLine, GitCompareArrows, Info, LoaderCircle, Route } from 'lucide-react'
import type { AgriculturalProfile, ClimateResponse, CompareResponse, ComparisonInput, CropId, Rotation, UserRole } from '../../types'
import { requestJson } from '../../services/api'

const cropNames: Record<CropId, string> = { maize: 'Maize', wheat: 'Wheat', potato: 'Potato', bean: 'Bean', lentil: 'Lentil', quinoa: 'Quinoa', fallow: 'Fallow / rest' }
const initialRotations: Rotation[] = [{ name: 'Usual / reference', crops: ['maize', 'maize', 'maize'] }, { name: 'Alternative A', crops: ['maize', 'bean', 'maize'] }, { name: 'Alternative B', crops: ['maize', 'potato', 'bean'] }]

export default function RotationPlanner({ climate, profile, role, onComparison }: { climate: ClimateResponse | null; profile: AgriculturalProfile; role: UserRole; onComparison: (next: { input: ComparisonInput; result: CompareResponse } | null) => void }) {
  const [rotations, setRotations] = useState<Rotation[]>(initialRotations)
  const [percent, setPercent] = useState(100)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  const climateKey = climate ? `${climate.lat}/${climate.lon}/${climate.start}/${climate.end}/${climate.retrieved_at}` : ''
  useEffect(() => { request.current?.abort(); setResult(null); onComparison(null); setLoading(false) }, [climateKey, profile.soil, profile.water, onComparison])
  useEffect(() => () => request.current?.abort(), [])
  function invalidate() { request.current?.abort(); setLoading(false); setResult(null); onComparison(null); setError('') }
  function updateCrop(index: number, campaign: number, crop: CropId) {
    invalidate()
    setRotations((current) => current.map((rotation, i) => i === index ? { ...rotation, crops: rotation.crops.map((value, j) => j === campaign ? crop : value) } : rotation))
    if (index === 0) setConfirmed(false)
  }
  async function run() {
    invalidate()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    const input: ComparisonInput = { rotations, rainfall_percent: percent, habitual_confirmed: confirmed, soil: profile.soil, water: profile.water, climate: climate ? { lat: climate.lat, lon: climate.lon, start: climate.start, end: climate.end, saved_example: climate.delivery === 'saved_observation' } : null }
    try {
      const data = await requestJson<CompareResponse>('/rotations/compare', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify(input),
      })
      if (!controller.signal.aborted) { setResult(data); onComparison({ input, result: data }) }
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'The comparison could not be completed. Please try again.')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }
  function exportResult() {
    if (!result) return
    const blob = new Blob([JSON.stringify({ rotations, climate, profile, comparison: result }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'pacha-pulse-comparison.json'; link.click(); URL.revokeObjectURL(url)
  }
  return <section className="panel planner-panel" aria-labelledby="planner-heading">
    <div className="panel-title"><div><span className="eyebrow">THREE CAMPAIGNS · THREE POSSIBILITIES</span><h2 id="planner-heading"><Route size={20} />Compare your rotations</h2></div><GitCompareArrows size={22} /></div>
    <div className="planner-body"><p className="muted">Start with your usual sequence, then edit the alternatives. Initial values are illustrative examples, not validated for your field.</p><p className="helper-text">{role === 'grower' ? 'What do you plant first, next and last? Each column is one campaign. Edit the alternatives, then compare again.' : 'Structural analysis of three sequences. Review counts, climate context and missing inputs; suitability is not assessed.'}</p>
      <div className="rotation-editors">{rotations.map((rotation, index) => <fieldset key={rotation.name} className={`rotation-editor rotation-${index}`}><legend>{rotation.name}</legend><p>{index === 0 ? 'Edit this to reflect your current practice.' : 'Explore a different sequence.'}</p><div className="campaign-fields">{rotation.crops.map((crop, campaign) => <label key={campaign}>Campaign {campaign + 1}<select aria-label={`${rotation.name}, campaign ${campaign + 1}`} value={crop} onChange={(event) => updateCrop(index, campaign, event.target.value as CropId)}>{Object.entries(cropNames).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>)}</div></fieldset>)}</div>
      <label className="confirmation-check"><input type="checkbox" checked={confirmed} onChange={(event) => { invalidate(); setConfirmed(event.target.checked) }} />I confirm the first sequence reflects my usual rotation.</label>
      <div className="scenario-control"><div><label htmlFor="rainfall-scenario">Historical rainfall scenario</label><p>Same period and location, with a hypothetical change. This is not a forecast.</p></div><output htmlFor="rainfall-scenario">{percent} %</output><input id="rainfall-scenario" type="range" min="0" max="150" step="5" value={percent} onChange={(event) => { invalidate(); setPercent(Number(event.target.value)) }} /><div className="scenario-shortcuts"><button type="button" aria-pressed={percent === 100} onClick={() => { invalidate(); setPercent(100) }}>100% · reference</button><button type="button" aria-pressed={percent === 70} onClick={() => { invalidate(); setPercent(70) }}>70% · drier</button></div><p className="scenario-context">{climate ? `Shared climate context: ${climate.lat.toFixed(4)}°, ${climate.lon.toFixed(4)}° · ${climate.start} to ${climate.end}` : 'No weather loaded: structural comparison is available, but scenario rainfall will remain unknown.'}</p></div>
      <p className="helper-text">Soil and water management come from your profile. Campaigns have no dates and no season is assumed by hemisphere.</p>
      <button className="primary-button compare-button" onClick={() => void run()} disabled={loading}>{loading ? <><LoaderCircle size={17} className="loading-icon" />Comparing…</> : <><GitCompareArrows size={18} />Compare three rotations</>}</button>
      {error && <p className="field-error" role="alert">{error}</p>}
      {result && <div className="comparison-result" aria-label="Rotation comparison results"><div className="section-title"><h3>What changes between your options</h3><button className="text-button" onClick={exportResult}><ArrowDownToLine size={15} />Export comparison</button></div>
        <div className="scenario-result"><span>Hypothetical rainfall for the period</span><strong>{result.scenario_rainfall.value === null ? 'No complete climate data' : `${result.scenario_rainfall.value.toFixed(1)} mm`}</strong><p>{result.baseline_rainfall?.value !== null && result.baseline_rainfall ? `${result.baseline_rainfall.value.toFixed(1)} mm historical × ${result.rainfall_percent} % · scenario, identical for all three sequences.` : 'Load a complete period in NASA climate to add this context.'}</p><small>This is not irrigation water or crop water demand.</small></div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable crop rotation comparison table"><table className="comparison-table"><caption>Indicators calculated only from your sequences. There is no suitability ranking.</caption><thead><tr><th scope="col">Sequence</th><th scope="col">Distinct crops</th><th scope="col">Consecutive repeats</th><th scope="col">Fallow campaigns</th></tr></thead><tbody>{result.results.map((row) => <tr key={row.name}><th scope="row">{row.name}<span className="table-sequence">{row.labels.join(' → ')}</span></th><td>{row.distinct_crops.value}</td><td>{row.consecutive_repetitions.value}</td><td>{row.fallow_campaigns.value}</td></tr>)}</tbody></table></div>
        <div className="tradeoff-grid">{result.results.map((row) => <article key={row.name}><h4>{row.name}</h4><div className="sequence-chips">{row.labels.map((crop, index) => <span key={index}>{index ? <ArrowRight size={12} /> : null}{crop}</span>)}</div><ul>{row.tradeoffs.map((text) => <li key={text}>{text}</li>)}</ul></article>)}</div>
        <div className="assessment-note"><Info size={20} /><div><h4>What is still needed before deciding</h4><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></div>
        <details className="method-details" open={role === 'agronomist' || undefined}><summary>How this was calculated and where the data came from</summary><p>{result.method}</p><p>Fallow campaigns are excluded from distinct crops. Consecutive repeats count adjacent pairs of the same crop, excluding fallow. None of these counts predicts yield.</p><p>Structural source: scenarios entered by you. Period: three undated campaigns. Water demand, yield and profitability are unavailable.</p>{result.baseline_rainfall && <p>Climate reference: {result.baseline_rainfall.source}, {result.baseline_rainfall.observed_at}. Retrieved: {result.baseline_rainfall.retrieved_at}. {result.baseline_rainfall.spatial_resolution}.</p>}</details>
      </div>}
    </div>
  </section>
}
