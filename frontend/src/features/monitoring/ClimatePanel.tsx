import { useEffect, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownToLine, CloudSun, Database, LoaderCircle } from 'lucide-react'
import type { ClimateResponse, Location, UserRole } from '../../types'

interface Props {
  location: Location | null
  climate: ClimateResponse | null
  loading: boolean
  error: string
  onLoad: (start: string, end: string, demo?: boolean) => Promise<void>
  role: UserRole
}

export default function ClimatePanel({ location, climate, loading, error, onLoad, role }: Props) {
  const [start, setStart] = useState('2025-01-01')
  const [end, setEnd] = useState('2025-01-31')
  const [validation, setValidation] = useState('')
  const [showTable, setShowTable] = useState(role === 'agronomist')
  useEffect(() => { setShowTable(role === 'agronomist') }, [role])
  function query() {
    if (!start || !end || start > end || (new Date(end).getTime() - new Date(start).getTime()) / 86400000 > 365) {
      setValidation('Select a valid period of at most 366 days.'); return
    }
    setValidation('')
    void onLoad(start, end)
  }
  function download() {
    if (!climate) return
    const blob = new Blob([JSON.stringify(climate, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `pacha-pulse-power-${climate.start}.json`; anchor.click()
    URL.revokeObjectURL(url)
  }
  const chartData = climate?.data.map((row) => ({ ...row, day: row.date.slice(5) })) || []
  return <section className="panel climate-panel" aria-labelledby="climate-heading">
    <div className="panel-title"><div><span className="eyebrow">HISTORICAL OBSERVATIONS · NASA POWER</span><h2 id="climate-heading"><CloudSun size={21} />Weather at your location</h2></div><span className="subtle-tag">Real source</span></div>
    <div className="climate-body">
      {role === 'grower' && <p className="helper-text">What temperatures and rainfall occurred? This summary provides context; it does not diagnose crops or predict harvests.</p>}
      <p className="muted">Explore historical temperature and rainfall. Confirm the dates before loading; these are not forecasts.</p>
      <div className="query-controls"><label>Start date<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>End date<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label><button className="primary-button" disabled={loading || !location} onClick={query}>{loading ? <><LoaderCircle size={16} className="loading-icon" />Loading…</> : 'Load NASA POWER'}</button></div>
      {!location && <p className="helper-text">Choose a location in My field, or start with the saved example.</p>}
      <button className="demo-button" disabled={loading} onClick={() => { setStart('2025-01-01'); setEnd('2025-01-31'); setValidation(''); void onLoad('2025-01-01', '2025-01-31', true) }}><Database size={17} />Open real example: Mantaro Valley · January 2025</button>
      {(validation || error) && <p className="field-error" role="alert">{validation || error}</p>}
      {loading && <p role="status" className="helper-text">Loading observations. This can take up to a minute. You do not need to move the map.</p>}
      {climate && <div className="climate-result" aria-label="NASA POWER weather results">
        <div className="climate-result-header"><span className="result-badge">{climate.delivery === 'saved_observation' ? 'Authentic saved observation' : climate.delivery === 'cache' ? 'Locally cached observation' : 'Live NASA request'}</span><button className="text-button" onClick={download}><ArrowDownToLine size={15} />Export data</button></div>
        <p className="helper-text">Location: {climate.lat.toFixed(4)}°, {climate.lon.toFixed(4)}° · Period: {climate.start} a {climate.end} · UTC</p>
        <div className="climate-metrics"><article><span>Average temperature for the period</span><strong>{climate.summary.temperature_mean.value === null ? 'No data' : `${climate.summary.temperature_mean.value.toFixed(1)} °C`}</strong><small>Calculated from daily averages · {climate.summary.temperature_mean.quality === 'complete' ? 'complete series' : 'partial series'}</small></article><article><span>Total rainfall for the period</span><strong>{climate.summary.rainfall_total.value === null ? 'Incomplete data' : `${climate.summary.rainfall_total.value.toFixed(1)} mm`}</strong><small>Calculated · not irrigation water</small></article></div>
        <div className="climate-chart" role="img" aria-label="Historical chart of daily temperature in Celsius and daily rainfall in millimeters. Exact values are available in the table."><ResponsiveContainer width="100%" height={280}><ComposedChart data={chartData} margin={{ top: 15, right: 4, bottom: 0, left: -15 }}><CartesianGrid stroke="#e5e9df" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: '#53654d' }} minTickGap={35} /><YAxis yAxisId="temperature" tick={{ fontSize: 11, fill: '#53654d' }} unit="°C" width={55} /><YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 11, fill: '#53654d' }} unit="mm" width={53} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar yAxisId="rain" dataKey="PRECTOTCORR" name="Rainfall (mm/day)" fill="#9fc1b5" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Line yAxisId="temperature" type="linear" dataKey="T2M" name="Temperature (°C)" stroke="#985029" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>
        <div className="climate-provenance"><p><strong>Source:</strong> {climate.source} · API {climate.product_version}</p><p><strong>Retrieved:</strong> {new Date(climate.retrieved_at).toLocaleString('en', { timeZone: 'UTC' })} (UTC) · Quality: {climate.quality === 'complete' ? 'complete' : 'missing values'}</p><p>{climate.spatial_resolution}. Mountain conditions may differ from your field.</p><a href={climate.request_url} target="_blank" rel="noreferrer">View the original NASA POWER request ↗</a></div>
        <button className="text-button table-toggle" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>{showTable ? 'Hide' : 'Show'} observation table</button>
        {showTable && <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable weather observations table"><table><caption>Historical NASA POWER data; “—” means missing data.</caption><thead><tr><th scope="col">UTC date</th><th scope="col">Average °C</th><th scope="col">Min. °C</th><th scope="col">Max. °C</th><th scope="col">Rainfall mm/day</th></tr></thead><tbody>{climate.data.map((row) => <tr key={row.date}><th scope="row">{row.date}</th><td>{row.T2M ?? '—'}</td><td>{row.T2M_MIN ?? '—'}</td><td>{row.T2M_MAX ?? '—'}</td><td>{row.PRECTOTCORR ?? '—'}</td></tr>)}</tbody></table></div>}
      </div>}
    </div>
  </section>
}
