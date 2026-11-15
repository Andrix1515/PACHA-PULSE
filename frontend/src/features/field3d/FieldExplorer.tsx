import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Expand, RotateCcw, Sprout, ZoomIn, ZoomOut } from 'lucide-react'
import type { AgriculturalProfile, ClimateResponse, Rotation, SoilProfile, TerrainInfo } from '../../types'
import type { ParcelBoundary } from '../parcel/geometry'
import { fieldFootprint } from './fieldGeometry'
import type { CameraCommand } from './fieldRenderer'

const stages = ['Sowing', 'Sprouting', 'Growing', 'Flowering', 'Harvest']
const shortStages = ['Sow', 'Sprout', 'Grow', 'Flower', 'Harvest']
const stageNotes = ['Seeds mark a possible planting pattern.', 'Small shoots illustrate emergence.', 'The plants are shown with larger stems and leaves.', 'Flowers or seed heads illustrate a later stage.', 'Stubble illustrates a field after harvest. No yield is estimated.']
const names: Record<string, string> = { maize: 'Maize', bean: 'Bean', lentil: 'Lentil', potato: 'Potato', wheat: 'Wheat', quinoa: 'Quinoa', fallow: 'Fallow / rest' }
type Props = { boundary: ParcelBoundary; profile: AgriculturalProfile; climate: ClimateResponse | null; rotations: Rotation[] | null; onBack: () => void; onCrops: () => void; onStage: (stage: string) => void; soil?: SoilProfile | null; terrain?: TerrainInfo | null; onEvidence?: () => void; cropLabels?: Record<string, string> }
export default function FieldExplorer({ boundary, profile, climate, rotations, onBack, onCrops, onStage, soil, terrain, onEvidence, cropLabels }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof import('./fieldRenderer')['mountField']> | null>(null)
  const [renderer, setRenderer] = useState('loading')
  const [stage, setStage] = useState(2)
  const [sequence, setSequence] = useState(0)
  const [campaign, setCampaign] = useState(0)
  const initialCrop = Object.keys(names).find((crop) => names[crop].toLowerCase() === profile.crop.toLowerCase()) || 'maize'
  const [previewCrop, setPreviewCrop] = useState(initialCrop)
  useEffect(() => { document.getElementById('field-3d-heading')?.focus({ preventScroll: true }) }, [])
  const labels = { ...names, ...cropLabels }
  const crop = rotations?.[sequence]?.crops[campaign] ?? previewCrop
  const current = useRef({ crop, stage }); current.current = { crop, stage }
  useEffect(() => {
    let cancelled = false
    import('./fieldRenderer').then(({ mountField }) => {
      if (cancelled || !host.current) return
      try { controller.current = mountField(host.current, boundary, () => setRenderer('svg')); controller.current.update(current.current.crop, current.current.stage); setRenderer('webgl') }
      catch { setRenderer('svg') }
    }).catch(() => { if (!cancelled) setRenderer('svg') })
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null }
  }, [boundary])
  useEffect(() => { if (renderer === 'svg') { controller.current?.dispose(); controller.current = null } else controller.current?.update(crop, stage) }, [crop, stage, renderer])
  useEffect(() => { onStage(stages[stage].toLowerCase()) }, [stage, onStage])
  const ring = fieldFootprint(boundary)
  return <section className="field-explorer" aria-labelledby="field-3d-heading">
    <div className="explorer-heading"><button className="secondary-button" aria-label="Back to map" onClick={onBack}><ArrowLeft size={17} /><span>Back to map</span></button><span className="eyebrow">YOUR OUTLINE. A NEW PERSPECTIVE.</span><h1 id="field-3d-heading" tabIndex={-1}>A little closer to your field.</h1><p>Drag to turn. Pinch or scroll to get closer.</p></div>
    <div className="field-canvas" data-renderer={renderer} ref={host} aria-label="Interactive illustrative field model" role="img" />
    {renderer === 'svg' && <div className="field-model-fallback"><svg viewBox="-6 -6 12 12" aria-hidden="true"><polygon points={ring.map(([x, z]) => `${x},${z}`).join(' ')} fill="#b2c98c" stroke="#466640" strokeWidth=".07" /></svg><p>3D is unavailable on this device. Your outline and stage controls still work.</p></div>}
    <div className="explorer-camera" role="group" aria-label="3D camera controls">{([{ action: 'left', label: 'Rotate field left', Icon: RotateCcw }, { action: 'right', label: 'Rotate field right', Icon: RotateCcw }, { action: 'in', label: 'Zoom field in', Icon: ZoomIn }, { action: 'out', label: 'Zoom field out', Icon: ZoomOut }, { action: 'reset', label: 'Reset field camera', Icon: Expand }] as const).map(({ action, label, Icon }) => <button className="icon-button" key={action} aria-label={label} disabled={renderer !== 'webgl'} onClick={() => controller.current?.command(action as CameraCommand)}><Icon size={20} /></button>)}</div>
    <div className="explorer-options"><label>{rotations ? 'Planting sequence' : 'Illustrate a crop'}<select value={rotations ? sequence : previewCrop} onChange={(event) => rotations ? setSequence(Number(event.target.value)) : setPreviewCrop(event.target.value)}>{rotations ? rotations.map((rotation, index) => <option value={index} key={rotation.name}>{rotation.name}</option>) : Object.entries(names).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>{rotations && <div className="explorer-campaigns" role="group" aria-label="Illustrated campaign">{[0, 1, 2].map((index) => <button key={index} aria-pressed={campaign === index} onClick={() => setCampaign(index)}>Campaign {index + 1}</button>)}</div>}<button className="text-button" onClick={onCrops}><Sprout size={17} />Check crop references</button><details><summary>What do we actually know?</summary><p>Shape: your saved outline. Flat schematic ground, without elevation data. Shape is normalised for viewing; plants and spacing are not to scale. Plants, spacing and growth are illustrations.</p><p>Soil type: {profile.soil} · user input. Soil moisture: not measured. Modelled soil properties, when loaded, are listed separately below.</p>{climate ? <p>NASA POWER at {climate.lat}, {climate.lon}: {climate.start} to {climate.end}. {climate.delivery === 'saved_observation' ? 'Saved Mantaro example. ' : ''}Mean temperature {climate.summary.temperature_mean.value ?? 'unknown'} °C; period rainfall {climate.summary.rainfall_total.value ?? 'unknown'} mm. Retrieved {climate.retrieved_at}. {climate.spatial_resolution}</p> : <p>Historical weather: not loaded.</p>}{soil && <p>Soil source: {soil.provenance.source}. Model estimate, {soil.provenance.spatial_resolution}. Profile pH: {soil.ph_h2o?.profile_mean ?? 'unavailable'}. Retrieved {soil.provenance.retrieved_at}.</p>}{terrain && <p>Terrain source: {terrain.provenance.source}. Elevation {terrain.elevation_m ?? 'unavailable'} m; sampled slope {terrain.slope_percent ?? 'unavailable'}%. {terrain.provenance.spatial_resolution}. Retrieved {terrain.provenance.retrieved_at}. These summary values do not deform the flat 3D illustration.</p>}{onEvidence && <button className="text-button" onClick={onEvidence}>Open soil and terrain sources</button>}<p>No crop demand, soil change or yield simulation is performed.</p></details></div>
    <div className="growth-timeline"><div className="growth-timeline-heading"><div><span className="eyebrow">ILLUSTRATIVE · NOT TO SCALE</span><h2>{labels[crop] || crop.replaceAll('_', ' ')} · {crop === 'fallow' ? 'Resting field' : stages[stage]}</h2></div><div><button className="icon-button" aria-label="Previous growth stage" disabled={stage === 0} onClick={() => setStage(stage - 1)}><ChevronLeft size={19} /></button><button className="icon-button" aria-label="Next growth stage" disabled={stage === 4} onClick={() => setStage(stage + 1)}><ChevronRight size={19} /></button></div></div><div className="growth-stage-buttons" role="group" aria-label="Illustrative growth stage">{stages.map((name, index) => <button key={name} aria-label={name} aria-pressed={stage === index} onClick={() => setStage(index)}><span>{index + 1}</span><b className="growth-stage-label"><span className="stage-label-full">{name}</span><span className="stage-label-short" aria-hidden="true">{shortStages[index]}</span></b>{index < 4 && <ArrowRight size={14} />}</button>)}</div><p role="status">{crop === 'fallow' ? 'A rest campaign is shown without an illustrated crop.' : stageNotes[stage]} {rotations ? 'Crop sequence from your comparison.' : 'Preview crop only; your saved profile is unchanged.'}</p></div>
  </section>
}
