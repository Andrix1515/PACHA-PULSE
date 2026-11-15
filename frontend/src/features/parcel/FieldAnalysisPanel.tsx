import { useState } from 'react'
import type { LocationInfo, SoilProfile, LocationProvidersReport, ProviderOverview, TerrainInfo } from '../../types'

interface FieldAnalysisPanelProps {
  locationInfo: LocationInfo | null
  soilProfile: SoilProfile | null
  providers: LocationProvidersReport | null
  terrain?: TerrainInfo | null
  loading: {
    location: boolean
    soil: boolean
    providers: boolean
    terrain?: boolean
  }
  onRetry: () => void
}

type TabId = 'location' | 'soil' | 'terrain' | 'climate' | 'sources'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'soil',     label: 'Soil Profile', icon: '🌱' },
  { id: 'terrain',  label: 'Terrain', icon: '⛰️' },
  { id: 'climate',  label: 'Climate', icon: '🌤️' },
  { id: 'sources',  label: 'Data Sources', icon: '🔬' },
]

// ── helpers ──────────────────────────────────────────────────────────────────

function phColor(ph: number | null): string {
  if (ph === null) return '#888'
  if (ph < 5.5) return '#e06c2a'   // strongly acidic
  if (ph < 6.5) return '#c9a428'   // mildly acidic
  if (ph < 7.5) return '#3a9e5f'   // neutral
  if (ph < 8.5) return '#3b7fc4'   // mildly alkaline
  return '#8b5cf6'                  // strongly alkaline
}

function phLabel(ph: number | null): string {
  if (ph === null) return 'Unknown'
  if (ph < 5.5) return 'Strongly acidic'
  if (ph < 6.5) return 'Mildly acidic'
  if (ph < 7.5) return 'Neutral'
  if (ph < 8.5) return 'Mildly alkaline'
  return 'Strongly alkaline'
}

interface StatusBadge { label: string; color: string }

function providerBadge(status: ProviderOverview['status']): StatusBadge {
  switch (status) {
    case 'data_available': return { label: 'Data ✓',              color: '#22c55e' }
    case 'active':         return { label: 'Active',              color: '#22c55e' }
    case 'partial_data':   return { label: 'Partial',             color: '#eab308' }
    case 'connected':      return { label: 'Connected',           color: '#14b8a6' }
    case 'configured':     return { label: 'Configured',          color: '#3b82f6' }
    case 'checking':       return { label: 'Checking…',           color: '#3b82f6' }
    case 'degraded':       return { label: 'Degraded',            color: '#f97316' }
    case 'empty_response': return { label: 'No data for location',color: '#f97316' }
    case 'timeout':        return { label: 'Timeout',             color: '#ef4444' }
    case 'unavailable':    return { label: 'Offline',             color: '#ef4444' }
    case 'not_configured': return { label: 'Not configured',      color: '#9ca3af' }
    case 'outside_coverage':return { label: 'Outside coverage',   color: '#9ca3af' }
    case 'disabled':       return { label: 'Disabled',            color: '#9ca3af' }
    case 'not_applicable': return { label: 'N/A',                 color: '#d1d5db' }
    default:               return { label: status,                color: '#9ca3af' }
  }
}

function fmt(value: number | null | undefined, unit = '', digits = 1): string {
  if (value == null) return 'Unavailable'
  return `${value.toFixed(digits)} ${unit}`.trim()
}

// ── sub-panels ───────────────────────────────────────────────────────────────

function LocationTab({ info, loading }: { info: LocationInfo | null; loading: boolean }) {
  if (loading) return <p className="fap-status" role="status">Loading location data…</p>
  if (!info) return <p className="fap-status">No location selected.</p>
  return (
    <dl className="fap-dl">
      <div><dt>Country</dt><dd>{info.country_name} ({info.country_code})</dd></div>
      <div><dt>Region</dt><dd>{info.region}</dd></div>
      {info.subregion && <div><dt>Subregion</dt><dd>{info.subregion}</dd></div>}
      <div><dt>Hemisphere</dt><dd style={{ textTransform: 'capitalize' }}>{info.hemisphere}</dd></div>
      <div><dt>Climate zone</dt><dd>{info.climate_zone}</dd></div>
      <div><dt>Elevation</dt><dd>{fmt(info.elevation_m, 'm.a.s.l.', 0)}</dd></div>
      {info.slope_percent != null && <div><dt>Slope</dt><dd>{fmt(info.slope_percent, '%')}</dd></div>}
      <div><dt>Coordinates</dt><dd>{info.lat.toFixed(6)}°, {info.lon.toFixed(6)}°</dd></div>
    </dl>
  )
}

function SoilTab({ soil, loading }: { soil: SoilProfile | null; loading: boolean }) {
  if (loading) return <p className="fap-status" role="status">Loading soil data…</p>
  if (!soil) return <p className="fap-status">No soil data available. Select a point to load SoilGrids data.</p>

  const depths = ['0-5cm', '5-15cm', '15-30cm']

  function layerVal(prop: { layers: { depth_range: string; mean_value: number | null; unit: string }[] } | null, depth: string): string {
    if (!prop) return 'Unavailable'
    const layer = prop.layers.find(l => l.depth_range === depth)
    if (!layer || layer.mean_value == null) return 'Unavailable'
    return `${layer.mean_value} ${layer.unit}`
  }

  const ph = soil.ph_h2o?.profile_mean ?? null

  return (
    <div className="fap-soil">
      <div className="fap-ph-row">
        <span className="fap-label">Soil pH (H₂O)</span>
        <span className="fap-ph-badge" style={{ background: phColor(ph), color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.85em' }}>
          {ph != null ? ph.toFixed(1) : 'Unavailable'} — {phLabel(ph)}
        </span>
      </div>
      <p className="fap-note">Scale: &lt;5.5 strongly acidic · 5.5–6.5 mildly acidic · 6.5–7.5 neutral · 7.5–8.5 alkaline · &gt;8.5 strongly alkaline</p>

      <p><strong>USDA Texture Class:</strong> {soil.soil_texture_class?.replace(/_/g, ' ').toUpperCase() || 'Unavailable'}</p>
      <p className="fap-note">USDA Texture Triangle (descriptive): classification based on clay/sand/silt proportions per FAO-USDA methodology</p>

      <table className="fap-table">
        <thead>
          <tr>
            <th>Property</th>
            {depths.map(d => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>pH H₂O</td>
            {depths.map(d => <td key={d}>{layerVal(soil.ph_h2o, d)}</td>)}
          </tr>
          <tr>
            <td>SOC %</td>
            {depths.map(d => <td key={d}>{layerVal(soil.soil_organic_carbon, d)}</td>)}
          </tr>
          <tr>
            <td>Total N (g/kg)</td>
            {depths.map(d => <td key={d}>{layerVal(soil.total_nitrogen, d)}</td>)}
          </tr>
          <tr>
            <td>Clay %</td>
            {depths.map(d => <td key={d}>{layerVal(soil.texture_clay_percent, d)}</td>)}
          </tr>
          <tr>
            <td>Sand %</td>
            {depths.map(d => <td key={d}>{layerVal(soil.texture_sand_percent, d)}</td>)}
          </tr>
          <tr>
            <td>Silt %</td>
            {depths.map(d => <td key={d}>{layerVal(soil.texture_silt_percent, d)}</td>)}
          </tr>
          <tr>
            <td>Bulk density (g/cm³)</td>
            {depths.map(d => <td key={d}>{layerVal(soil.bulk_density, d)}</td>)}
          </tr>
        </tbody>
      </table>
      {soil.warnings.length > 0 && (
        <ul className="fap-warnings">
          {soil.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  )
}

function TerrainTab({ terrain, info, loading }: { terrain?: TerrainInfo | null; info: LocationInfo | null; loading?: boolean }) {
  if (loading) return <p className="fap-status" role="status">Loading DEM terrain data…</p>
  if (!terrain && !info) return <p className="fap-status">No location selected.</p>
  return (
    <div className="fap-terrain">
      <dl className="fap-dl">
        <div><dt>Ground Elevation</dt><dd>{fmt(terrain?.elevation_m ?? info?.elevation_m, 'm.a.s.l.', 1)}</dd></div>
        {terrain?.elevation_min_m != null && terrain?.elevation_max_m != null && (
          <div><dt>Elevation Range (Min / Max)</dt><dd>{fmt(terrain.elevation_min_m, 'm')} – {fmt(terrain.elevation_max_m, 'm')}</dd></div>
        )}
        {terrain?.relief_m != null && (
          <div><dt>Local Relief Variation</dt><dd>{fmt(terrain.relief_m, 'm')}</dd></div>
        )}
        {terrain?.slope_percent != null && (
          <div><dt>Estimated Slope</dt><dd>{fmt(terrain.slope_percent, '%')} ({fmt(terrain.slope_degrees, '°')})</dd></div>
        )}
        {terrain?.aspect && (
          <div><dt>Downslope Aspect (Drainage)</dt><dd>{terrain.aspect}</dd></div>
        )}
        <div><dt>DEM Source</dt><dd>{terrain?.dem_source || 'Copernicus DEM 90m / SRTM'}</dd></div>
      </dl>
      {terrain?.warnings && terrain.warnings.length > 0 && (
        <ul className="fap-warnings">
          {terrain.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  )
}

function ClimateTab() {
  return (
    <div className="fap-placeholder">
      <span style={{ fontSize: '2em' }}>🌤️</span>
      <p><strong>Open the NASA Climate tab for climate data.</strong></p>
      <p className="fap-note">
        Historical temperature and rainfall from NASA POWER (MERRA-2) are available in the <em>NASA climate</em> module.
        ERA5-Land comparison data will appear here once configured.
      </p>
    </div>
  )
}

function SourcesTab({ providers, loading, onRetry }: { providers: LocationProvidersReport | null; loading: boolean; onRetry: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="secondary-button" onClick={onRetry} disabled={loading}>
          {loading ? 'Refreshing…' : 'Retry all'}
        </button>
      </div>
      {loading && <p className="fap-status" role="status">Loading provider data…</p>}
      {!loading && !providers && <p className="fap-status">No provider data. Select a location first.</p>}
      {providers && (
        <ul className="fap-providers">
          {providers.providers
            .filter(p => p.status !== 'not_applicable')
            .map(p => {
              const badge = providerBadge(p.status)
              return (
                <li key={p.id} className="fap-provider-item">
                  <div className="fap-provider-header">
                    <strong>{p.name}</strong>
                    <span
                      className="fap-badge"
                      style={{ background: badge.color, color: '#fff' }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <span className="fap-note">
                    {p.organization} · {p.source_type} · {p.spatial_resolution}
                  </span>
                  {p.last_error && (
                    <p className="fap-error">{p.last_error}</p>
                  )}
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function FieldAnalysisPanel({
  locationInfo,
  soilProfile,
  providers,
  terrain,
  loading,
  onRetry,
}: FieldAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('location')

  return (
    <div className="field-analysis-panel" aria-label="Field Analysis">
      {/* Tab bar */}
      <div className="fap-tabbar" role="tablist" aria-label="Field analysis tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`fap-panel-${tab.id}`}
            id={`fap-tab-${tab.id}`}
            className={`fap-tab ${activeTab === tab.id ? 'fap-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span className="fap-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panels */}
      <div
        className="fap-panel"
        role="tabpanel"
        id={`fap-panel-${activeTab}`}
        aria-labelledby={`fap-tab-${activeTab}`}
      >
        {activeTab === 'location' && <LocationTab info={locationInfo} loading={loading.location} />}
        {activeTab === 'soil'     && <SoilTab soil={soilProfile} loading={loading.soil} />}
        {activeTab === 'terrain'  && <TerrainTab terrain={terrain} info={locationInfo} loading={loading.terrain} />}
        {activeTab === 'climate'  && <ClimateTab />}
        {activeTab === 'sources'  && <SourcesTab providers={providers} loading={loading.providers} onRetry={onRetry} />}
      </div>
    </div>
  )
}
