import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  GitCompare,
  HelpCircle,
  Info,
  Layers,
  Leaf,
  LoaderCircle,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  Thermometer,
} from 'lucide-react'
import type { CandidateCrop, Crop, Location, LocationInfo, SoilProfile, UserRole } from '../../types'
import { getCandidateCrops, getCrops, compareCrops } from '../../services/api'

interface Props {
  location: Location | null
  locationInfo: LocationInfo | null
  soil: SoilProfile | null
  role: UserRole
  onSelectForRotation?: (cropId: string) => void
  onNavigateToField: () => void
}

export default function CropExplorer({
  location,
  locationInfo,
  soil,
  role,
  onSelectForRotation,
  onNavigateToField,
}: Props) {
  const [candidates, setCandidates] = useState<CandidateCrop[]>([])
  const [allCrops, setAllCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedFamily, setSelectedFamily] = useState<string>('all')
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null)

  // Comparison state
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareResult, setCompareResult] = useState<{
    compared_crops: {
      crop: Crop
      advantages: string[]
      disadvantages: string[]
      best_predecessors: string[]
      rotational_warnings: string[]
    }[]
    tradeoffs_summary: string[]
  } | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // Load candidate crops when location changes
  useEffect(() => {
    let active = true
    if (!location) {
      // Load general catalog if no location
      getCrops().then((res) => {
        if (active) setAllCrops(res)
      }).catch(() => {})
      setCandidates([])
      return
    }

    setLoading(true)
    setError('')
    getCandidateCrops(location.lat, location.lon)
      .then((data) => {
        if (active) {
          setCandidates(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not generate crop candidates.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [location?.lat, location?.lon])

  // Run crop comparison
  async function handleCompare() {
    if (selectedForCompare.length < 2) return
    setCompareLoading(true)
    setCompareModalOpen(true)
    try {
      const res = await compareCrops(selectedForCompare)
      setCompareResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed.')
    } finally {
      setCompareLoading(false)
    }
  }

  function toggleCompareSelection(id: string) {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  // Filtering candidates or catalog
  const filteredCandidates = candidates.filter((item) => {
    const c = item.crop
    const matchesSearch =
      !search ||
      c.common_name.toLowerCase().includes(search.toLowerCase()) ||
      c.spanish_name.toLowerCase().includes(search.toLowerCase()) ||
      c.scientific_name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory
    const matchesFamily = selectedFamily === 'all' || c.botanical_family === selectedFamily
    return matchesSearch && matchesCategory && matchesFamily
  })

  return (
    <section className="panel crop-explorer-panel" aria-labelledby="crop-explorer-title">
      <div className="panel-title">
        <div>
          <span className="eyebrow">CROP INTELLIGENCE · AGRO-ECOLOGICAL SUITABILITY</span>
          <h2 id="crop-explorer-title">Dynamic Crop Explorer</h2>
        </div>
        <Leaf size={24} />
      </div>

      <div className="crop-explorer-header">
        {location ? (
          <div className="location-context-plaque">
            <MapPin size={20} />
            <div>
              <strong>
                {locationInfo ? `${locationInfo.region}, ${locationInfo.country_name}` : `Coordinates (${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}°)`}
              </strong>
              <p>
                {locationInfo?.climate_zone} · Elevation: {locationInfo?.elevation_m ? `${locationInfo.elevation_m.toFixed(0)} m.a.s.l.` : 'Unknown'}
                {soil?.ph_h2o?.profile_mean ? ` · Soil pH: ${soil.ph_h2o.profile_mean} (${soil.soil_texture_class.replace('_', ' ')})` : ''}
              </p>
            </div>
            <span className="provenance-tag">Tailored with GAEZ v5 & SoilGrids</span>
          </div>
        ) : (
          <div className="workspace-notice">
            <Info size={20} />
            <p>Select a field query point in My field to evaluate real biophysical suitability for your land.</p>
            <button className="secondary-button" onClick={onNavigateToField}>
              Choose query point
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="crop-filter-bar">
        <div className="search-field">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search crop by common, Spanish, or scientific name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search crops"
          />
        </div>

        <div className="filter-selects">
          <label>
            Category:
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="all">All categories</option>
              <option value="cereal">Cereals</option>
              <option value="legume">Legumes (N-fixing)</option>
              <option value="tuber">Tubers & Roots</option>
              <option value="vegetable">Vegetables</option>
              <option value="oilseed">Oilseeds</option>
              <option value="forage">Forages</option>
              <option value="cover_crop">Cover crops</option>
              <option value="pseudo_cereal">Pseudo-cereals</option>
            </select>
          </label>

          <label>
            Family:
            <select value={selectedFamily} onChange={(e) => setSelectedFamily(e.target.value)}>
              <option value="all">All families</option>
              <option value="Fabaceae">Fabaceae (Legumes)</option>
              <option value="Poaceae">Poaceae (Grasses/Cereals)</option>
              <option value="Solanaceae">Solanaceae (Nightshades)</option>
              <option value="Amaranthaceae">Amaranthaceae</option>
              <option value="Asteraceae">Asteraceae</option>
              <option value="Convolvulaceae">Convolvulaceae</option>
              <option value="Euphorbiaceae">Euphorbiaceae</option>
            </select>
          </label>
        </div>

        {selectedForCompare.length > 0 && (
          <div className="compare-bar-badge">
            <span>{selectedForCompare.length} selected</span>
            <button
              className="primary-button small-button"
              disabled={selectedForCompare.length < 2 || compareLoading}
              onClick={handleCompare}
            >
              <GitCompare size={15} /> Compare {selectedForCompare.length} crops
            </button>
            <button className="text-button" onClick={() => setSelectedForCompare([])}>
              Clear
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-state" role="status">
          <LoaderCircle size={24} className="loading-icon" />
          <p>Evaluating agro-ecological suitability from climate, soil, and GAEZ models...</p>
        </div>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}

      {/* Candidate Cards Grid */}
      <div className="candidate-grid" role="region" aria-label="Suitable crop candidates">
        {filteredCandidates.map(({ crop, suitability_category, overall_score, confidence_level, limiting_factors, advantages, evidence, data_gaps }) => {
          const isExpanded = expandedCrop === crop.id
          const isSelected = selectedForCompare.includes(crop.id)

          const categoryBadgeClass =
            suitability_category === 'suitable'
              ? 'badge-suitable'
              : suitability_category === 'marginal'
              ? 'badge-marginal'
              : suitability_category === 'unsuitable'
              ? 'badge-unsuitable'
              : 'badge-unknown'

          return (
            <article key={crop.id} className={`paper-card candidate-card ${categoryBadgeClass}`}>
              <div className="candidate-card-header">
                <div>
                  <div className="candidate-title-line">
                    <h3>{crop.common_name}</h3>
                    <span className="candidate-spanish-name">({crop.spanish_name})</span>
                  </div>
                  <span className="candidate-scientific-name">{crop.scientific_name}</span>
                </div>

                <div className="candidate-score-badge">
                  <span className={`suitability-tag ${suitability_category}`}>
                    {suitability_category.replace('_', ' ').toUpperCase()}
                  </span>
                  <strong className="score-num">{overall_score}/100</strong>
                </div>
              </div>

              <div className="candidate-tags-row">
                <span className="info-chip family-chip">{crop.botanical_family}</span>
                <span className="info-chip category-chip">{crop.category}</span>
                {crop.is_nitrogen_fixer && (
                  <span className="info-chip n-fix-chip">
                    <Sparkles size={12} /> N₂ Fixer (~{crop.biological_n_fixation_kg_ha?.toFixed(0)} kg/ha)
                  </span>
                )}
                <span className="info-chip root-chip">Roots: {crop.root_depth}</span>
              </div>

              <p className="crop-cycle-summary">
                Estimated cycle: {crop.cycle_duration_days_min ?? '?'} - {crop.cycle_duration_days_max ?? '?'} days · Water demand: {crop.requirements.water_demand_mm_min ?? '?'} - {crop.requirements.water_demand_mm_max ?? '?'} mm
              </p>

              {advantages.length > 0 && (
                <div className="candidate-advantages">
                  <Check size={14} className="advantage-check" />
                  <span>{advantages[0]}</span>
                </div>
              )}

              {limiting_factors.length > 0 && (
                <div className="candidate-limiting">
                  <ShieldAlert size={14} className="limit-icon" />
                  <span>{limiting_factors[0]}</span>
                </div>
              )}

              <div className="candidate-card-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setExpandedCrop(isExpanded ? null : crop.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <>Less evidence <ChevronUp size={14} /></> : <>Evidence & gaps <ChevronDown size={14} /></>}
                </button>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className={`secondary-button small-button ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleCompareSelection(crop.id)}
                  >
                    {isSelected ? 'Selected' : 'Compare'}
                  </button>

                  {onSelectForRotation && (
                    <button
                      type="button"
                      className="primary-button small-button"
                      onClick={() => onSelectForRotation(crop.id)}
                    >
                      Use in rotation <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Evidence Breakdown */}
              {isExpanded && (
                <div className="candidate-expanded-evidence">
                  <h4>Scientific Evidence Breakdown</h4>
                  <ul className="evidence-list">
                    {evidence.map((ev, idx) => (
                      <li key={idx} className={`evidence-item ${ev.status}`}>
                        <strong>{ev.factor.replace('_', ' ').toUpperCase()}:</strong> {ev.details}
                        <small className="evidence-condition">
                          Field: {ev.field_condition} · Crop tolerance: {ev.crop_requirement}
                        </small>
                      </li>
                    ))}
                  </ul>

                  {data_gaps.length > 0 && (
                    <div className="candidate-data-gaps">
                      <HelpCircle size={15} />
                      <div>
                        <strong>Unmeasured parameters:</strong>
                        <ul>
                          {data_gaps.map((gap, gIdx) => (
                            <li key={gIdx}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <details className="crop-pest-details">
                    <summary>Pest vulnerabilities & rotation notes</summary>
                    <p>
                      <strong>Vulnerabilities:</strong> {crop.pest_susceptibilities.join(', ') || 'General crop pests apply.'}
                    </p>
                    <p>
                      <strong>Favorable predecessors:</strong> {crop.rotation_good_predecessors.join(', ') || 'Any non-host family.'}
                    </p>
                    <p>
                      <strong>Avoid preceding with:</strong> {crop.rotation_bad_predecessors.join(', ') || 'Same family.'}
                    </p>
                  </details>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {filteredCandidates.length === 0 && !loading && (
        <div className="empty-results">
          <p>No crops match your filter criteria. Try clearing search terms or selecting all categories.</p>
        </div>
      )}

      {/* Side-by-side Crop Comparator Modal */}
      {compareModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-labelledby="compare-modal-title">
          <div className="paper-card comparator-modal">
            <div className="modal-header">
              <h3 id="compare-modal-title">
                <GitCompare size={20} /> Side-by-Side Crop Comparison
              </h3>
              <button className="icon-button" onClick={() => setCompareModalOpen(false)} aria-label="Close comparator">
                ✕
              </button>
            </div>

            {compareLoading ? (
              <p>Comparing agronomic parameters...</p>
            ) : compareResult ? (
              <div className="comparator-content">
                <div className="comparison-table-wrapper">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <th key={crop.id}>
                            <strong>{crop.common_name}</strong>
                            <small>({crop.scientific_name})</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Botanical Family</td>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <td key={crop.id}>{crop.botanical_family}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>Category</td>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <td key={crop.id}>{crop.category}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>N₂ Fixation Capacity</td>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <td key={crop.id}>
                            {crop.is_nitrogen_fixer
                              ? `Yes (~${crop.biological_n_fixation_kg_ha} kg N/ha)`
                              : 'None (Net N consumer)'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>Nutrient Demand</td>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <td key={crop.id}>
                            N: {crop.n_demand} · P: {crop.p_demand} · K: {crop.k_demand}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>Rooting Depth</td>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <td key={crop.id}>{crop.root_depth}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>Water Demand</td>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <td key={crop.id}>
                            {crop.requirements.water_demand_mm_min} - {crop.requirements.water_demand_mm_max} mm
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>Optimal Temperature</td>
                        {compareResult.compared_crops.map(({ crop }) => (
                          <td key={crop.id}>
                            {crop.requirements.temp_opt_min_c} - {crop.requirements.temp_opt_max_c} °C
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="comparator-tradeoffs">
                  <h4>Key Rotational Tradeoffs</h4>
                  <ul>
                    {compareResult.tradeoffs_summary.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
