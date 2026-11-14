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
      setValidation('Selecciona un periodo válido de hasta 366 días.'); return
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
    <div className="panel-title"><div><span className="eyebrow">OBSERVACIONES HISTÓRICAS · NASA POWER</span><h2 id="climate-heading"><CloudSun size={21} />El clima de tu ubicación</h2></div><span className="subtle-tag">Fuente real</span></div>
    <div className="climate-body">
      {role === 'grower' && <p className="helper-text">¿Qué temperatura y lluvia hubo en este periodo? El resumen te ayuda a revisar el contexto; no diagnostica el cultivo ni anticipa la cosecha.</p>}
      <p className="muted">Consulta temperatura y lluvia históricas. Confirma las fechas antes de consultar; no son pronósticos.</p>
      <div className="query-controls"><label>Desde<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Hasta<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label><button className="primary-button" disabled={loading || !location} onClick={query}>{loading ? <><LoaderCircle size={16} className="loading-icon" />Consultando…</> : 'Consultar NASA POWER'}</button></div>
      {!location && <p className="helper-text">Selecciona una ubicación arriba o comienza con el ejemplo guardado.</p>}
      <button className="demo-button" disabled={loading} onClick={() => { setStart('2025-01-01'); setEnd('2025-01-31'); setValidation(''); void onLoad('2025-01-01', '2025-01-31', true) }}><Database size={17} />Abrir ejemplo real: Valle del Mantaro · enero 2025</button>
      {(validation || error) && <p className="field-error" role="alert">{validation || error}</p>}
      {loading && <p role="status" className="helper-text">Consultando datos. Puede tardar hasta un minuto; no necesitas mover el mapa.</p>}
      {climate && <div className="climate-result" aria-label="Resultados de clima NASA POWER">
        <div className="climate-result-header"><span className="result-badge">{climate.delivery === 'saved_observation' ? 'Observación guardada auténtica' : climate.delivery === 'cache' ? 'Observación en caché local' : 'Consulta NASA en línea'}</span><button className="text-button" onClick={download}><ArrowDownToLine size={15} />Exportar datos</button></div>
        <p className="helper-text">Ubicación: {climate.lat.toFixed(4)}°, {climate.lon.toFixed(4)}° · Periodo: {climate.start} a {climate.end} · UTC</p>
        <div className="climate-metrics"><article><span>Temperatura media del periodo</span><strong>{climate.summary.temperature_mean.value === null ? 'Sin datos' : `${climate.summary.temperature_mean.value.toFixed(1)} °C`}</strong><small>Derivada de medias diarias · {climate.summary.temperature_mean.quality === 'complete' ? 'serie completa' : 'serie parcial'}</small></article><article><span>Lluvia acumulada del periodo</span><strong>{climate.summary.rainfall_total.value === null ? 'Sin datos completos' : `${climate.summary.rainfall_total.value.toFixed(1)} mm`}</strong><small>Derivada · no equivale a agua de riego</small></article></div>
        <div className="climate-chart" role="img" aria-label="Gráfico histórico: temperatura media diaria en grados Celsius y precipitación diaria en milímetros. Los valores exactos están en la tabla."><ResponsiveContainer width="100%" height={280}><ComposedChart data={chartData} margin={{ top: 15, right: 4, bottom: 0, left: -15 }}><CartesianGrid stroke="#e5e9df" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: '#53654d' }} minTickGap={35} /><YAxis yAxisId="temperature" tick={{ fontSize: 11, fill: '#53654d' }} unit="°C" width={55} /><YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 11, fill: '#53654d' }} unit="mm" width={53} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar yAxisId="rain" dataKey="PRECTOTCORR" name="Lluvia (mm/día)" fill="#9fc1b5" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Line yAxisId="temperature" type="linear" dataKey="T2M" name="Temperatura (°C)" stroke="#985029" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>
        <div className="climate-provenance"><p><strong>Fuente:</strong> {climate.source} · API {climate.product_version}</p><p><strong>Descarga:</strong> {new Date(climate.retrieved_at).toLocaleString('es', { timeZone: 'America/Lima' })} (Lima) · Calidad: {climate.quality === 'complete' ? 'completa' : 'con faltantes'}</p><p>{climate.spatial_resolution}. En montaña puede diferir del clima de tu parcela.</p><a href={climate.request_url} target="_blank" rel="noreferrer">Ver consulta original en NASA POWER ↗</a></div>
        <button className="text-button table-toggle" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>{showTable ? 'Ocultar' : 'Ver'} tabla de observaciones</button>
        {showTable && <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable de observaciones climáticas"><table><caption>Datos históricos NASA POWER; “—” indica dato ausente.</caption><thead><tr><th scope="col">Fecha UTC</th><th scope="col">Media °C</th><th scope="col">Mín. °C</th><th scope="col">Máx. °C</th><th scope="col">Lluvia mm/día</th></tr></thead><tbody>{climate.data.map((row) => <tr key={row.date}><th scope="row">{row.date}</th><td>{row.T2M ?? '—'}</td><td>{row.T2M_MIN ?? '—'}</td><td>{row.T2M_MAX ?? '—'}</td><td>{row.PRECTOTCORR ?? '—'}</td></tr>)}</tbody></table></div>}
      </div>}
    </div>
  </section>
}
