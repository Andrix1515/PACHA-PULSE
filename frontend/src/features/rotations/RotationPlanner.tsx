import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowDownToLine,
  Calendar,
  Check,
  Droplets,
  Flame,
  GitCompareArrows,
  Info,
  Layers,
  Leaf,
  LoaderCircle,
  Route,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type {
  AgriculturalProfile,
  ClimateResponse,
  CompareResponse,
  ComparisonInput,
  Crop,
  CropId,
  Rotation,
  UserRole,
} from '../../types'
import { getCrops, requestJson } from '../../services/api'

const defaultRotations: Rotation[] = [
  { name: 'Usual / reference', crops: ['potato', 'potato', 'barley'] },
  { name: 'Alternative A', crops: ['potato', 'faba_bean', 'quinoa'] },
  { name: 'Alternative B', crops: ['maize', 'bean', 'wheat'] },
]

export default function RotationPlanner({
  climate,
  profile,
  role,
  onComparison,
}: {
  climate: ClimateResponse | null
  profile: AgriculturalProfile
  role: UserRole
  onComparison: (next: { input: ComparisonInput; result: CompareResponse } | null) => void
}) {
  const [rotations, setRotations] = useState<Rotation[]>(defaultRotations)
  const [percent, setPercent] = useState(100)
  const [tempDelta, setTempDelta] = useState(0.0)
  const [startMonth, setStartMonth] = useState(10) // October default (Andean/Southern hemisphere)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [catalogCrops, setCatalogCrops] = useState<Crop[]>([])

  const request = useRef<AbortController | null>(null)
  const climateKey = climate
    ? `${climate.lat}/${climate.lon}/${climate.start}/${climate.end}/${climate.retrieved_at}`
    : ''

  // Load catalog crops on mount
  useEffect(() => {
    let active = true
    getCrops()
      .then((data) => {
        if (active) setCatalogCrops(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    request.current?.abort()
    setResult(null)
    onComparison(null)
    setLoading(false)
  }, [climateKey, profile.soil, profile.water, onComparison])

  useEffect(() => () => request.current?.abort(), [])

  function invalidate() {
    request.current?.abort()
    setLoading(false)
    setResult(null)
    onComparison(null)
    setError('')
  }

  function updateCrop(index: number, campaign: number, crop: CropId) {
    invalidate()
    setRotations((current) =>
      current.map((rotation, i) =>
        i === index
          ? {
              ...rotation,
              crops: rotation.crops.map((value, j) => (j === campaign ? crop : value)),
            }
          : rotation
      )
    )
    if (index === 0) setConfirmed(false)
  }

  async function run() {
    invalidate()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)

    const input: ComparisonInput = {
      rotations,
      rainfall_percent: percent,
      temperature_delta_c: tempDelta,
      habitual_confirmed: confirmed,
      soil: profile.soil,
      water: profile.water,
      start_month: startMonth,
      hemisphere: (climate && climate.lat < 0) ? 'southern' : 'northern',
      climate: climate
        ? {
            lat: climate.lat,
            lon: climate.lon,
            start: climate.start,
            end: climate.end,
            saved_example: climate.delivery === 'saved_observation',
          }
        : null,
    }

    try {
      const data = await requestJson<CompareResponse>('/rotations/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(input),
      })
      if (!controller.signal.aborted) {
        setResult(data)
        onComparison({ input, result: data })
      }
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(caught instanceof Error ? caught.message : 'The comparison could not be completed. Please try again.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  function exportResult() {
    if (!result) return
    const blob = new Blob(
      [JSON.stringify({ rotations, climate, profile, comparison: result }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pacha-pulse-rotation-intelligence.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Group catalog crops by category for structured selects
  const groupedCrops: Record<string, Crop[]> = {}
  for (const c of catalogCrops) {
    const cat = c.category.toUpperCase()
    if (!groupedCrops[cat]) groupedCrops[cat] = []
    groupedCrops[cat].push(c)
  }

  return (
    <section className="panel planner-panel" aria-labelledby="planner-heading">
      <div className="panel-title">
        <div>
          <span className="eyebrow">ROTATION INTELLIGENCE ENGINE · MULTI-CRITERIA COMPARATOR</span>
          <h2 id="planner-heading">
            <Route size={20} /> Compare your rotations
          </h2>
        </div>
        <GitCompareArrows size={22} />
      </div>

      <div className="planner-body">
        <p className="muted">
          Design custom multi-campaign sequences using location-compatible crops. The engine checks botanical family carryover, biological nitrogen fixation, root depth stratification, and calendar viability.
        </p>

        {/* Sequence Editors */}
        <div className="rotation-editors">
          {rotations.map((rotation, index) => (
            <fieldset key={rotation.name} className={`rotation-editor rotation-${index}`}>
              <legend>
                <strong>{rotation.name}</strong>
                {index === 0 && <span className="baseline-indicator">Baseline Reference</span>}
              </legend>
              <p>
                {index === 0
                  ? 'Your current habitual crop practice.'
                  : `Alternative candidate sequence ${index === 1 ? 'A' : 'B'}.`}
              </p>

              <div className="campaign-fields">
                {rotation.crops.map((cropId, campaign) => {
                  const cropObj = catalogCrops.find((c) => c.id === cropId)
                  return (
                    <label key={campaign}>
                      <span className="campaign-label">Campaign {campaign + 1}</span>
                      <select
                        aria-label={`${rotation.name}, campaign ${campaign + 1}`}
                        value={cropId}
                        onChange={(event) => updateCrop(index, campaign, event.target.value as CropId)}
                      >
                        {Object.entries(groupedCrops).map(([cat, crops]) => (
                          <optgroup key={cat} label={cat}>
                            {crops.map((c) => (
                              <option value={c.id} key={c.id}>
                                {c.common_name} ({c.botanical_family})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {cropObj && (
                        <small className="crop-family-tag">
                          {cropObj.botanical_family} · {cropObj.root_depth} roots
                        </small>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <label className="confirmation-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => {
              invalidate()
              setConfirmed(event.target.checked)
            }}
          />
          I confirm the first sequence reflects my habitual rotation practice.
        </label>

        {/* Climate Scenarios Section */}
        <div className="scenario-control-group">
          <div className="scenario-control">
            <div>
              <label htmlFor="rainfall-scenario">
                <Droplets size={16} /> Historical rainfall scenario
              </label>
              <p>Hypothetical precipitation change. Sensitivity analysis, not a weather forecast.</p>
            </div>
            <output htmlFor="rainfall-scenario">{percent} %</output>
            <input
              id="rainfall-scenario"
              type="range"
              min="0"
              max="150"
              step="5"
              value={percent}
              onChange={(e) => {
                invalidate()
                setPercent(Number(e.target.value))
              }}
            />
            <div className="scenario-shortcuts">
              <button
                type="button"
                aria-pressed={percent === 100}
                onClick={() => {
                  invalidate()
                  setPercent(100)
                }}
              >
                100% · Reference
              </button>
              <button
                type="button"
                aria-pressed={percent === 85}
                onClick={() => {
                  invalidate()
                  setPercent(85)
                }}
              >
                85% · Mild dry
              </button>
              <button
                type="button"
                aria-pressed={percent === 70}
                onClick={() => {
                  invalidate()
                  setPercent(70)
                }}
              >
                70% · Severe dry
              </button>
            </div>
          </div>

          <div className="scenario-control">
            <div>
              <label htmlFor="temp-delta">
                <Flame size={16} /> Temperature sensitivity delta
              </label>
              <p>Simulate thermal stress above historical baseline (+°C).</p>
            </div>
            <output htmlFor="temp-delta">
              {tempDelta > 0 ? `+${tempDelta.toFixed(1)}` : `${tempDelta.toFixed(1)}`} °C
            </output>
            <input
              id="temp-delta"
              type="range"
              min="-2.0"
              max="5.0"
              step="0.5"
              value={tempDelta}
              onChange={(e) => {
                invalidate()
                setTempDelta(Number(e.target.value))
              }}
            />
          </div>
        </div>

        <p className="scenario-context">
          {climate
            ? `Shared climate context: ${climate.lat.toFixed(4)}°, ${climate.lon.toFixed(4)}° · ${climate.start} to ${climate.end} (NASA POWER MERRA-2)`
            : 'No weather loaded: structural and botanical evaluation is active; scenario precipitation will remain uncalculated.'}
        </p>

        <button className="primary-button compare-button" onClick={() => void run()} disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle size={17} className="loading-icon" /> Evaluating rotation sequences…
            </>
          ) : (
            <>
              <GitCompareArrows size={18} /> Evaluate and compare sequences
            </>
          )}
        </button>

        {error && <p className="field-error" role="alert">{error}</p>}

        {/* Evaluation Results */}
        {result && (
          <div className="comparison-result" aria-label="Rotation comparison results">
            <div className="section-title">
              <h3>Agronomic and Structural Multi-Criteria Evaluation</h3>
              <button className="text-button" onClick={exportResult}>
                <ArrowDownToLine size={15} /> Export evaluation JSON
              </button>
            </div>

            {/* Scenario rainfall plaque */}
            <div className="scenario-result">
              <span>Hypothetical scenario rainfall for period</span>
              <strong>
                {result.scenario_rainfall.value === null
                  ? 'No complete climate data'
                  : `${result.scenario_rainfall.value.toFixed(1)} mm`}
              </strong>
              <p>
                {result.baseline_rainfall?.value !== null && result.baseline_rainfall
                  ? `${result.baseline_rainfall.value.toFixed(1)} mm historical × ${result.rainfall_percent} % (delta temp: ${tempDelta >= 0 ? `+${tempDelta}` : tempDelta} °C).`
                  : 'Load a complete period in NASA climate to contextualize water.'}
              </p>
              <small>This is a sensitivity test, not effective soil infiltration or crop evapotranspiration.</small>
            </div>

            {/* Comparison Cards with Agronomic Assessment */}
            <div className="sequence-evaluation-cards">
              {result.results.map((row) => {
                const ag = row.agronomic_assessment
                const riskClass = ag
                  ? ag.pest_disease_risk_level === 'critical'
                    ? 'risk-critical'
                    : ag.pest_disease_risk_level === 'high'
                    ? 'risk-high'
                    : ag.pest_disease_risk_level === 'moderate'
                    ? 'risk-moderate'
                    : 'risk-low'
                  : 'risk-unknown'

                return (
                  <article key={row.name} className={`paper-card sequence-card ${riskClass}`}>
                    <div className="sequence-card-top">
                      <div>
                        <h4>{row.name}</h4>
                        <div className="sequence-chips">
                          {row.labels.map((crop, idx) => (
                            <span key={idx}>
                              {idx > 0 && <ArrowRight size={12} />}
                              {crop}
                            </span>
                          ))}
                        </div>
                      </div>

                      {ag && (
                        <div className="sequence-score-display">
                          <span className="score-label">Agronomic Score</span>
                          <strong className="score-value">{ag.sequence_score}/100</strong>
                        </div>
                      )}
                    </div>

                    {ag && (
                      <div className="agronomic-indicators-grid">
                        <div className="indicator-cell">
                          <span className="ind-title">Pest & Disease Risk</span>
                          <span className={`risk-badge ${ag.pest_disease_risk_level}`}>
                            {ag.pest_disease_risk_level.toUpperCase()}
                          </span>
                        </div>

                        <div className="indicator-cell">
                          <span className="ind-title">Biological N₂ Fixation</span>
                          <strong className="ind-val">
                            {ag.estimated_legume_n_fixation_kg_ha > 0 ? (
                              <>
                                <Sparkles size={13} /> ~{ag.estimated_legume_n_fixation_kg_ha} kg/ha
                              </>
                            ) : (
                              'None (0 kg/ha)'
                            )}
                          </strong>
                        </div>

                        <div className="indicator-cell">
                          <span className="ind-title">Root Stratification</span>
                          <strong className="ind-val">{ag.root_depth_stratification.replace('_', ' ')}</strong>
                        </div>

                        <div className="indicator-cell">
                          <span className="ind-title">Calendar Viability</span>
                          <strong className="ind-val">{ag.calendar_viability.toUpperCase()}</strong>
                        </div>
                      </div>
                    )}

                    {ag?.critical_warnings && ag.critical_warnings.length > 0 && (
                      <div className="critical-warning-box">
                        <ShieldAlert size={16} />
                        <div>
                          <strong>Agronomic alerts:</strong>
                          <ul>
                            {ag.critical_warnings.map((w, wIdx) => (
                              <li key={wIdx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {ag?.agronomic_strengths && ag.agronomic_strengths.length > 0 && (
                      <div className="agronomic-strengths-box">
                        <Check size={15} />
                        <div>
                          <strong>Key benefits:</strong>
                          <ul>
                            {ag.agronomic_strengths.map((s, sIdx) => (
                              <li key={sIdx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Timeline steps */}
                    {ag?.calendar_steps && (
                      <details className="calendar-timeline-details">
                        <summary>
                          <Calendar size={14} /> Campaign timeline preview
                        </summary>
                        <ol className="timeline-steps">
                          {ag.calendar_steps.map((st) => (
                            <li key={st.campaign_index}>
                              <strong>Campaign {st.campaign_index}: {st.crop_name}</strong>
                              <span>~{st.estimated_duration_days} days ({st.temporal_fit})</span>
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </article>
                )
              })}
            </div>

            {/* Invariants & Warnings */}
            <div className="assessment-note">
              <Info size={20} />
              <div>
                <h4>Important Scientific Limitations</h4>
                <ul>
                  {result.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>

            <details className="method-details" open={role === 'agronomist' || undefined}>
              <summary>How this was calculated and scientific data provenance</summary>
              <p>{result.method}</p>
              <p>
                Biological nitrogen fixation values are agronomic estimates from FAO and CIAT legume benchmarks.
                Botanical family host pests are checked against pathogen databases (Phytophthora, Fusarium, Rhizoctonia, Globodera).
              </p>
            </details>
          </div>
        )}
      </div>
    </section>
  )
}
