import { CloudSun, Droplets, Leaf, ArrowUpRight, CircleHelp, Route } from 'lucide-react'
import type { WorkspaceView, AgriculturalProfile, ClimateResponse, Location } from '../types'

export default function DataAvailability({ view, location, profile, climate, onNavigate }: { view: WorkspaceView; location: Location | null; profile: AgriculturalProfile; climate: ClimateResponse | null; onNavigate: (view: WorkspaceView) => void }) {
  const planning = view === 'planning'
  return <section className="availability-section" aria-labelledby="availability-heading">
    <div className="section-title"><h2 id="availability-heading">{planning ? 'Preparar la próxima campaña' : 'Una mirada a tus cultivos'}</h2><span className="subtle-tag">{planning ? 'Planificación' : 'Monitoreo'}</span></div>
    {!planning && <div className="data-grid">
      {[
        { title: 'Clima histórico', label: 'NASA POWER · bajo consulta', text: 'Consulta temperaturas y precipitación reales en el panel de arriba.', Icon: CloudSun },
        { title: 'Vegetación', label: 'MODIS NDVI · pendiente', text: 'La disponibilidad dependerá de la ubicación y la calidad.', Icon: Leaf },
        { title: 'Evolución', label: 'Análisis pendiente', text: 'Sin observaciones todavía para describir cambios.', Icon: Droplets },
      ].map(({ title, label, text, Icon }, index) => <article className="data-card" key={title}><Icon size={21} strokeWidth={1.6} /><h3>{title}</h3><span className="unavailable">{climate && index !== 1 ? 'Ver datos consultados arriba' : 'No disponible'}</span><p>{climate && index === 2 ? 'Media de temperatura y lluvia acumulada, con fuente y calidad.' : text}</p><span className="source-label">{climate && index === 2 ? 'Indicadores descriptivos · sin pronóstico' : label}</span></article>)}
    </div>}
    {planning && <div className="context-summary" aria-label="Contexto compartido de planificación"><strong>Tu punto de partida</strong><p>{location ? `${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}°` : 'Ubicación sin seleccionar'} · {profile.crop || 'Cultivo sin especificar'} · {profile.name || 'Parcela sin nombre'}</p><p>Rotación previa: {profile.previousRotation || 'Sin especificar'}. Suelo y agua se conservaron en tu perfil. La comparación es exploratoria; no determina una mejor siembra.</p></div>}
    <div className="next-step"><div className="next-step-icon"><CircleHelp size={21} /></div><div><h3>{planning ? 'Primero, conoce tu punto de partida' : 'Del presente a la próxima campaña'}</h3><p>{planning ? 'Revisa el contexto de tus cultivos antes de explorar futuras alternativas.' : 'Tu ubicación y perfil también estarán disponibles al planificar rotaciones.'}</p></div><button className="text-button" onClick={() => onNavigate(planning ? 'monitoring' : 'planning')}>{planning ? 'Ir a Monitorear' : 'Ir a Planificar'}<ArrowUpRight size={17} /></button></div>
  </section>
}
