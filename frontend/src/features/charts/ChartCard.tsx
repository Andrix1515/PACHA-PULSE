import { useId } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownToLine, Trash2 } from 'lucide-react'
import type { ChartArtifact } from '../../types'

function download(artifact: ChartArtifact, csv = false) {
  const quote = (value: unknown) => {
    const text = String(value ?? '')
    const safe = typeof value === 'string' && /^[=+@\-\t\r]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  const content = csv ? [[quote('Period / sequence'), ...artifact.series.map((series) => quote(`${series.label} (${series.unit})`))].join(','), ...artifact.rows.map((row) => [quote(row.label), ...artifact.series.map((series) => quote(row[series.key]))].join(','))].join('\r\n') : JSON.stringify(artifact, null, 2)
  const url = URL.createObjectURL(new Blob([content], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `pacha-${artifact.spec.metric}-${artifact.id.slice(0, 8)}.${csv ? 'csv' : 'json'}`; anchor.click(); URL.revokeObjectURL(url)
}

export default function ChartCard({ chart, onRemove }: { chart: ChartArtifact; onRemove: () => void }) {
  const titleId = useId()
  const colors = ['#315d44', '#a35529', '#637bba']
  return <article className="panel prepared-chart" aria-labelledby={titleId}>
    <div className="panel-title"><div><p className="eyebrow">SERVER-CALCULATED · {chart.quality.toUpperCase()} DATA</p><h2 id={titleId}>{chart.title}</h2></div><button className="icon-button" aria-label={`Remove ${chart.title} chart`} onClick={onRemove}><Trash2 size={19} /></button></div>
    <p className="chart-explanation">{chart.description}</p>
    <div className="prepared-chart-graphic" role="img" aria-label={`${chart.title}. ${chart.rows.length} groups, ${chart.series.map((series) => `${series.label} in ${series.unit}`).join(', ')}. Exact values and missing data are available in the table below.`}>
      <ResponsiveContainer width="100%" height={290}><ComposedChart data={chart.rows} margin={{ top: 16, right: 12, bottom: 5, left: 0 }}><CartesianGrid stroke="#dce1ce" vertical={false} /><XAxis dataKey="label" minTickGap={45} tick={{ fontSize: 10, fill: '#526448' }} tickFormatter={(value: string) => chart.spec.metric === 'rotation_structure' ? value : value.slice(5, 10)} /><YAxis tick={{ fontSize: 11, fill: '#526448' }} allowDecimals={chart.spec.metric !== 'rotation_structure'} unit={chart.series[0].unit === 'count' ? '' : chart.series[0].unit} width={60} /><Tooltip formatter={(value, name) => [`${value ?? 'Missing'} ${chart.series.find((series) => series.label === name)?.unit || ''}`, name]} /><Legend wrapperStyle={{ fontSize: 12 }} />{chart.series.map((series, index) => chart.spec.chart_type === 'line' ? <Line key={series.key} dataKey={series.key} name={series.label} stroke={colors[index]} strokeWidth={2.5} dot={chart.rows.length <= 12} connectNulls={false} isAnimationActive={false} /> : <Bar key={series.key} dataKey={series.key} name={series.label} fill={colors[index]} radius={[3, 3, 0, 0]} isAnimationActive={false} />)}</ComposedChart></ResponsiveContainer>
    </div>
    <p className="chart-source"><strong>Source:</strong> {chart.source}<br /><strong>Period:</strong> {chart.period}<br /><strong>Retrieved:</strong> {chart.retrieved_at}<br />{chart.spatial_resolution} · derived, {chart.quality}</p>
    <details className="chart-values"><summary>Exact values and limitations</summary><div className="table-scroll" role="region" aria-label={`${chart.title} values`} tabIndex={0}><table><caption>Derived values. “—” means missing; it is not zero.</caption><thead><tr><th scope="col">Period / sequence</th>{chart.series.map((series) => <th scope="col" key={series.key}>{series.label} ({series.unit})</th>)}</tr></thead><tbody>{chart.rows.map((row, index) => <tr key={index}><th scope="row">{row.label}</th>{chart.series.map((series) => <td key={series.key}>{row[series.key] ?? '—'}</td>)}</tr>)}</tbody></table></div><ul>{chart.limitations.map((text) => <li key={text}>{text}</li>)}</ul></details>
    <div className="chart-downloads"><button className="text-button" onClick={() => download(chart)}><ArrowDownToLine size={16} />Export chart JSON</button><button className="text-button" onClick={() => download(chart, true)}>Export values CSV</button></div>
  </article>
}
