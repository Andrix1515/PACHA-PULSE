import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { divIcon, DomEvent } from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, ScaleControl, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import PlaceSearch from './PlaceSearch'
import CoordinateForm from '../parcel/CoordinateForm'
import type { Location, UserRole } from '../../types'
import { containsPoint, createBoundary, importBoundary, MAX_MAP_LAT, MAX_VERTICES, parseCoordinate, representativePoint, validateVertex, verticesOf } from '../parcel/geometry'
import type { ParcelBoundary, Vertex } from '../parcel/geometry'

type LayerId = 'street' | 'satellite' | 'terrain'

interface TileLayerDef {
  id: LayerId
  label: string
  url: string
  attribution: string
  maxNativeZoom: number
}

const TILE_LAYERS: TileLayerDef[] = [
  {
    id: 'street',
    label: 'Street',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxNativeZoom: 19,
  },
  {
    id: 'terrain',
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxNativeZoom: 17,
  },
]


interface Props {
  location: Location | null
  onSelect: (location: Location) => void
  boundary: ParcelBoundary | null
  onSaveBoundary: (boundary: ParcelBoundary | null) => void
  storageMessage: string
  role: UserRole
  immersive?: boolean
  onState?: (drawing: boolean, points: number) => void
  onExplore?: () => void
  onCrops?: () => void
  onEvidence?: () => void
}

function MapInteraction({ location, boundary, drawing, vertices, onClose, onAdd, onSelect, onView }: Props & { drawing: boolean; vertices: Vertex[]; onClose: () => void; onAdd: (vertex: Vertex) => void; onView: (center: Vertex, zoom: number) => void }) {
  const map = useMap()
  useEffect(() => { const observer = new ResizeObserver(() => map.invalidateSize({ animate: false })); observer.observe(map.getContainer()); return () => observer.disconnect() }, [map])
  useMapEvents({
    click(event) {
      const vertex = { lat: Number(event.latlng.lat.toFixed(7)), lon: Number((((event.latlng.lng + 180) % 360 + 360) % 360 - 180).toFixed(7)) }
      if (Math.abs(vertex.lat) > MAX_MAP_LAT) return
      if (drawing && vertices.length >= 3 && map.latLngToContainerPoint([vertices[0].lat, vertices[0].lon]).distanceTo(event.containerPoint) <= 18) onClose()
      else if (drawing) onAdd(vertex)
      else onSelect({ ...vertex, source: 'map' })
    },
    moveend() { const center = map.getCenter(); onView({ lat: center.lat, lon: center.lng }, map.getZoom()) },
    zoomend() { const center = map.getCenter(); onView({ lat: center.lat, lon: center.lng }, map.getZoom()) },
  })
  useEffect(() => {
    if (location) map.setView([Math.max(-MAX_MAP_LAT, Math.min(MAX_MAP_LAT, location.lat)), location.lon], Math.max(map.getZoom(), 6), { animate: false })
  }, [location, map])
  useEffect(() => {
    if (boundary) map.fitBounds(verticesOf(boundary).map((vertex) => [vertex.lat, vertex.lon]), { padding: [35, 35], maxZoom: 18, animate: false })
  }, [boundary, map])
  useEffect(() => {
    map.getContainer().setAttribute('aria-label', 'Interactive map. Arrow keys pan; plus and minus zoom. Use the external controls to add points.')
    const enabled = map.doubleClickZoom.enabled()
    if (drawing) map.doubleClickZoom.disable()
    return () => { if (enabled) map.doubleClickZoom.enable() }
  }, [map, drawing])
  return location && Math.abs(location.lat) <= MAX_MAP_LAT ? <CircleMarker center={[location.lat, location.lon]} radius={7} pathOptions={{ color: '#183d2c', fillColor: '#fff', fillOpacity: 1, weight: 3 }} /> : null
}

function VertexRow({ vertex, index, count, onUpdate, onRemove, onMove }: { vertex: Vertex; index: number; count: number; onUpdate: (vertex: Vertex) => void; onRemove: () => void; onMove: (direction: number) => void }) {
  const [lat, setLat] = useState(String(vertex.lat))
  const [lon, setLon] = useState(String(vertex.lon))
  const [error, setError] = useState('')
  useEffect(() => { setLat(String(vertex.lat)); setLon(String(vertex.lon)); setError('') }, [vertex.lat, vertex.lon])
  function apply() {
    try { const next = { lat: parseCoordinate(lat), lon: parseCoordinate(lon) }; validateVertex(next); onUpdate(next); setError('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Check the coordinates.') }
  }
  return <li className="vertex-row">
    <strong>Point {index + 1}</strong>
    <label>Latitude<input inputMode="decimal" aria-label={`Latitude of point ${index + 1}`} value={lat} onChange={(event) => setLat(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `vertex-error-${index}` : undefined} /></label>
    <label>Longitude<input inputMode="decimal" aria-label={`Longitude of point ${index + 1}`} value={lon} onChange={(event) => setLon(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `vertex-error-${index}` : undefined} /></label>
    <div className="vertex-actions"><button type="button" onClick={apply} aria-label={`Apply coordinates for point ${index + 1}`}>Apply</button><button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move point up ${index + 1}`}>↑</button><button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move point down ${index + 1}`}>↓</button><button type="button" onClick={onRemove} aria-label={`Remove point ${index + 1}`}>Remove</button></div>
    {error && <p className="field-error" role="alert" id={`vertex-error-${index}`}>{error}</p>}
  </li>
}

export default function LocationMap(props: Props) {
  const { location, onSelect, boundary, onSaveBoundary, storageMessage, role, immersive = false, onState, onExplore, onCrops, onEvidence } = props
  const mapRef = useRef<LeafletMap | null>(null)
  const [activeLayer, setActiveLayer] = useState<LayerId>('street')
  const currentTile = TILE_LAYERS.find((layer) => layer.id === activeLayer)!
  const [tileError, setTileError] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [vertices, setVertices] = useState<Vertex[]>(() => verticesOf(boundary))
  const [name, setName] = useState(boundary?.properties.name || '')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [view, setView] = useState({ lat: 12, lon: -12, zoom: 2 })
  const [toolsOpen, setToolsOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  useEffect(() => { onState?.(drawing, vertices.length) }, [drawing, vertices.length, onState])
  const [deleted, setDeleted] = useState<ParcelBoundary | null>(null)
  useEffect(() => { setVertices(verticesOf(boundary)); setName(boundary?.properties.name || ''); setError('') }, [boundary])
  useEffect(() => { const frame = requestAnimationFrame(() => mapRef.current?.invalidateSize({ animate: false })); return () => cancelAnimationFrame(frame) }, [expanded])
  function add(vertex: Vertex) {
    try {
      validateVertex(vertex)
      if (vertices.length >= 3 && vertex.lat === vertices[0].lat && vertex.lon === vertices[0].lon) { save(); return }
      if (vertices.length >= MAX_VERTICES) throw new Error('At most 100 points are supported.')
      if (vertices.some((value) => value.lat === vertex.lat && value.lon === vertex.lon)) throw new Error('That point is already in the outline. Add at least three corners before closing at point 1.')
      setVertices((current) => [...current, vertex]); setDrawing(true); setError(''); setAnnouncement(`Point ${vertices.length + 1} added. The outline is still a draft.`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The point could not be added.') }
  }
  function manualAdd(event: FormEvent) {
    event.preventDefault()
    try { add({ lat: parseCoordinate(lat), lon: parseCoordinate(lon) }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Check the coordinates.') }
  }
  function save() {
    try {
      const next = createBoundary(vertices, name)
      onSaveBoundary(next); setDrawing(false); setDeleted(null); setError(''); requestAnimationFrame(() => (immersive ? document.querySelector<HTMLButtonElement>('.field-quick-tools button[aria-pressed]') : document.getElementById('parcel-draw-toggle'))?.focus()); setAnnouncement('Outline closed and saved. The query point is inside or on the field boundary.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The outline could not be closed.') }
  }
  function cancel() { setVertices(verticesOf(boundary)); setName(boundary?.properties.name || ''); setDrawing(false); setError(''); setAnnouncement('Draft changes discarded. The saved field is unchanged.') }
  function removeVertex(index: number) {
    setVertices((current) => current.filter((_, i) => i !== index)); setError(''); setAnnouncement(`Point ${index + 1} removed from the draft.`)
    requestAnimationFrame(() => document.getElementById('add-vertex-lat')?.focus())
  }
  function download() {
    if (!boundary) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(boundary, null, 2)], { type: 'application/geo+json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'pacha-pulse-field.geojson'; link.click(); URL.revokeObjectURL(url)
  }
  async function importFile(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 200_000) throw new Error('The file must be at most 200 kB and contain one field.')
      const next = importBoundary(JSON.parse(await file.text()))
      setVertices(verticesOf(next)); setName(next.properties.name); setDrawing(true); setError(''); setAnnouncement('GeoJSON checked and loaded as a draft. Review it, then select Close and save field.')
      mapRef.current?.fitBounds(verticesOf(next).map((vertex) => [vertex.lat, vertex.lon]), { padding: [35, 35], maxZoom: 18, animate: false })
    } catch (caught) { setError(caught instanceof SyntaxError ? 'The file does not contain valid JSON.' : caught instanceof Error ? caught.message : 'The file could not be imported.') }
  }
  const outside = boundary && location && !containsPoint(boundary, location)
  function findLocation() {
    if (!navigator.geolocation) { setError('Device location is unavailable. Use the map or Field tools to enter coordinates.'); setToolsOpen(true); return }
    setLocating(true); setError('')
    navigator.geolocation.getCurrentPosition((position) => { onSelect({ lat: position.coords.latitude, lon: position.coords.longitude, source: 'manual' }); setLocating(false); setAnnouncement('Device location selected. Check the point on the map before continuing.'); mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 16, { animate: false }) }, () => { setLocating(false); setError('Location could not be accessed. You can still select your field on the map or enter coordinates in Field tools.') }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 })
  }
  return <div className={`parcel-map-editor ${immersive ? 'immersive-map' : ''}`}>
    {immersive && <PlaceSearch onChoose={(place) => { if (place.bounds) mapRef.current?.fitBounds(place.bounds, { padding: [70, 70], maxZoom: 13, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches }); else mapRef.current?.setView([Math.max(-MAX_MAP_LAT, Math.min(MAX_MAP_LAT, place.lat)), place.lon], place.kind === 'country' ? 5 : 9, { animate: false }); setAnnouncement(`Browsing ${place.label}. Select your actual field to change the query point.`) }} />}
    {immersive && <div className="field-quick-tools" role="group" aria-label="Field actions"><button type="button" onClick={findLocation} disabled={locating}>{locating ? 'Finding your location...' : 'Find my location'}</button><button type="button" aria-pressed={drawing} onClick={() => { setDrawing(!drawing); setAnnouncement(drawing ? 'Drawing paused. Your draft is preserved.' : 'Tap each corner, then tap point 1 to close your field.') }}>{drawing ? 'Pause drawing' : 'Draw my field'}</button>{drawing && <button type="button" disabled={!vertices.length} onClick={() => setVertices((current) => current.slice(0, -1))}>Undo point</button>}{!drawing && onExplore && <button type="button" disabled={!boundary} title={boundary ? 'Explore your saved outline' : 'Save an outline to explore it in 3D'} onClick={onExplore}>Explore in 3D</button>}{!drawing && onCrops && <button type="button" onClick={onCrops}>Crop guide</button>}</div>}
    <div hidden={immersive}>
    <div className="map-toolbar" role="group" aria-label="Map tools"><button type="button" aria-pressed={!drawing} onClick={() => { setDrawing(false); setAnnouncement('Query point mode. Your draft is preserved.') }}>Choose query point</button><button id="parcel-draw-toggle" type="button" aria-pressed={drawing} onClick={() => { setDrawing(true); setAnnouncement('Drawing mode. Add points with clicks, taps, coordinates or the map center.') }}>Draw or edit field</button><button type="button" onClick={() => { setVertices([]); setName(''); setDrawing(true); setError(''); setAnnouncement('New draft. The saved field stays unchanged until you confirm its replacement.') }}>New outline</button><button type="button" onClick={() => setExpanded(!expanded)} aria-pressed={expanded}>{expanded ? 'Reduce map' : 'Expand map'}</button></div>
    <p className="map-instructions" id="map-help">{drawing ? 'Add corners in order. After three points, click or tap point 1 to close and save. You can also press Enter on point 1 or use Close and save field below.' : 'Click or tap to choose a query point. To outline your field, select Draw or edit field.'} Use arrow keys and +/− on the map to navigate. Every action also has an external control.</p>
    </div>
    <div className={`map-frame ${expanded ? 'map-expanded' : ''} ${drawing ? 'drawing-mode' : ''}`} role="region" aria-label="World map for selecting a location" aria-describedby="map-help" onKeyDown={(event) => { if (event.key === 'Escape' && drawing) { setDrawing(false); setAnnouncement('Drawing paused. Your draft is preserved.') } }}>
      <MapContainer ref={mapRef} center={[12, -12]} zoom={2} minZoom={2} maxZoom={19} zoomControl={false} scrollWheelZoom={false} worldCopyJump maxBounds={[[-MAX_MAP_LAT, -Infinity], [MAX_MAP_LAT, Infinity]]}>
        <TileLayer key={activeLayer} url={currentTile.url} maxNativeZoom={currentTile.maxNativeZoom} maxZoom={19} attribution={currentTile.attribution} eventHandlers={{ tileerror: () => setTileError(true) }} />
        <ZoomControl position="topleft" zoomInTitle="Zoom in" zoomOutTitle="Zoom out" /><ScaleControl position={immersive ? "topright" : "bottomleft"} imperial={false} />
        <MapInteraction {...props} drawing={drawing} vertices={vertices} onClose={save} onAdd={add} onView={(center, zoom) => setView({ ...center, zoom })} />
        {boundary && <Polygon positions={verticesOf(boundary).map((vertex) => [vertex.lat, vertex.lon])} pathOptions={{ color: '#244a38', fillColor: '#a9c681', fillOpacity: drawing ? .08 : .23, weight: 3 }} interactive={false} />}
        {drawing && vertices.length >= 2 && <Polyline positions={vertices.map((vertex) => [vertex.lat, vertex.lon])} pathOptions={{ color: '#a05223', weight: 3, dashArray: '6 5' }} interactive={false} />}
        {drawing && vertices.map((vertex, index) => <Marker key={`${index}-${index === 0 && vertices.length >= 3 ? 'close' : 'edit'}`} position={[vertex.lat, vertex.lon]} draggable keyboard bubblingMouseEvents={false} title={index === 0 && vertices.length >= 3 ? 'Close and save field at point 1' : `Point ${index + 1}: drag or edit coordinates below`} alt={`Point ${index + 1} in the draft`} icon={divIcon({ html: String(index + 1), className: `parcel-vertex-icon ${index === 0 && vertices.length >= 3 ? 'close-outline-point' : ''}`, iconSize: [32, 32], iconAnchor: [16, 16] })} eventHandlers={{ add(event) { event.target.getElement()?.setAttribute('aria-label', index === 0 && vertices.length >= 3 ? 'Close and save field at point 1' : `Point ${index + 1}: drag or edit coordinates below`) }, keydown(event) { if (index === 0 && ['Enter', ' '].includes(event.originalEvent.key)) { DomEvent.stop(event.originalEvent); if (vertices.length >= 3) save(); else setAnnouncement('Add at least three corners before closing the outline at point 1.') } }, click(event) { if (event.originalEvent) DomEvent.stopPropagation(event.originalEvent); if (index === 0) { if (vertices.length >= 3) save(); else setAnnouncement('Add at least three corners before closing the outline at point 1.') } }, dragend(event) { const point = event.target.getLatLng(); const next = { lat: Number(point.lat.toFixed(7)), lon: Number((((point.lng + 180) % 360 + 360) % 360 - 180).toFixed(7)) }; try { validateVertex(next); setVertices((current) => current.map((value, i) => i === index ? next : value)); setAnnouncement(`Point ${index + 1} moved. Save to confirm.`) } catch { setVertices((current) => [...current]); setError('Point outside the supported range.') } } }} />)}
      </MapContainer>
      <span className="map-center-crosshair" aria-hidden="true">+</span>
    </div>
    <details className={immersive ? 'field-tools-drawer' : 'plain-map-tools'} open={immersive ? toolsOpen : true} onToggle={(event) => { if (immersive) setToolsOpen(event.currentTarget.open) }}>
    <summary>{immersive ? 'Field tools' : 'Coordinates and outline tools'}</summary><div className="field-tools-content">
    {immersive && <div className="map-toolbar"><button type="button" onClick={() => { setVertices([]); setName(''); setDrawing(true); setError(''); setAnnouncement('New draft. Your saved outline stays unchanged until you save a replacement.') }}>New outline</button><button type="button" onClick={() => { setDrawing(true); setAnnouncement('Edit the saved outline with points or coordinates.') }}>Draw or edit field</button><button type="button" onClick={() => { setDrawing(false); setAnnouncement('Choose a query point on the map.') }}>Choose query point</button></div>}
    {<label className="map-layer-selector">Map layer<select value={activeLayer} onChange={(event) => { setActiveLayer(event.target.value as LayerId); setTileError(false) }}>{TILE_LAYERS.map((layer) => <option key={layer.id} value={layer.id}>{layer.label}</option>)}</select></label>}
    {immersive && onEvidence && <button type="button" className="secondary-button" disabled={!location} onClick={onEvidence}>Soil & terrain</button>}
    <CoordinateForm location={location} onSelect={onSelect} />
    <div className="map-toolbar" role="group" aria-label="Map navigation and detail"><button type="button" onClick={() => mapRef.current?.setView([12, -12], 2, { animate: false })}>World view</button><button type="button" disabled={!location} onClick={() => location && mapRef.current?.setView([Math.max(-MAX_MAP_LAT, Math.min(MAX_MAP_LAT, location.lat)), location.lon], 16, { animate: false })}>Zoom to point</button><button type="button" disabled={!boundary && vertices.length < 2} onClick={() => { const points = drawing && vertices.length >= 2 ? vertices : verticesOf(boundary); if (points.length >= 2) mapRef.current?.fitBounds(points.map((vertex) => [vertex.lat, vertex.lon]), { padding: [35, 35], maxZoom: 18, animate: false }) }}>Fit field</button>{drawing && <button type="button" onClick={() => { const point = mapRef.current?.getCenter(); if (point) add({ lat: Number(point.lat.toFixed(7)), lon: Number(point.lng.toFixed(7)) }) }}>Add map center as a point</button>}</div>
    {drawing && vertices.length >= 3 && <p className="close-outline-hint">Ready to close: click the green point 1, or focus it and press Enter. The same validation runs before saving.</p>}
    <p className="map-view-status" role="status">Center: {view.lat.toFixed(6)}°, {view.lon.toFixed(6)}° · Zoom {view.zoom} · WGS84</p>
    {tileError && <p className="field-error" role="status">Some map tiles could not load. You can still use coordinates and outline points.</p>}
    {location && Math.abs(location.lat) > MAX_MAP_LAT && <p className="field-error" role="status">Coordinates saved. This projection cannot display polar latitudes above ±85.05°.</p>}
    {outside && <p className="field-error" role="status">The query point is outside the saved field. NASA POWER will use that point, not the polygon. <button type="button" className="text-button" onClick={() => boundary && onSelect({ ...representativePoint(boundary), source: 'parcel' })}>Use field query point</button></p>}
    {boundary && <div className="boundary-summary" aria-label="Saved field"><strong>{boundary.properties.name}</strong><p>Approximate outlined area: <b>{boundary.properties.area.value.toLocaleString('en', { maximumFractionDigits: 4 })} ha</b> · {verticesOf(boundary).length} vertices</p><p>User outline; calculated area without terrain or cadastral precision. NASA still queries a point, not a polygon average.</p><div className="map-toolbar"><button type="button" onClick={download}>Export field GeoJSON</button><button type="button" onClick={() => { setDeleted(boundary); onSaveBoundary(null); setDrawing(false); setAnnouncement('Field deleted. You can undo this action.') }}>Delete saved field</button></div></div>}
    {deleted && !boundary && <button type="button" className="secondary-button" onClick={() => { onSaveBoundary(deleted); setDeleted(null); setAnnouncement('Field restored.') }}>Undo field deletion</button>}
    {drawing && <section className="boundary-controls" aria-labelledby="boundary-heading"><h3 id="boundary-heading">Outline points — draft</h3><p>{role === 'grower' ? 'Follow the edge of your field and add its corners in order. No dragging is required.' : 'Simple WGS84 ring, at most 100 vertices. Intersections, duplicates, range and area are checked before saving.'}</p><label>Outline name<input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label><form onSubmit={manualAdd} noValidate aria-label="Add a point using coordinates" className="add-vertex-form"><label>Vertex latitude<input id="add-vertex-lat" inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} /></label><label>Vertex longitude<input inputMode="decimal" value={lon} onChange={(event) => setLon(event.target.value)} /></label><button type="submit" className="secondary-button">Add vertex</button></form>
      <p className="helper-text">{vertices.length} of {MAX_VERTICES} points. The dashed line is a draft; the saved outline is solid.</p>
      <ol className="vertex-list" aria-label="Editable outline vertices">{vertices.map((vertex, index) => <VertexRow key={index} index={index} count={vertices.length} vertex={vertex} onUpdate={(next) => { setVertices((current) => current.map((value, i) => i === index ? next : value)); setError(''); setAnnouncement(`Point ${index + 1} updated.`) }} onRemove={() => removeVertex(index)} onMove={(direction) => { setVertices((current) => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next }); setAnnouncement(`Point ${index + 1} reordered.`) }} />)}</ol><div className="map-toolbar"><button type="button" disabled={!vertices.length} onClick={() => { setVertices((current) => current.slice(0, -1)); setError(''); setAnnouncement('Last draft point removed.') }}>Remove last point</button><button type="button" className="primary-button" onClick={save}>Close and save field</button><button type="button" onClick={cancel}>Cancel outline changes</button></div>
    </section>}
    <div className="parcel-import"><label>Import field GeoJSON<input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = '' }} /></label><p>One active field per browser. Only the outline is saved, not the agricultural profile. Export it before importing another area.</p></div>
    </div></details>
    {error && <p className="field-error" role="alert">{error}</p>}
    {storageMessage && <p className="map-announcement" role="status">{storageMessage}</p>}
    <p className={`map-announcement ${immersive ? 'sr-only' : ''}`} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </div>
}
