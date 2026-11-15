import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowRight, Check, CloudSun, FileText, House, Info, ChartNoAxesCombined, MapPinned, Menu, Route, Sprout, X, CircleHelp } from 'lucide-react'
import ApiStatus from '../components/ApiStatus'
import LocationMap from '../features/map/LocationMap'
import CoordinateForm from '../features/parcel/CoordinateForm'
import ProfileForm from '../features/parcel/ProfileForm'
import { useClimate } from './useClimate'
import RotationPlanner from '../features/rotations/RotationPlanner'
import ProjectPage from '../features/project/ProjectPage'
import PachaCompanion from '../features/assistant/PachaCompanion'
import { useParcelBoundary } from '../features/parcel/useParcelBoundary'
import { representativePoint } from '../features/parcel/geometry'
import type { AgriculturalProfile, AppView, AssistantProposal, ChartArtifact, ClimateResponse, ComparisonInput, CompareResponse, Location, UserRole } from '../types'

const initialProfile: AgriculturalProfile = { name: '', crop: '', areaHa: null, soil: 'unknown', water: 'unknown', previousRotation: '' }
const ClimatePanel = lazy(() => import('../features/monitoring/ClimatePanel'))
const ChartWorkbench = lazy(() => import('../features/charts/ChartWorkbench'))
const modules = [
  { id: 'overview', hash: '#demo', title: 'Overview', Icon: House, description: 'Your next step, in one place.' },
  { id: 'parcel', hash: '#field', title: 'My field', Icon: MapPinned, description: 'Find your field, draw its outline and save what you know.' },
  { id: 'monitoring', hash: '#climate', title: 'NASA climate', Icon: CloudSun, description: 'Understand past rainfall and temperature at your query point.' },
  { id: 'planning', hash: '#rotations', title: 'Rotation planner', Icon: Route, description: 'Explore three planting sequences and a rainfall scenario.' },
  { id: 'charts', hash: '#charts', title: 'Charts', Icon: ChartNoAxesCombined, description: 'Turn your available observations and rotation counts into readable charts.' },
  { id: 'reports', hash: '#reports', title: 'Reports', Icon: FileText, description: 'Review and export your field context and available results.' },
  { id: 'help', hash: '#help', title: 'Help & sources', Icon: CircleHelp, description: 'Learn the workflow, sources and what the demo can tell you.' },
] as const
function route() { const hash = window.location.hash; return modules.find((module) => module.hash === hash)?.id ?? (hash === '#main' ? 'overview' : hash === '#monitorear' ? 'monitoring' : hash === '#planificar' ? 'planning' : null) }
export function climateReference(climate: ClimateResponse | null) { return climate ? { lat: climate.lat, lon: climate.lon, start: climate.start, end: climate.end, saved_example: climate.delivery === 'saved_observation' } : null }
function downloadJson(value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'pacha-pulse-report.json'; link.click(); URL.revokeObjectURL(url) }

export default function App() {
  const [view, setView] = useState<AppView | null>(route)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [companionOpen, setCompanionOpen] = useState(false)
  const [profile, setProfile] = useState<AgriculturalProfile>(initialProfile)
  const [role, setRole] = useState<UserRole>('grower')
  const [notice, setNotice] = useState('')
  const [charts, setCharts] = useState<ChartArtifact[]>([])
  const [assistantTask, setAssistantTask] = useState<{ id: number; text: string } | null>(null)
  const addCharts = useCallback((next: ChartArtifact[]) => setCharts((current) => [...next, ...current.filter((chart) => !next.some((item) => item.id === chart.id))].slice(0, 6)), [])
  const [comparison, setComparison] = useState<{ input: ComparisonInput; result: CompareResponse } | null>(null)
  const [plannerOpened, setPlannerOpened] = useState(route() === 'planning')
  const [fieldOpened, setFieldOpened] = useState(route() === 'parcel')
  const parcel = useParcelBoundary()
  const { location, climate, loading, error, selectLocation, load } = useClimate(parcel.boundary ? { ...representativePoint(parcel.boundary), source: 'parcel' } : null)
  const onComparison = useCallback((next: { input: ComparisonInput; result: CompareResponse } | null) => setComparison(next), [])
  useEffect(() => { const onHash = () => { setView(route()); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'instant' }) }; window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash) }, [])
  useEffect(() => { if (view === 'planning') setPlannerOpened(true); if (view === 'parcel') setFieldOpened(true); document.title = `Pacha Pulse · ${modules.find((module) => module.id === view)?.title || 'A little guidance. A clearer field.'}` }, [view])
  useEffect(() => { setComparison(null) }, [climate, profile.soil, profile.water])
  function navigate(next: AppView) { const module = modules.find((item) => item.id === next)!; window.location.hash = module.hash; setView(next); setMobileMenu(false) }
  function setLocation(next: Location) { selectLocation(next); setComparison(null) }
  function applyProposal(proposal: AssistantProposal) {
    if (proposal.kind === 'navigate' && modules.some((module) => module.id === proposal.view)) navigate(proposal.view!)
    if (proposal.kind === 'update_profile' && proposal.profile) {
      const patch: Partial<AgriculturalProfile> = {}
      for (const key of ['name', 'crop', 'previousRotation'] as const) { const value = proposal.profile[key]; if (typeof value === 'string') patch[key] = value.slice(0, key === 'previousRotation' ? 500 : 80) }
      if (typeof proposal.profile.areaHa === 'number' && Number.isFinite(proposal.profile.areaHa) && proposal.profile.areaHa > 0 && proposal.profile.areaHa <= 1_000_000) patch.areaHa = proposal.profile.areaHa
      if (['unknown', 'sandy', 'loamy', 'clayey', 'other'].includes(proposal.profile.soil || '')) patch.soil = proposal.profile.soil!
      if (['unknown', 'rainfed', 'irrigated', 'mixed'].includes(proposal.profile.water || '')) patch.water = proposal.profile.water!
      setProfile((current) => ({ ...current, ...patch })); setNotice('Your confirmed profile update has been applied. Review it in My field.')
    }
    if (proposal.kind === 'set_location' && proposal.location) { const { lat, lon } = proposal.location; if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { setLocation({ lat, lon, source: 'manual' }); setNotice('Your confirmed query point has been applied. Previous climate results were cleared.') } }
  }
  const module = modules.find((item) => item.id === view)
  if (!view) return <ProjectPage />
  const summary = { project: 'Pacha Pulse', exported_at: new Date().toISOString(), profile: { ...profile, status: 'user_input' }, query_point: location, field: parcel.boundary, climate, comparison: comparison?.result ?? null, comparison_inputs: comparison?.input ?? null, charts, limitations: ['Historical climate is not a forecast or a parcel measurement.', 'Polygon area is approximate, calculated from a user outline.', 'Rotation counts do not establish suitability, yield or profitability.', 'MODIS, soil sensors, pest detection and economic forecasting are not integrated.'] }
  return <div className="app-shell">
    <a className="skip-link" href="#workspace-main" onClick={(event) => { event.preventDefault(); document.getElementById('workspace-main')?.focus() }}>Skip to content</a>
    <aside className={`sidebar ${mobileMenu ? 'menu-open' : ''}`}>
      <a className="brand" href="#project"><span className="brand-icon"><Sprout size={28} /></span><span>Pacha Pulse<small>A LITTLE GUIDANCE. A CLEARER FIELD.</small></span></a>
      <p className="nav-caption">YOUR FIELD NOTEBOOK</p>
      <nav aria-label="Main navigation">{modules.map(({ id, hash, title, Icon }) => <a key={id} href={hash} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined}><Icon size={20} /><span>{title}</span>{view === id && <span className="nav-active-dot" />}</a>)}</nav>
      <div className="sidebar-note"><Sprout size={27} /><h2>Rooted in your reality.</h2><p>Your knowledge of the land, with NASA climate context and a patient companion.</p></div>
      <div className="sidebar-footer"><a href="#project">About Pacha Pulse <ArrowRight size={15} /></a><p>Decision support · Demo edition</p></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu}>{mobileMenu ? <X size={22} /> : <Menu size={22} />}</button><div className="breadcrumb"><Sprout size={18} /><span>Pacha Pulse</span><span>/</span><strong>{module?.title}</strong></div><div className="topbar-actions"><ApiStatus /><label className="role-selector">Work mode<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="grower">Grower</option><option value="agronomist">Agronomist</option></select></label></div></header>
      <main id="workspace-main" tabIndex={-1}>
        {view === 'overview' ? <>
          <section className="field-banner"><div className="welcome-plaque"><p className="eyebrow">WELCOME TO YOUR FIELD NOTEBOOK</p><h1>A little guidance.<br /><em>A clearer field.</em></h1><p>Start with what you know. Discover the next step together.</p><button className="primary-button" onClick={() => setCompanionOpen(true)}>Take a guided tour<ArrowRight size={18} /></button></div><span className="art-credit">Illustrated landscape · not satellite imagery</span></section>
          <div className="overview-heading"><div><p className="eyebrow">SMALL STEPS, MEANINGFUL CONTEXT</p><h2>{profile.name ? `Your notebook: ${profile.name}` : 'Where would you like to start?'}</h2></div><span className="subtle-tag">{role === 'grower' ? 'Grower workspace' : 'Agronomist workspace'}</span></div>
          <div className="overview-grid">{modules.slice(1, 4).map(({ id, title, Icon, description }, index) => <article className="paper-card next-step-card" key={id}><span className="step-number">0{index + 1}</span><Icon size={29} /><h2>{title}</h2><p>{description}</p><button className="text-button" onClick={() => navigate(id)}>Open {title}<ArrowRight size={17} /></button><small>{id === 'parcel' ? location ? 'Query point selected' : 'Start here' : id === 'monitoring' ? climate ? 'Historical observations loaded' : 'Historical observations, not forecasts' : comparison ? 'Comparison ready' : 'Your planting options, without a ranking'}</small></article>)}</div>
          <section className="paper-card plain-summary"><div><span className="eyebrow">YOUR NOTEBOOK SO FAR</span><h2>Only what we actually know.</h2><p>{profile.crop ? `You entered ${profile.crop} as your current crop. ` : 'Your current crop is not specified yet. '}{climate ? `NASA POWER historical data is loaded for ${climate.start} to ${climate.end}.` : 'No climate results are loaded yet.'}</p></div><button className="secondary-button" onClick={() => setCompanionOpen(true)}>Help me understand<CircleHelp size={18} /></button></section>
        </> : <div className="page-intro"><p className="eyebrow">YOUR FIELD NOTEBOOK / {module?.title.toUpperCase()}</p><h1>{module?.title}</h1><p>{module?.description}</p></div>}
        {notice && <div className="workspace-notice" role="status"><Check size={18} /><p>{notice}</p><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={18} /></button></div>}
        <div hidden={view !== 'parcel'}>{(view === 'parcel' || fieldOpened) && <><p className="role-guidance"><Info size={19} />{role === 'grower' ? 'Choose a point or draw your field. Add only the profile details you know. Use Ask Pacha whenever you need a smaller step.' : 'Review WGS84 geometry, point selection and user-supplied context. NASA POWER uses the query point; it does not average the polygon.'}</p><div className="field-grid"><section className="panel location-panel" aria-labelledby="location-heading"><div className="panel-title"><div><p className="eyebrow">A PLACE TO BEGIN</p><h2 id="location-heading">Find and outline your field</h2></div><MapPinned size={23} /></div><LocationMap location={location} onSelect={setLocation} role={role} boundary={parcel.boundary} storageMessage={parcel.storageMessage} onSaveBoundary={(next) => { parcel.save(next); if (next) setLocation({ ...representativePoint(next), source: 'parcel' }) }} /><CoordinateForm location={location} onSelect={setLocation} /><p className="location-status" role="status">{location ? `Query point: ${location.lat.toFixed(6)}°, ${location.lon.toFixed(6)}° · ${location.source === 'parcel' ? 'field reference' : location.source}` : 'No query point selected yet.'}</p></section><ProfileForm profile={profile} onSave={setProfile} /></div></>}</div>
        {view === 'monitoring' && <>{!location && <div className="workspace-notice"><MapPinned size={21} /><p>Choose your query point in My field, or try the clearly labelled saved example below.</p><button className="secondary-button" onClick={() => navigate('parcel')}>Choose location</button></div>}<Suspense fallback={<p role="status">Loading climate tools…</p>}><ClimatePanel location={location} climate={climate} loading={loading} error={error} onLoad={load} role={role} /></Suspense></>}
        <div hidden={view !== 'planning'}>{(view === 'planning' || plannerOpened) && <RotationPlanner climate={climate} profile={profile} role={role} onComparison={onComparison} />}</div>
        {view === 'charts' && <Suspense fallback={<p role="status">Loading chart tools...</p>}><ChartWorkbench climate={climateReference(climate)} comparison={comparison?.input ?? null} charts={charts} onAdd={addCharts} onRemove={(id) => setCharts((current) => current.filter((chart) => chart.id !== id))} onAsk={(spec) => { setAssistantTask({ id: Date.now(), text: `Please create a ${spec.aggregation === 'weekly' ? '7-day grouped' : 'daily'} ${spec.chart_type} chart of ${spec.metric.replaceAll('_', ' ')} from my available data.` }); setCompanionOpen(true) }} onClimate={() => navigate('monitoring')} onPlanning={() => navigate('planning')} /></Suspense>}
        {view === 'reports' && <section className="panel report-panel" aria-labelledby="report-title"><div className="panel-title"><div><p className="eyebrow">YOUR INPUTS AND AVAILABLE RESULTS</p><h2 id="report-title">Field report</h2></div><FileText size={24} /></div><p>Export an evidence record to share with an agronomist. Empty results stay unknown.</p><dl className="report-facts"><div><dt>Field name</dt><dd>{profile.name || 'Not supplied'}</dd></div><div><dt>Current crop</dt><dd>{profile.crop || 'Not supplied'} · user input</dd></div><div><dt>Query point</dt><dd>{location ? `${location.lat.toFixed(6)}°, ${location.lon.toFixed(6)}°` : 'Not selected'}</dd></div><div><dt>Outline</dt><dd>{parcel.boundary ? `${parcel.boundary.properties.area.value.toFixed(4)} ha · approximate derived area` : 'Not drawn'}</dd></div><div><dt>Climate</dt><dd>{climate ? `NASA POWER · ${climate.start} to ${climate.end} · ${climate.delivery.replaceAll('_', ' ')}` : 'No observations loaded'}</dd></div><div><dt>Rotation comparison</dt><dd>{comparison ? 'Three sequences compared · no suitability ranking' : 'No comparison available'}</dd></div></dl>{climate && <p>Historical rainfall total: {climate.summary.rainfall_total.value === null ? 'Unavailable' : `${climate.summary.rainfall_total.value} mm`}. Mean temperature: {climate.summary.temperature_mean.value === null ? 'Unavailable' : `${climate.summary.temperature_mean.value} °C`}. These describe the selected past period at a grid point, not next season or a measured field.</p>}<div className="report-actions"><button className="primary-button" onClick={() => downloadJson(summary)}><ArrowDownToLine size={18} />Export report JSON</button><button className="secondary-button" onClick={() => window.print()}>Print report</button></div><p className="helper-text">Profile and results last for this tab session. Only the saved outline stays in this browser after a reload. Export before leaving.</p></section>}
        {view === 'help' && <div className="help-grid"><section className="panel"><div className="panel-title"><h2>Find your next step</h2><CircleHelp size={24} /></div><div className="module-help">{modules.slice(1, 6).map((item) => <article key={item.id}><item.Icon size={22} /><div><h3>{item.title}</h3><p>{item.description}</p></div><button className="icon-button" aria-label={`Open ${item.title}`} onClick={() => navigate(item.id)}><ArrowRight size={19} /></button></article>)}</div><button className="secondary-button" onClick={() => setCompanionOpen(true)}>Walk through it with Pacha</button></section><section className="panel source-help"><div className="panel-title"><h2>Clear sources. Honest limits.</h2><Info size={23} /></div><p><strong>NASA POWER</strong> supplies historical temperature and rainfall. Mountain terrain and the coarse grid mean your field can differ. <a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">NASA documentation</a></p><p><strong>OpenStreetMap</strong> supplies the base map. Outlines are user drawings, not cadastral measurements. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Map attribution</a></p><p><strong>Gemini</strong> explains the interface, checks available evidence and prepares charts using bounded server tools. It may make mistakes. Proposed entries require your confirmation. The built-in guide works without AI.</p><p><strong>Grower and Agronomist</strong> share the same tools and calculations. Agronomist mode expands observation tables and methods; Grower mode starts with the simpler explanation.</p><details><summary>What is still unavailable?</summary><p>MODIS vegetation series, soil measurements, smart irrigation, pest diagnosis, yield forecasts and financial estimates are not integrated. The reference design included visual concepts for these features; this demo does not present them as functioning measurements.</p></details></section></div>}
        <footer className="page-footer"><span><Sprout size={16} />Pacha Pulse · Your field, in perspective.</span><span>Decision support · Review important decisions with an agronomist.</span></footer>
      </main>
    </div>
    <PachaCompanion task={assistantTask} onCharts={addCharts} open={companionOpen} onOpen={setCompanionOpen} context={{ view, role, profile, location: location ? { lat: location.lat, lon: location.lon } : null, parcel_area_ha: parcel.boundary?.properties.area.value ?? null, climate: climateReference(climate), comparison: comparison?.input ?? null }} onNavigate={navigate} onApply={applyProposal} />
  </div>
}
