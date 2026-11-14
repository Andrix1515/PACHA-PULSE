import { lazy, Suspense, useEffect, useState } from 'react'
import { ArrowUpRight, Check, Compass, Earth, Info, Leaf, MapPin, Route, Sprout } from 'lucide-react'
import ApiStatus from '../components/ApiStatus'
import DataAvailability from '../components/DataAvailability'
import LocationMap from '../features/map/LocationMap'
import CoordinateForm from '../features/parcel/CoordinateForm'
import ProfileForm from '../features/parcel/ProfileForm'
import { useClimate } from './useClimate'
import RotationPlanner from '../features/rotations/RotationPlanner'
import ProjectPage from '../features/project/ProjectPage'
import { useParcelBoundary } from '../features/parcel/useParcelBoundary'
import { representativePoint } from '../features/parcel/geometry'
import type { AgriculturalProfile, UserRole, WorkspaceView } from '../types'

const initialProfile: AgriculturalProfile = { name: '', crop: '', areaHa: null, soil: 'unknown', water: 'unknown', previousRotation: '' }
const ClimatePanel = lazy(() => import('../features/monitoring/ClimatePanel'))
const isProjectPage = () => !['#demo', '#main', '#monitorear', '#planificar'].includes(window.location.hash)

export default function App() {
  const [projectPage, setProjectPage] = useState(isProjectPage)
  const [view, setView] = useState<WorkspaceView>(() => window.location.hash === '#planificar' ? 'planning' : 'monitoring')
  const parcel = useParcelBoundary()
  const { location, climate, loading, error, selectLocation: setLocation, load } = useClimate(parcel.boundary ? { ...representativePoint(parcel.boundary), source: 'parcel' } : null)
  const [profile, setProfile] = useState<AgriculturalProfile>(initialProfile)
  const [role, setRole] = useState<UserRole>('grower')
  const technical = role === 'agronomist'
  const [plannerOpened, setPlannerOpened] = useState(() => window.location.hash === '#planificar')
  const planning = view === 'planning'
  useEffect(() => { if (planning) setPlannerOpened(true) }, [planning])
  useEffect(() => {
    const onHash = () => {
      setProjectPage(isProjectPage())
      if (window.location.hash === '#planificar') setView('planning')
      if (window.location.hash === '#monitorear') setView('monitoring')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    document.title = projectPage ? 'Pacha Pulse · Cultiva una nueva perspectiva' : 'Pacha Pulse · Demo de monitoreo y rotaciones'
    window.scrollTo(0, 0)
  }, [projectPage])

  if (projectPage) return <ProjectPage />

  return <div className="app-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <aside className="sidebar">
      <a className="brand" href="#main" aria-label="Pacha Pulse, ir al contenido"><span className="brand-icon"><Sprout size={25} /></span><span>Pacha<span className="brand-light"> Pulse</span><small>EL CAMPO EN PERSPECTIVA</small></span></a>
      <p className="nav-caption">TU ESPACIO DE TRABAJO</p>
      <nav aria-label="Recorridos principales">{([{ id: 'monitoring', title: 'Monitorear', subtitle: 'Tus cultivos, hoy', Icon: Compass }, { id: 'planning', title: 'Planificar', subtitle: 'Tu próxima campaña', Icon: Route }] as const).map(({ id, title, subtitle, Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}><Icon size={21} /><span>{title}<small>{subtitle}</small></span><ArrowUpRight size={16} className="nav-arrow" /></button>)}</nav>
      <div className="sidebar-note"><Leaf size={26} strokeWidth={1.4} /><h2>Decisiones con contexto.</h2><p>Explora tu campo, conoce lo que falta y compara posibilidades.</p><span>La tierra cambia. Tu perspectiva también.</span></div>
      <div className="sidebar-footer"><a className="project-backlink" href="#proyecto">Sobre el proyecto <ArrowUpRight size={14} /></a><span className="local-badge"><span className="status-dot" />DEMO LOCAL</span><p>Pacha Pulse · 2026</p></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><a href="#proyecto" aria-label="Volver a la página del proyecto">Proyecto</a><span>/</span><strong>{planning ? 'Planificar' : 'Monitorear'}</strong></div><div className="topbar-actions"><ApiStatus /><label className="role-selector">Modo de trabajo<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="grower">Cultivador</option><option value="agronomist">Agrónomo</option></select></label></div></header>
      <main id="main" tabIndex={-1}>
        <div className="page-intro"><div><p className="eyebrow"><span className="mini-line" />{planning ? 'MIRA HACIA LA SIGUIENTE CAMPAÑA' : 'CADA CAMPO TIENE UNA HISTORIA'}</p><h1>{planning ? 'Dale perspectiva al futuro.' : 'Conoce mejor tu campo.'}</h1><p className="intro-description">{planning ? 'Empieza por tu contexto. Las alternativas se compararán con sus riesgos, supuestos y datos disponibles.' : 'Ubica tu parcela y reúne el contexto para entender tus cultivos y preparar lo que viene.'}</p></div><span className="phase-tag"><Sprout size={15} />Base de trabajo</span></div>
        <div className="onboarding-strip"><span className={`step ${location ? 'done' : ''}`}><b>{location ? <Check size={14} /> : '1'}</b>Selecciona una ubicación</span><span className="step-connector" /><span className={`step ${profile.name || profile.crop ? 'done' : ''}`}><b>{profile.name || profile.crop ? <Check size={14} /> : '2'}</b>Completa tu perfil</span><span className="step-connector" /><span className="step"><b>3</b>{planning ? 'Prepara la comparación' : 'Explora el contexto'}</span></div>
        <section className="role-guidance" aria-label="Orientación por perfil"><strong>{technical ? 'Modo Agrónomo' : 'Modo Cultivador'}</strong><p>{technical ? 'Revisa geometría WGS84, tabla de observaciones, parámetros y método. La procedencia técnica está ampliada; los cálculos son compartidos con el cultivador.' : planning ? '1. Confirma tu parcela y lo que cultivas. 2. Edita tu rotación habitual y dos alternativas. 3. Compara y revisa qué información falta antes de decidir.' : '1. Ubica o dibuja tu campo. 2. Completa solo lo que conozcas. 3. Consulta el clima y revisa el resumen; la tabla está disponible si necesitas los valores exactos.'}</p></section>
        <div className="main-grid">
          <div className="main-column">
            <section className="panel location-panel" aria-labelledby="location-heading"><div className="panel-title"><div><span className="eyebrow">TU PUNTO DE PARTIDA</span><h2 id="location-heading"><MapPin size={20} />¿Dónde está tu campo?</h2></div><span className="subtle-tag"><Earth size={14} />Mapa global</span></div>
              <LocationMap location={location} onSelect={setLocation} role={role} boundary={parcel.boundary} storageMessage={parcel.storageMessage} onSaveBoundary={(next) => { parcel.save(next); if (next) setLocation({ ...representativePoint(next), source: 'parcel' }) }} />
              <CoordinateForm location={location} onSelect={setLocation} />
              <p className={`location-status ${location ? 'selected' : ''}`} role="status">{location ? <><Check size={15} />Ubicación seleccionada: {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}° · {location.source === 'map' ? 'mapa' : location.source === 'parcel' ? 'referencia de parcela' : 'entrada manual'}</> : <><MapPin size={15} />Aún no seleccionaste una ubicación.</>}</p>
            </section>
            {view === 'monitoring' && <Suspense fallback={<p className="helper-text" role="status">Cargando panel climático…</p>}><ClimatePanel location={location} climate={climate} loading={loading} error={error} onLoad={load} role={role} /></Suspense>}
            <div hidden={!planning}>{(planning || plannerOpened) && <RotationPlanner climate={climate} profile={profile} role={role} />}</div>
            <DataAvailability view={view} location={location} profile={profile} climate={climate} onNavigate={setView} />
          </div>
          <div className="right-column"><ProfileForm profile={profile} onSave={setProfile} /><aside className="transparency-note"><Info size={19} /><div><h2>Datos claros, decisiones tuyas.</h2><p>NASA POWER ofrece contexto climático histórico. MODIS NDVI todavía no está integrado.</p><p>El mapa no indica cobertura ni aptitud agrícola. El clima de rejilla puede diferir de tu parcela.</p></div></aside></div>
        </div>
        {technical && <section className="technical-panel" aria-labelledby="technical-heading"><h2 id="technical-heading">Procedencia y estado técnico</h2><dl><div><dt>Ubicación y perfil</dt><dd>user_input · sesión del navegador, sin persistencia</dd></div><div><dt>Clima / vegetación</dt><dd>{climate ? `observed · NASA POWER ${climate.product_version}; MODIS unavailable` : 'NASA POWER disponible para consulta; MODIS unavailable'}</dd></div><div><dt>Indicadores</dt><dd>{climate ? 'derived · media de temperatura y suma de precipitación del periodo' : 'unavailable · consulta el clima para obtener indicadores'}</dd></div><div><dt>Modelo predictivo</dt><dd>No instalado · ML fuera de esta demo</dd></div></dl></section>}
        <footer className="page-footer"><span><Sprout size={15} />Pacha Pulse · Cultiva una nueva perspectiva.</span><span>Apoyo a decisiones · no sustituye asesoramiento profesional</span></footer>
      </main>
    </div>
  </div>
}
