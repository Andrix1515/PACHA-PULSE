import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowDownToLine, GitCompareArrows, Info, LoaderCircle, Route } from 'lucide-react'
import type { AgriculturalProfile, ClimateResponse, CompareResponse, CropId, Rotation, UserRole } from '../../types'
import { requestJson } from '../../services/api'

const cropNames: Record<CropId, string> = { maize: 'Maíz', wheat: 'Trigo', potato: 'Papa', bean: 'Frijol', lentil: 'Lenteja', quinoa: 'Quinua', fallow: 'Descanso / barbecho' }
const initialRotations: Rotation[] = [{ name: 'Habitual / referencia', crops: ['maize', 'maize', 'maize'] }, { name: 'Alternativa A', crops: ['maize', 'bean', 'maize'] }, { name: 'Alternativa B', crops: ['maize', 'potato', 'bean'] }]

export default function RotationPlanner({ climate, profile, role }: { climate: ClimateResponse | null; profile: AgriculturalProfile; role: UserRole }) {
  const [rotations, setRotations] = useState<Rotation[]>(initialRotations)
  const [percent, setPercent] = useState(100)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  const climateKey = climate ? `${climate.lat}/${climate.lon}/${climate.start}/${climate.end}/${climate.retrieved_at}` : ''
  useEffect(() => { request.current?.abort(); setResult(null); setLoading(false) }, [climateKey, profile.soil, profile.water])
  useEffect(() => () => request.current?.abort(), [])
  function invalidate() { request.current?.abort(); setLoading(false); setResult(null); setError('') }
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
    try {
      const data = await requestJson<CompareResponse>('/rotations/compare', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ rotations, rainfall_percent: percent, habitual_confirmed: confirmed, soil: profile.soil, water: profile.water,
          climate: climate ? { lat: climate.lat, lon: climate.lon, start: climate.start, end: climate.end, saved_example: climate.delivery === 'saved_observation' } : null }),
      })
      if (!controller.signal.aborted) setResult(data)
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'No se pudo comparar. Reintenta.')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }
  function exportResult() {
    if (!result) return
    const blob = new Blob([JSON.stringify({ rotations, climate, profile, comparison: result }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'pacha-pulse-comparacion.json'; link.click(); URL.revokeObjectURL(url)
  }
  return <section className="panel planner-panel" aria-labelledby="planner-heading">
    <div className="panel-title"><div><span className="eyebrow">TRES CAMPAÑAS · TRES CAMINOS</span><h2 id="planner-heading"><Route size={20} />Compara tus rotaciones</h2></div><GitCompareArrows size={22} /></div>
    <div className="planner-body"><p className="muted">Parte de tu secuencia habitual y cambia las alternativas. Los valores iniciales son ejemplos ilustrativos, sin validar para tu parcela.</p><p className="helper-text">{role === 'grower' ? '¿Qué siembras primero, después y al final? Cada columna es una campaña. Cambia las alternativas y vuelve a comparar.' : 'Análisis estructural de tres secuencias. Revisa los conteos, la referencia climática y los insumos pendientes; no hay evaluación de aptitud.'}</p>
      <div className="rotation-editors">{rotations.map((rotation, index) => <fieldset key={rotation.name} className={`rotation-editor rotation-${index}`}><legend>{rotation.name}</legend><p>{index === 0 ? 'Edita para representar tu manejo actual.' : 'Explora una secuencia diferente.'}</p><div className="campaign-fields">{rotation.crops.map((crop, campaign) => <label key={campaign}>Campaña {campaign + 1}<select aria-label={`${rotation.name}, campaña ${campaign + 1}`} value={crop} onChange={(event) => updateCrop(index, campaign, event.target.value as CropId)}>{Object.entries(cropNames).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>)}</div></fieldset>)}</div>
      <label className="confirmation-check"><input type="checkbox" checked={confirmed} onChange={(event) => { invalidate(); setConfirmed(event.target.checked) }} />Confirmo que la primera secuencia representa mi rotación habitual.</label>
      <div className="scenario-control"><div><label htmlFor="rainfall-scenario">Escenario de lluvia histórica</label><p>Mismo periodo y lugar, con una hipótesis de variación. No es un pronóstico.</p></div><output htmlFor="rainfall-scenario">{percent} %</output><input id="rainfall-scenario" type="range" min="0" max="150" step="5" value={percent} onChange={(event) => { invalidate(); setPercent(Number(event.target.value)) }} /><div className="scenario-shortcuts"><button type="button" aria-pressed={percent === 100} onClick={() => { invalidate(); setPercent(100) }}>100 % · referencia</button><button type="button" aria-pressed={percent === 70} onClick={() => { invalidate(); setPercent(70) }}>70 % · más seco</button></div><p className="scenario-context">{climate ? `Clima compartido: ${climate.lat.toFixed(4)}°, ${climate.lon.toFixed(4)}° · ${climate.start} a ${climate.end}` : 'Sin clima consultado: podrás comparar estructura, pero la lluvia del escenario quedará sin datos.'}</p></div>
      <p className="helper-text">Suelo y manejo del agua: los guardados en tu perfil. Las campañas no tienen fechas asignadas y no se presupone una estación por hemisferio.</p>
      <button className="primary-button compare-button" onClick={() => void run()} disabled={loading}>{loading ? <><LoaderCircle size={17} className="loading-icon" />Comparando…</> : <><GitCompareArrows size={18} />Comparar tres rotaciones</>}</button>
      {error && <p className="field-error" role="alert">{error}</p>}
      {result && <div className="comparison-result" aria-label="Resultados de comparación de rotaciones"><div className="section-title"><h3>Lo que cambia entre tus opciones</h3><button className="text-button" onClick={exportResult}><ArrowDownToLine size={15} />Exportar comparación</button></div>
        <div className="scenario-result"><span>Hipótesis sobre la lluvia del periodo</span><strong>{result.scenario_rainfall.value === null ? 'Sin datos climáticos completos' : `${result.scenario_rainfall.value.toFixed(1)} mm`}</strong><p>{result.baseline_rainfall?.value !== null && result.baseline_rainfall ? `${result.baseline_rainfall.value.toFixed(1)} mm históricos × ${result.rainfall_percent} % · escenario, igual para las tres secuencias.` : 'Consulta un periodo climático completo en Monitorear para añadir este contexto.'}</p><small>No es agua disponible para riego ni demanda hídrica de las campañas.</small></div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabla desplazable de comparación de rotaciones"><table className="comparison-table"><caption>Indicadores derivados solo de las secuencias ingresadas. No hay ranking de aptitud.</caption><thead><tr><th scope="col">Secuencia</th><th scope="col">Cultivos distintos</th><th scope="col">Repeticiones seguidas</th><th scope="col">Descansos</th></tr></thead><tbody>{result.results.map((row) => <tr key={row.name}><th scope="row">{row.name}<span className="table-sequence">{row.labels.join(' → ')}</span></th><td>{row.distinct_crops.value}</td><td>{row.consecutive_repetitions.value}</td><td>{row.fallow_campaigns.value}</td></tr>)}</tbody></table></div>
        <div className="tradeoff-grid">{result.results.map((row) => <article key={row.name}><h4>{row.name}</h4><div className="sequence-chips">{row.labels.map((crop, index) => <span key={index}>{index ? <ArrowRight size={12} /> : null}{crop}</span>)}</div><ul>{row.tradeoffs.map((text) => <li key={text}>{text}</li>)}</ul></article>)}</div>
        <div className="assessment-note"><Info size={20} /><div><h4>Lo que aún falta para decidir</h4><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></div>
        <details className="method-details" open={role === 'agronomist' || undefined}><summary>Cómo se calculó y de dónde vienen los datos</summary><p>{result.method}</p><p>Campañas de descanso se excluyen de “cultivos distintos”. “Repeticiones seguidas” cuenta pares adyacentes del mismo cultivo, sin barbecho. Ningún conteo es un indicador de rendimiento.</p><p>Fuente estructural: escenarios ingresados por ti. Periodo: tres campañas sin fechas. Demanda hídrica, rendimiento y rentabilidad: no disponibles.</p>{result.baseline_rainfall && <p>Base climática: {result.baseline_rainfall.source}, {result.baseline_rainfall.observed_at}. Descarga: {result.baseline_rainfall.retrieved_at}. {result.baseline_rainfall.spatial_resolution}.</p>}</details>
      </div>}
    </div>
  </section>
}
