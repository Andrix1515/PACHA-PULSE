import { useRef, useEffect, useState } from 'react'
import { ChartNoAxesCombined, LoaderCircle } from 'lucide-react'
import type { ChartArtifact, ChartSpec, ClimateReference, ComparisonInput } from '../../types'
import { requestJson } from '../../services/api'
import ChartCard from './ChartCard'

interface Props { climate: ClimateReference | null; comparison: ComparisonInput | null; charts: ChartArtifact[]; onAdd: (charts: ChartArtifact[]) => void; onRemove: (id: string) => void; onAsk: (spec: ChartSpec) => void; onClimate: () => void; onPlanning: () => void }

export default function ChartWorkbench({ climate, comparison, charts, onAdd, onRemove, onAsk, onClimate, onPlanning }: Props) {
  const [spec, setSpec] = useState<ChartSpec>({ metric: 'rainfall', chart_type: 'bar', aggregation: 'daily' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  useEffect(() => { active.current?.abort(); setPending(false); setError('') }, [climate?.lat, climate?.lon, climate?.start, climate?.end, climate?.saved_example, comparison])
  function changeMetric(metric: ChartSpec['metric']) { setSpec({ metric, chart_type: metric === 'temperature' ? 'line' : 'bar', aggregation: 'daily' }); setError('') }
  async function create() {
    active.current?.abort(); const controller = new AbortController(); active.current = controller
    setPending(true); setError('')
    try {
      const chart = await requestJson<ChartArtifact>('/assistant/charts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ spec, climate, comparison }) })
      if (!controller.signal.aborted) onAdd([chart])
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'The chart could not be prepared.') }
    finally { if (!controller.signal.aborted) setPending(false) }
  }
  const missing = spec.metric === 'rotation_structure' ? !comparison : !climate
  return <div className="charts-workspace">
    <section className="panel chart-builder" aria-labelledby="chart-builder-heading"><div className="panel-title"><div><p className="eyebrow">YOUR DATA, MADE EASIER TO READ</p><h2 id="chart-builder-heading">Make a chart together</h2></div><ChartNoAxesCombined size={25} /></div><p>Choose what you want to see, or ask Pacha to prepare it. Both use the same verified data and calculations. No Gemini key is needed for the manual builder.</p>
      <form onSubmit={(event) => { event.preventDefault(); void create() }}><label>What to show<select value={spec.metric} onChange={(event) => changeMetric(event.target.value as ChartSpec['metric'])}><option value="rainfall">Historical rainfall</option><option value="temperature">Historical temperature</option><option value="rotation_structure">Rotation structure counts</option></select></label><label>Chart style<select value={spec.chart_type} onChange={(event) => { setSpec((current) => ({ ...current, chart_type: event.target.value as ChartSpec['chart_type'] })); setError('') }} disabled={spec.metric === 'rotation_structure'}><option value="bar">Bars</option><option value="line">Line</option></select></label><label>Time grouping<select value={spec.aggregation} onChange={(event) => { setSpec((current) => ({ ...current, aggregation: event.target.value as ChartSpec['aggregation'] })); setError('') }} disabled={spec.metric === 'rotation_structure'}><option value="daily">{spec.metric === 'rotation_structure' ? 'Three undated campaigns' : 'Daily'}</option><option value="weekly">7-day groups</option></select></label><button className="primary-button" type="submit" disabled={pending || missing}>{pending ? <><LoaderCircle size={17} className="loading-icon" />Preparing chart…</> : 'Create chart'}</button></form>
      {missing && <p className="chart-missing">{spec.metric === 'rotation_structure' ? 'Compare your three sequences first.' : 'Load a historical period or the labelled saved example first.'} <button className="text-button" onClick={spec.metric === 'rotation_structure' ? onPlanning : onClimate}>{spec.metric === 'rotation_structure' ? 'Open Rotation planner' : 'Open NASA climate'}</button></p>}
      <p className="helper-text">Rainfall sums need every day in a group. Temperature means use available days and mark partial data. Groups start on the selected period’s first day; the last group can be shorter.</p><button className="secondary-button" onClick={() => onAsk(spec)}>Ask Pacha to make a chart</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
    <p className="chart-library-note" role="status">{charts.length ? `${charts.length} of 6 chart snapshots in this session. Their source and period stay fixed when you change the field. Export to keep a copy.` : 'Your prepared charts will appear here. Start with NASA climate if you do not have observations yet.'}</p>
    <div className="chart-library">{charts.map((chart) => <ChartCard chart={chart} key={chart.id} onRemove={() => onRemove(chart.id)} />)}</div>
  </div>
}
