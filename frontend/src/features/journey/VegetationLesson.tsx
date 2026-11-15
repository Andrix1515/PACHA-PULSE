import { useEffect, useRef, useState } from 'react'
import { Leaf, RefreshCw } from 'lucide-react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Location, UserRole, VegetationResponse, NdviPredictionResponse, MonitoringAnalysisResponse } from '../../types'
import { fetchVegetation, analyzeMonitoring, predictNdvi } from '../../services/api'

export default function VegetationLesson({ location, role, onData, onPrediction }: { location: Location | null; role: UserRole; onData?: (data: VegetationResponse | null) => void; onPrediction?: (data: NdviPredictionResponse | null) => void }) {
  const [start, setStart] = useState('2023-01-01'), [end, setEnd] = useState('2025-12-31')
  const [data, setData] = useState<VegetationResponse | null>(null)
  const [prediction, setPrediction] = useState<NdviPredictionResponse | null>(null)
  const [analysis, setAnalysis] = useState<MonitoringAnalysisResponse | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [refresh, setRefresh] = useState(false)
  const request = useRef<AbortController | null>(null)
  const key = `${location?.lat}/${location?.lon}/${start}/${end}`
  useEffect(() => { request.current?.abort(); setData(null); setPrediction(null); setAnalysis(null); setError(''); setBusy(false); return () => request.current?.abort() }, [key])
  async function read() {
    if (!location) return
    if (!start || !end || start > end || (Date.parse(end)-Date.parse(start))/86400000 > 1096) { setError('Choose up to three years, with the start before the end.'); return }
    request.current?.abort(); const controller = new AbortController(); request.current = controller
    setBusy(true); setError('')
    try {
      const result = await fetchVegetation(location, start, end, refresh, controller.signal)
      if (controller.signal.aborted) return
      setData(result); onData?.(result)
      const [model, monitoring] = await Promise.allSettled([predictNdvi(location, false, controller.signal), analyzeMonitoring(location,start,end,controller.signal)])
      if (controller.signal.aborted) return
      if (model.status === 'fulfilled') { setPrediction(model.value); onPrediction?.(model.value) }
      if (monitoring.status === 'fulfilled') setAnalysis(monitoring.value)
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'The satellite source could not respond.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  async function sync() {
    if (!location) return
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true); setError('')
    try { const result = await predictNdvi(location,true,controller.signal); if (!controller.signal.aborted) { setPrediction(result); onPrediction?.(result) } }
    catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Update could not be requested.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  const valid = data?.data.filter((row) => row.ndvi !== null) ?? []
  const latest = valid.at(-1)
  const metadata = (prediction?.model_metadata ?? prediction?.adaptive_ml) as {model_version?:string;trained_at?:string;training_window_start?:string;training_window_end?:string;metrics?:Record<string,number|null>;last_attempt?:{status?:string}} | undefined
  const syncInfo = prediction?.ingestion_sync as {last_power_date?:string;last_modis_date?:string;last_sync_at?:string} | undefined
  return <section className="vegetation-lesson" aria-labelledby="climate-scene-heading">
    <p className="eyebrow">A SATELLITE VIEW, ONE STEP AT A TIME</p>
    <h1 id="climate-scene-heading" tabIndex={-1}>How green was<br />the canopy?</h1>
    <p className="scene-description">Satellites record greenness around your field. A greener canopy does not tell us the harvest or explain a crop problem.</p>
    {!location ? <p role="status">Choose a field point to read its satellite history.</p> : <>
      <p className="helper-text">Selected point: {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°. One satellite pixel covers about 6.25 hectares.</p>
      <div className="weather-date-fields"><label>Satellite start date<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Satellite end date<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>
      <label className="satellite-refresh"><input type="checkbox" checked={refresh} onChange={(event) => setRefresh(event.target.checked)} />Check NASA for this period</label>
      <p className="helper-text">Leave unchecked to read stored observations. Mantaro has an authentic saved example for 2023–2025.</p>
      <button className="primary-button" disabled={busy} onClick={() => void read()}><Leaf size={19} />{busy ? 'Reading the available evidence…' : 'Read canopy history'}</button>
    </>}
    {error && <p role="alert" className="field-error">{error}</p>}
    {data && <div className="canopy-reading"><h2>{latest ? `Greenness: ${latest.ndvi!.toFixed(2)}` : 'No usable greenness reading'}</h2><p>{latest ? `${latest.date} · ${latest.quality} quality · historical NDVI` : 'Missing satellite data stays unknown. Try a different period or explicitly check NASA.'}</p>
      <p>{data.summary.valid_composites_count} usable composites · {data.summary.cloudy_composites_count} missing or unreliable. Lines stop at missing readings.</p>
      {data.data.length > 0 && <div className="story-chart" role="img" aria-label="Historical MODIS NDVI. Gaps are missing readings; exact values are available below."><ResponsiveContainer width="100%" height={240}><ComposedChart data={data.data}><CartesianGrid stroke="#d2d9bf" vertical={false} /><XAxis dataKey="date" minTickGap={55} tick={{fontSize:12,fill:'#455b3d'}} /><YAxis domain={[-.2,1]} width={42} tick={{fontSize:12,fill:'#455b3d'}} /><Tooltip /><Line dataKey="ndvi" name="NDVI" stroke="#416b38" strokeWidth={3} dot={false} connectNulls={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>}
      <details open={role === 'agronomist' || undefined}><summary>Satellite source, quality and exact readings</summary><p>{data.source} · {data.spatial_resolution} · retrieved {data.retrieved_at || 'unavailable'}</p><div className="table-scroll" tabIndex={0} role="region" aria-label="MODIS exact readings"><table><caption>Historical 16-day composites. Missing values are not zero.</caption><thead><tr><th scope="col">Composite start</th><th scope="col">NDVI</th><th scope="col">EVI</th><th scope="col">QA</th></tr></thead><tbody>{data.data.map((row) => <tr key={row.date}><th scope="row">{row.date}</th><td>{row.ndvi ?? 'Unavailable'}</td><td>{row.evi ?? 'Unavailable'}</td><td>{row.quality}</td></tr>)}</tbody></table></div><ul>{data.limitations.map((text) => <li key={text}>{text}</li>)}</ul></details>
    </div>}
    {prediction && <div className="canopy-reading"><h2>A cautious look ahead</h2>{prediction.status === 'predicted' && prediction.predicted_ndvi ? <><p className="canopy-outlook">{prediction.predicted_ndvi.value.toFixed(2)} NDVI · {prediction.target_date}</p><p>Experimental estimate for the next composite, 16 days after the last composite window. Publication lag reduces the time left until that date. This is greenness, not yield.</p></> : <p>{prediction.reason || 'No validated outlook is available for this point.'}</p>}
      <button className="secondary-button" disabled={busy} onClick={() => void sync()}><RefreshCw size={17} />Sync NASA &amp; update model</button>
      {prediction.update_state && <p role="status">Update requested. An offline data worker must finish before new results are available. Read canopy history again after the update.</p>}
      <details open={role === 'agronomist' || undefined}><summary>Model validation and update status</summary><p>{prediction.status.replaceAll('_',' ')} · exact query point coverage only</p><dl><div><dt>Model</dt><dd>{metadata?.model_version || 'Not promoted'}</dd></div><div><dt>Trained</dt><dd>{metadata?.trained_at || 'Not available'}</dd></div>{metadata?.training_window_start && <div><dt>Training period</dt><dd>{metadata.training_window_start} to {metadata.training_window_end}</dd></div>}{Object.entries(metadata?.metrics ?? {}).map(([name,value]) => <div key={name}><dt>{name.replaceAll('_',' ')}</dt><dd>{value === null ? 'Unavailable' : value.toFixed(4)}</dd></div>)}<div><dt>Latest weather / composite</dt><dd>{syncInfo?.last_power_date || 'Not ingested'} / {syncInfo?.last_modis_date || 'Not ingested'}</dd></div></dl><p>The error band uses holdout RMSE; it is not a calibrated confidence interval. No model is promoted unless it beats persistence on the held-out test period.</p></details>
    </div>}
    {analysis && <details className="canopy-reading" open={role === 'agronomist' || undefined}><summary>Changes to discuss with your agronomist</summary><p>These are descriptions of the selected historical period, not diagnoses.</p><dl>{Object.entries(analysis.metrics).map(([name,metric]) => <div key={name}><dt>{name.replaceAll('_',' ')}</dt><dd>{metric.value === null ? 'Unavailable' : Number(metric.value.toFixed(3))} {metric.value !== null && metric.unit}<small>{metric.source}</small></dd></div>)}</dl><p>Complete weather days: {analysis.coverage.complete_weather_days}/{analysis.coverage.expected_weather_days}.</p></details>}
  </section>
}
