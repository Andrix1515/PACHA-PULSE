import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, CircleHelp, Thermometer, X } from 'lucide-react'
import type { ClimateResponse, Location } from '../../types'
import { cropReferences, referenceCheck } from './references'
import type { CropCheck } from './references'

interface Props { open: boolean; onClose: () => void; climate: ClimateResponse | null; location: Location | null; onWeather: () => void }
const labels: Record<CropCheck, string> = { within: 'Within the reference band', outside: 'Outside the reference band', unknown: 'More information needed' }
export default function CropGuide({ open, onClose, climate, location, onWeather }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const origin = useRef<HTMLElement | null>(null)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState('maize')
  useEffect(() => {
    if (open) { origin.current = document.activeElement as HTMLElement; dialog.current?.showModal() }
    else { dialog.current?.close(); origin.current?.focus() }
  }, [open])
  const crops = cropReferences.filter((crop) => filter === 'all' || referenceCheck(crop, climate, location).state === filter)
  const current = crops.find((crop) => crop.id === selected) ?? crops[0]
  const result = current ? referenceCheck(current, climate, location) : null
  return <dialog ref={dialog} className="crop-guide-dialog" aria-labelledby="crop-guide-heading" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header><div><span className="eyebrow">A STARTING POINT FOR A CONVERSATION</span><h2 id="crop-guide-heading">What could I grow here?</h2></div><button className="icon-button" aria-label="Close crop guide" onClick={onClose}><X size={21} /></button></header>
    <p className="crop-guide-intro">A country has many climates. Let us compare the weather point you selected with a few published crop references.</p>
    <p className="crop-guide-boundary"><CircleHelp size={19} />This is a question list, not an approved crop list. Soil, water, variety and the planting season still need checking. No crop is blocked.</p>
    <label className="crop-filter">Focus the list<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All crops</option><option value="within">Within reference temperature band</option><option value="outside">Outside reference temperature band</option><option value="unknown">More information needed</option></select></label>
    <div className="crop-reference-tabs" role="group" aria-label="Crop references">{crops.map((crop) => <button key={crop.id} aria-pressed={current?.id === crop.id} onClick={() => setSelected(crop.id)}>{crop.name}</button>)}</div>
    {current && result ? <article className="crop-reference-card" aria-label={`${current.name} reference`}><div className="crop-reference-title"><h3>{current.name}</h3><span className={`crop-check crop-check-${result.state}`}>{result.state === 'within' ? <Check size={15} /> : <CircleHelp size={15} />}{labels[result.state]}</span></div><p>{current.context}</p><div className="crop-reference-values"><div><Thermometer size={18} /><span>Published reference<strong>{current.band ? `${current.band[0]}–${current.band[1]} °C` : 'Not configured'}</strong><small>{current.scope}</small></span></div><div><Thermometer size={18} /><span>Selected historical period<strong>{result.value === null ? 'Not assessed' : `${result.value.toFixed(1)} °C`}</strong><small>{result.reason}</small></span></div></div><p className="crop-reference-source"><a href={current.url} target="_blank" rel="noreferrer">{current.source} ↗</a><br />Reference reviewed {current.reviewed}. Reference ranges describe different crop contexts; they are not a ranking.</p></article> : <p className="empty-reference" role="status">No crops in this view. Try All crops or load a different historical period. An empty list does not mean nothing can grow here.</p>}
    {climate && location && Math.abs(climate.lat - location.lat) < .00001 && Math.abs(climate.lon - location.lon) < .00001 ? <p className="crop-weather-source">{climate.delivery === 'saved_observation' ? 'Saved Mantaro example' : 'Selected query point'} · NASA POWER · {climate.lat}, {climate.lon}<br />{climate.start} to {climate.end} · {climate.spatial_resolution}<br />Retrieved {climate.retrieved_at}. A selected month is not a growing-season assessment.</p> : <button className="secondary-button" onClick={() => { onClose(); onWeather() }}>{location ? 'Load weather for my point' : 'Choose my field first'}<ArrowRight size={17} /></button>}
  </dialog>
}
