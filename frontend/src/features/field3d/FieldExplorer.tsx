import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Expand, Grid, RotateCcw, Sparkles, Sprout, Thermometer, ZoomIn, ZoomOut } from 'lucide-react'
import type { AgriculturalProfile, ClimateResponse, Rotation, SoilProfile, TerrainInfo, UserRole, VegetationResponse, NdviPredictionResponse } from '../../types'
import type { ParcelBoundary } from '../parcel/geometry'
import { computeParcelSectors, fieldFootprint } from './fieldGeometry'
import type { CameraCommand } from './fieldRenderer'
import { getCropSimSpec, MONTHS, SHORT_MONTHS, simulateParcelCrop } from './fieldSimulation'
import LocalBudget from './LocalBudget'
import type { ParcelSimulationSummary } from './fieldSimulation'

const stages = ['Sowing', 'Sprouting', 'Growing', 'Flowering', 'Harvest']
const shortStages = ['Sow', 'Sprout', 'Grow', 'Flower', 'Harvest']
const stageNotes = [
  'Seeds mark a possible planting pattern.',
  'Small shoots illustrate emergence.',
  'The plants are shown with larger stems and leaves.',
  'Flowers or seed heads illustrate a later stage.',
  'Stubble illustrates a field after harvest. No yield is estimated.',
]
const names: Record<string, string> = {
  maize: 'Maize',
  bean: 'Bean',
  lentil: 'Lentil',
  potato: 'Potato',
  wheat: 'Wheat',
  quinoa: 'Quinoa',
  fallow: 'Fallow / rest',
}

export interface AppliedFieldSimulation {
  cropId: string
  cropName: string
  allocatedAreaHa: number
  totalAreaHa: number
  activeZones: boolean[]
  durationDays: number
  startMonth: number
  stage: string
  summary: ParcelSimulationSummary
}

type Props = {
  prediction?: NdviPredictionResponse | null
  vegetation?: VegetationResponse | null
  boundary: ParcelBoundary
  profile: AgriculturalProfile
  climate: ClimateResponse | null
  rotations: Rotation[] | null
  role?: UserRole
  onBack: () => void
  onCrops: () => void
  onStage: (stage: string) => void
  onSimulationChange?: (summary: ParcelSimulationSummary) => void
  onApplySimulation?: (applied: AppliedFieldSimulation) => void
  soil?: SoilProfile | null
  terrain?: TerrainInfo | null
  onEvidence?: () => void
  cropLabels?: Record<string, string>
}

export default function FieldExplorer({
  vegetation,
  prediction,
  boundary,
  profile,
  climate,
  rotations,
  role = 'grower',
  onBack,
  onCrops,
  onStage,
  onSimulationChange,
  onApplySimulation,
  soil,
  terrain,
  onEvidence,
  cropLabels,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof import('./fieldRenderer')['mountField']> | null>(null)
  const [renderer, setRenderer] = useState('loading')
  const [stage, setStage] = useState(2)
  const [sequence, setSequence] = useState(0)
  const [campaign, setCampaign] = useState(0)
  const initialCrop = Object.keys(names).find((crop) => names[crop].toLowerCase() === profile.crop.toLowerCase()) || 'maize'
  const [previewCrop, setPreviewCrop] = useState(initialCrop)
  const [activeZones, setActiveZones] = useState<boolean[]>([true, true, true, true])
  const [pulseZone, setPulseZone] = useState<number>(-1)
  const [startMonth, setStartMonth] = useState<number>(() => ((boundary.geometry.coordinates[0]?.[0]?.[1] ?? -12) < 0 ? 10 : 4))
  const [appliedNotice, setAppliedNotice] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => typeof window === 'undefined' || window.innerWidth > 760)

  useEffect(() => {
    document.getElementById('field-3d-heading')?.focus({ preventScroll: true })
    const onResize = () => setIsDesktop(window.innerWidth > 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const labels = useMemo(() => ({ ...names, ...cropLabels }), [cropLabels])
  const crop = rotations?.[sequence]?.crops[campaign] ?? previewCrop
  const spec = getCropSimSpec(crop, labels[crop])
  const [customDays, setCustomDays] = useState<Record<string, number>>({})
  const durationDays = customDays[crop] ?? spec.defaultDays

  const ring = useMemo(() => fieldFootprint(boundary), [boundary])
  const totalAreaHa = boundary.properties.area.value
  const sectorData = useMemo(() => computeParcelSectors(ring, totalAreaHa), [ring, totalAreaHa])

  const activeZoneCount = activeZones.filter((active,index) => active && sectorData.sectors[index].areaHa > 0).length
  const allocatedAreaHa = useMemo(() => {
    const sum = sectorData.sectors.reduce((acc, sec, idx) => (activeZones[idx] ? acc + sec.areaHa : acc), 0)
    return +sum.toFixed(4)
  }, [sectorData.sectors, activeZones])

  const sim = useMemo(
    () =>
      simulateParcelCrop({
        cropId: crop,
        cropLabel: labels[crop] || crop,
        totalAreaHa,
        allocatedAreaHa,
        activeZoneCount,
        durationDays,
        startMonth,
        stageIndex: stage,
        climate,
      }),
    [crop, labels, totalAreaHa, allocatedAreaHa, activeZoneCount, durationDays, startMonth, stage, climate],
  )

  useEffect(() => {
    onSimulationChange?.(sim)
  }, [sim, onSimulationChange])

  const toggleZone = useCallback((sectorId: number) => {
    setAppliedNotice(false)
    setActiveZones((prev) => {
      const next = prev.map((val, idx) => (idx === sectorId ? !val : val))
      // Keep at least 1 zone active so the parcel never becomes empty by accident
      if (!next.some(Boolean)) next[sectorId] = true
      return next
    })
    setPulseZone(sectorId)
  }, [])

  const current = useRef({ crop, stage, activeZones })
  current.current = { crop, stage, activeZones }

  useEffect(() => {
    let cancelled = false
    import('./fieldRenderer')
      .then(({ mountField }) => {
        if (cancelled || !host.current) return
        try {
          controller.current = mountField(host.current, boundary, () => setRenderer('svg'), toggleZone)
          controller.current.update(current.current.crop, current.current.stage, current.current.activeZones, -1)
          setRenderer('webgl')
        } catch {
          setRenderer('svg')
        }
      })
      .catch(() => {
        if (!cancelled) setRenderer('svg')
      })
    return () => {
      cancelled = true
      controller.current?.dispose()
      controller.current = null
    }
  }, [boundary, toggleZone])

  useEffect(() => {
    if (renderer === 'svg') {
      controller.current?.dispose()
      controller.current = null
    } else {
      controller.current?.update(crop, stage, activeZones, pulseZone)
      if (pulseZone !== -1) setPulseZone(-1)
    }
  }, [crop, stage, activeZones, pulseZone, renderer])

  useEffect(() => {
    onStage(stages[stage].toLowerCase())
  }, [stage, onStage])

  const thermalLabel =
    sim.thermalStatus === 'within_band'
      ? `Thermal fit: ${sim.observedMeanTempC?.toFixed(1)} °C within ${spec.tempOptMinC}–${spec.tempOptMaxC} °C`
      : sim.thermalStatus === 'frost_watch'
      ? `Frost watch: ${sim.observedMinTempC?.toFixed(1)} °C min (${spec.name} is frost-sensitive)`
      : sim.thermalStatus === 'cool_watch'
      ? `Cooler than reference: ${sim.observedMeanTempC?.toFixed(1)} °C vs ${spec.tempOptMinC}–${spec.tempOptMaxC} °C`
      : sim.thermalStatus === 'warm_watch'
      ? `Warmer than reference: ${sim.observedMeanTempC?.toFixed(1)} °C vs ${spec.tempOptMinC}–${spec.tempOptMaxC} °C`
      : `Thermal ref: ${spec.tempOptMinC}–${spec.tempOptMaxC} °C (load weather to compare)`

  return (
    <section className="field-explorer" aria-labelledby="field-3d-heading">
      <div className="explorer-heading">
        <button className="secondary-button" aria-label="Back to map" onClick={onBack}>
          <ArrowLeft size={17} />
          <span>Back to map</span>
        </button>
        <span className="eyebrow">YOUR OUTLINE. A NEW PERSPECTIVE.</span>
        <h1 id="field-3d-heading" tabIndex={-1}>
          A little closer to your field.
        </h1>
        <p>Drag to turn, or use the simulator to test area and time.</p>
      </div>
      <div className="field-canvas" data-renderer={renderer} ref={host} aria-label="Interactive illustrative field model" role="img" />
      {renderer === 'svg' && (
        <div className="field-model-fallback">
          <svg viewBox="-6 -6 12 12" aria-hidden="true">
            <polygon points={ring.map(([x, z]) => `${x},${z}`).join(' ')} fill="#b2c98c" stroke="#466640" strokeWidth=".07" />
          </svg>
          <p>3D is unavailable on this device. Your outline and stage controls still work.</p>
        </div>
      )}
      <div className="explorer-camera" role="group" aria-label="3D camera controls">
        {(
          [
            { action: 'left', label: 'Rotate field left', Icon: RotateCcw },
            { action: 'right', label: 'Rotate field right', Icon: RotateCcw },
            { action: 'in', label: 'Zoom field in', Icon: ZoomIn },
            { action: 'out', label: 'Zoom field out', Icon: ZoomOut },
            { action: 'reset', label: 'Reset field camera', Icon: Expand },
          ] as const
        ).map(({ action, label, Icon }) => (
          <button
            className="icon-button"
            key={action}
            aria-label={label}
            disabled={renderer !== 'webgl'}
            onClick={() => controller.current?.command(action as CameraCommand)}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
      <div className="explorer-options">
        <label>
          {rotations ? 'Planting sequence' : 'Illustrate a crop'}
          <select
            value={rotations ? sequence : previewCrop}
            onChange={(event) => {
              setAppliedNotice(false)
              if (rotations) setSequence(Number(event.target.value))
              else setPreviewCrop(event.target.value)
              setPulseZone(99)
            }}
          >
            {rotations
              ? rotations.map((rotation, index) => (
                  <option value={index} key={rotation.name}>
                    {rotation.name}
                  </option>
                ))
              : Object.entries(names).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
          </select>
        </label>
        {rotations && (
          <div className="explorer-campaigns" role="group" aria-label="Illustrated campaign">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                aria-pressed={campaign === index}
                onClick={() => {
                  setCampaign(index)
                  setPulseZone(99)
                }}
              >
                Campaign {index + 1}
              </button>
            ))}
          </div>
        )}
        <button className="text-button" onClick={onCrops}>
          <Sprout size={17} />
          Check crop references
        </button>

        <details>
          <summary>What do we actually know?</summary>
          <p>
            Shape: your saved outline. Flat schematic ground, without elevation data. Shape is normalised for viewing; plants and spacing are not to scale.
            Plants, spacing and growth are illustrations.
          </p>
          <p>Soil type: {profile.soil} · user input. Soil moisture: not measured. Modelled soil properties, when loaded, are listed separately below.</p>
          {climate ? (
            <p>
              NASA POWER at {climate.lat}, {climate.lon}: {climate.start} to {climate.end}.{' '}
              {climate.delivery === 'saved_observation' ? 'Saved Mantaro example. ' : ''}Mean temperature{' '}
              {climate.summary.temperature_mean.value ?? 'unknown'} °C; period rainfall {climate.summary.rainfall_total.value ?? 'unknown'} mm. Retrieved{' '}
              {climate.retrieved_at}. {climate.spatial_resolution}
            </p>
          ) : (
            <p>Historical weather: not loaded.</p>
          )}
          {soil && (
            <p>
              Soil source: {soil.provenance.source}. Model estimate, {soil.provenance.spatial_resolution}. Profile pH:{' '}
              {soil.ph_h2o?.profile_mean ?? 'unavailable'}. Retrieved {soil.provenance.retrieved_at}.
            </p>
          )}
          {terrain && (
            <p>
              Terrain source: {terrain.provenance.source}. Elevation {terrain.elevation_m ?? 'unavailable'} m; sampled slope{' '}
              {terrain.slope_percent ?? 'unavailable'}%. {terrain.provenance.spatial_resolution}. Retrieved {terrain.provenance.retrieved_at}. These summary
              values do not deform the flat 3D illustration.
            </p>
          )}
          {onEvidence && (
            <button className="text-button" onClick={onEvidence}>
              Open soil and terrain sources
            </button>
          )}
          <p>No crop demand, soil change or yield simulation is performed.</p>
        </details>

        {vegetation && <details className="canopy-reading"><summary>Satellite context for this point</summary><p>Latest usable NDVI: {vegetation.data.filter(row => row.ndvi !== null).at(-1)?.ndvi ?? 'Unavailable'} ? historical, not the illustrated crop stage.</p><p>{vegetation.source} ? {vegetation.spatial_resolution}</p></details>}
        <details><summary>Preventive crop planning</summary><p>Vary botanical families and review soil cover with your agronomist. These practices may support integrated pest management; no pesticide reduction or fertilizer saving is measured here.</p></details>
        {prediction && <details><summary>Experimental satellite outlook</summary><p>{prediction.status === 'predicted' ? `${prediction.predicted_ndvi?.value.toFixed(2)} NDVI for ${prediction.target_date}. Satellite pixel context, not a prediction of these illustrated plants.` : prediction.reason || 'No validated outlook available.'}</p></details>}
        <LocalBudget area={allocatedAreaHa} />
        <details className="explorer-sim-details" open={isDesktop || undefined}>
          <summary>
            <Grid size={15} />
            <span>
              Area ({sim.allocatedAreaHa.toFixed(2)} ha) &amp; time ({durationDays} d)
            </span>
          </summary>
          <div className="explorer-sim-body">
            <div className="sim-section-header">
              <span>Parcel zones ({activeZoneCount}/4 planted)</span>
              <button
                type="button"
                className="sim-mini-action"
                onClick={() => {
                  setActiveZones([true, true, true, true])
                  setPulseZone(99)
                }}
              >
                <Sparkles size={13} />
                Plant all
              </button>
            </div>
            <div className="sim-zone-grid" role="group" aria-label="Parcel planting zones">
              {sectorData.sectors.map((sec, idx) => (
                <button
                  type="button"
                  key={sec.id}
                  className="sim-zone-btn"
                  disabled={sec.areaHa <= 0}
                  aria-pressed={activeZones[idx]}
                  onClick={() => toggleZone(idx)}
                >
                  <strong>{sec.code}</strong>
                  <small>{sec.areaHa.toFixed(2)} ha</small>
                </button>
              ))}
            </div>
            <p className="sim-area-readout">
              Planted area: <strong>{sim.allocatedAreaHa.toFixed(3)} ha</strong> ({sim.coveragePercent}% of {totalAreaHa.toFixed(3)} ha outline)
            </p>

            <div className="sim-time-grid">
              <label>
                <span>
                  <Clock size={13} /> Cycle (days)
                </span>
                <input
                  type="number"
                  min={30}
                  max={240}
                  step={5}
                  value={durationDays}
                  onChange={(e) => {
                    const val = Math.max(30, Math.min(240, Number(e.target.value) || spec.defaultDays))
                    setCustomDays((prev) => ({ ...prev, [crop]: val }))
                    setAppliedNotice(false)
                  }}
                />
              </label>
              <label>
                <span>Sowing month</span>
                <select
                  value={startMonth}
                  onChange={(e) => {
                    setStartMonth(Number(e.target.value))
                    setAppliedNotice(false)
                  }}
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {SHORT_MONTHS[idx]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={`sim-climate-card status-${sim.thermalStatus}`}>
              <p>
                <Thermometer size={14} />
                <span>{thermalLabel}</span>
              </p>
              <small>
                Cycle window: {sim.activeMonthLabel} · Ref: {spec.cycleDaysMin}–{spec.cycleDaysMax} d
                {sim.projectedCycleRainMm !== null
                  ? ` · Est. cycle rain: ${sim.projectedCycleRainMm} mm (~${sim.interceptedRainM3} m³ on selected area)`
                  : ''}
                {role === 'agronomist' && sim.estimatedNFixationKg !== null ? ` · N₂ ref: ~${sim.estimatedNFixationKg} kg N` : ''}
              </small>
            </div>

            {onApplySimulation && (
              <button
                type="button"
                className="secondary-button sim-apply-btn"
                onClick={() => {
                  onApplySimulation({
                    cropId: crop,
                    cropName: labels[crop] || crop,
                    allocatedAreaHa: sim.allocatedAreaHa,
                    totalAreaHa,
                    activeZones,
                    durationDays,
                    startMonth,
                    stage: stages[stage].toLowerCase(),
                    summary: sim,
                  })
                  setAppliedNotice(true)
                }}
              >
                <Check size={15} />
                <span>{appliedNotice ? 'Saved to field plan' : 'Use area & crop in my plan'}</span>
              </button>
            )}
          </div>
        </details>
      </div>

      <div className="growth-timeline">
        <div className="growth-timeline-heading">
          <div>
            <span className="eyebrow">
              ILLUSTRATIVE · NOT TO SCALE · DAY {sim.stageDay}/{durationDays} ({sim.allocatedAreaHa.toFixed(2)} HA)
            </span>
            <h2>
              {labels[crop] || crop.replaceAll('_', ' ')} · {crop === 'fallow' ? 'Resting field' : stages[stage]}
            </h2>
          </div>
          <div>
            <button className="icon-button" aria-label="Previous growth stage" disabled={stage === 0} onClick={() => setStage(stage - 1)}>
              <ChevronLeft size={19} />
            </button>
            <button className="icon-button" aria-label="Next growth stage" disabled={stage === 4} onClick={() => setStage(stage + 1)}>
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="growth-stage-buttons" role="group" aria-label="Illustrative growth stage">
          {stages.map((name, index) => (
            <button key={name} aria-label={name} aria-pressed={stage === index} onClick={() => setStage(index)}>
              <span>{index + 1}</span>
              <b className="growth-stage-label">
                <span className="stage-label-full">{name}</span>
                <span className="stage-label-short" aria-hidden="true">
                  {shortStages[index]}
                </span>
              </b>
              {index < 4 && <ArrowRight size={14} />}
            </button>
          ))}
        </div>
        <p role="status">
          {crop === 'fallow' ? 'A rest campaign is shown without an illustrated crop.' : stageNotes[stage]}{' '}
          {rotations ? 'Crop sequence from your comparison.' : 'Preview crop only; your saved profile is unchanged.'}
        </p>
      </div>
    </section>
  )
}
