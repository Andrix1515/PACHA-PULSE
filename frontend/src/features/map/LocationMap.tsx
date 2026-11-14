import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { divIcon } from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, ScaleControl, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import type { Location, UserRole } from '../../types'
import { containsPoint, createBoundary, importBoundary, MAX_MAP_LAT, MAX_VERTICES, parseCoordinate, representativePoint, validateVertex, verticesOf } from '../parcel/geometry'
import type { ParcelBoundary, Vertex } from '../parcel/geometry'

interface Props {
  location: Location | null
  onSelect: (location: Location) => void
  boundary: ParcelBoundary | null
  onSaveBoundary: (boundary: ParcelBoundary | null) => void
  storageMessage: string
  role: UserRole
}

function MapInteraction({ location, boundary, drawing, onAdd, onSelect, onView }: Props & { drawing: boolean; onAdd: (vertex: Vertex) => void; onView: (center: Vertex, zoom: number) => void }) {
  const map = useMap()
  useMapEvents({
    click(event) {
      const vertex = { lat: Number(event.latlng.lat.toFixed(7)), lon: Number((((event.latlng.lng + 180) % 360 + 360) % 360 - 180).toFixed(7)) }
      if (Math.abs(vertex.lat) > MAX_MAP_LAT) return
      if (drawing) onAdd(vertex)
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
    map.getContainer().setAttribute('aria-label', 'Mapa interactivo. Flechas para desplazar; más y menos para acercar o alejar. Usa los controles externos para añadir puntos.')
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
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Revisa las coordenadas.') }
  }
  return <li className="vertex-row">
    <strong>Punto {index + 1}</strong>
    <label>Latitud<input inputMode="decimal" aria-label={`Latitud del punto ${index + 1}`} value={lat} onChange={(event) => setLat(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `vertex-error-${index}` : undefined} /></label>
    <label>Longitud<input inputMode="decimal" aria-label={`Longitud del punto ${index + 1}`} value={lon} onChange={(event) => setLon(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `vertex-error-${index}` : undefined} /></label>
    <div className="vertex-actions"><button type="button" onClick={apply} aria-label={`Aplicar coordenadas del punto ${index + 1}`}>Aplicar</button><button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Subir punto ${index + 1}`}>↑</button><button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Bajar punto ${index + 1}`}>↓</button><button type="button" onClick={onRemove} aria-label={`Eliminar punto ${index + 1}`}>Eliminar</button></div>
    {error && <p className="field-error" role="alert" id={`vertex-error-${index}`}>{error}</p>}
  </li>
}

export default function LocationMap(props: Props) {
  const { location, onSelect, boundary, onSaveBoundary, storageMessage, role } = props
  const mapRef = useRef<LeafletMap | null>(null)
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
  const [deleted, setDeleted] = useState<ParcelBoundary | null>(null)
  useEffect(() => { setVertices(verticesOf(boundary)); setName(boundary?.properties.name || ''); setError('') }, [boundary])
  useEffect(() => { const frame = requestAnimationFrame(() => mapRef.current?.invalidateSize({ animate: false })); return () => cancelAnimationFrame(frame) }, [expanded])
  function add(vertex: Vertex) {
    try {
      validateVertex(vertex)
      if (vertices.length >= MAX_VERTICES) throw new Error('Se admiten como máximo 100 puntos.')
      if (vertices.some((value) => value.lat === vertex.lat && value.lon === vertex.lon)) throw new Error('Ese punto ya está en el contorno. El cierre se hace al guardar.')
      setVertices((current) => [...current, vertex]); setDrawing(true); setError(''); setAnnouncement(`Punto ${vertices.length + 1} añadido. El contorno aún es un borrador.`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo añadir el punto.') }
  }
  function manualAdd(event: FormEvent) {
    event.preventDefault()
    try { add({ lat: parseCoordinate(lat), lon: parseCoordinate(lon) }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Revisa las coordenadas.') }
  }
  function save() {
    try {
      const next = createBoundary(vertices, name)
      onSaveBoundary(next); setDrawing(false); setDeleted(null); setError(''); requestAnimationFrame(() => document.getElementById('parcel-draw-toggle')?.focus()); setAnnouncement('Contorno cerrado y guardado. El punto de consulta se ubicó dentro o sobre el límite de la parcela.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cerrar el contorno.') }
  }
  function cancel() { setVertices(verticesOf(boundary)); setName(boundary?.properties.name || ''); setDrawing(false); setError(''); setAnnouncement('Cambios del borrador descartados. Se conserva la parcela guardada.') }
  function removeVertex(index: number) {
    setVertices((current) => current.filter((_, i) => i !== index)); setError(''); setAnnouncement(`Punto ${index + 1} eliminado del borrador.`)
    requestAnimationFrame(() => document.getElementById('add-vertex-lat')?.focus())
  }
  function download() {
    if (!boundary) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(boundary, null, 2)], { type: 'application/geo+json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'pacha-pulse-parcela.geojson'; link.click(); URL.revokeObjectURL(url)
  }
  async function importFile(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 200_000) throw new Error('El archivo debe ser de hasta 200 kB y contener una sola parcela.')
      const next = importBoundary(JSON.parse(await file.text()))
      setVertices(verticesOf(next)); setName(next.properties.name); setDrawing(true); setError(''); setAnnouncement('GeoJSON validado y cargado como borrador. Revisa y pulsa Cerrar y guardar parcela.')
      mapRef.current?.fitBounds(verticesOf(next).map((vertex) => [vertex.lat, vertex.lon]), { padding: [35, 35], maxZoom: 18, animate: false })
    } catch (caught) { setError(caught instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : caught instanceof Error ? caught.message : 'No se pudo importar el archivo.') }
  }
  const outside = boundary && location && !containsPoint(boundary, location)
  return <div className="parcel-map-editor">
    <div className="map-toolbar" role="group" aria-label="Herramientas del mapa"><button type="button" aria-pressed={!drawing} onClick={() => { setDrawing(false); setAnnouncement('Modo punto de consulta. El borrador se conserva.') }}>Elegir punto de consulta</button><button id="parcel-draw-toggle" type="button" aria-pressed={drawing} onClick={() => { setDrawing(true); setAnnouncement('Modo dibujo. Añade puntos con clic, toque, coordenadas o el centro del mapa.') }}>Dibujar o editar parcela</button><button type="button" onClick={() => { setVertices([]); setName(''); setDrawing(true); setError(''); setAnnouncement('Nuevo borrador. La parcela guardada se conserva hasta confirmar el reemplazo.') }}>Nuevo contorno</button><button type="button" onClick={() => setExpanded(!expanded)} aria-pressed={expanded}>{expanded ? 'Reducir mapa' : 'Ampliar mapa'}</button></div>
    <p className="map-instructions" id="map-help">{drawing ? 'Añade los puntos del borde en orden. Mueve los marcadores o edita sus coordenadas debajo. Cierra el contorno con el botón Guardar.' : 'Haz clic o toca para elegir un punto de consulta. Para delimitar el campo, activa Dibujar o editar parcela.'} Usa flechas y +/− sobre el mapa para navegar. Todas las acciones tienen controles externos.</p>
    <div className={`map-frame ${expanded ? 'map-expanded' : ''} ${drawing ? 'drawing-mode' : ''}`} role="region" aria-label="Mapa mundial para seleccionar una ubicación" aria-describedby="map-help" onKeyDown={(event) => { if (event.key === 'Escape' && drawing) { setDrawing(false); setAnnouncement('Dibujo pausado. El borrador se conserva.') } }}>
      <MapContainer ref={mapRef} center={[12, -12]} zoom={2} minZoom={2} maxZoom={19} zoomControl={false} scrollWheelZoom={false} worldCopyJump maxBounds={[[-MAX_MAP_LAT, -Infinity], [MAX_MAP_LAT, Infinity]]}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' eventHandlers={{ tileerror: () => setTileError(true) }} />
        <ZoomControl position="topleft" zoomInTitle="Acercar mapa" zoomOutTitle="Alejar mapa" /><ScaleControl position="bottomleft" imperial={false} />
        <MapInteraction {...props} drawing={drawing} onAdd={add} onView={(center, zoom) => setView({ ...center, zoom })} />
        {boundary && <Polygon positions={verticesOf(boundary).map((vertex) => [vertex.lat, vertex.lon])} pathOptions={{ color: '#244a38', fillColor: '#a9c681', fillOpacity: drawing ? .08 : .23, weight: 3 }} interactive={false} />}
        {drawing && vertices.length >= 2 && <Polyline positions={vertices.map((vertex) => [vertex.lat, vertex.lon])} pathOptions={{ color: '#a05223', weight: 3, dashArray: '6 5' }} interactive={false} />}
        {drawing && vertices.map((vertex, index) => <Marker key={index} position={[vertex.lat, vertex.lon]} draggable keyboard title={`Punto ${index + 1}: arrastra o edita sus coordenadas debajo`} alt={`Punto ${index + 1} del borrador`} icon={divIcon({ html: String(index + 1), className: 'parcel-vertex-icon', iconSize: [32, 32], iconAnchor: [16, 16] })} eventHandlers={{ dragend(event) { const point = event.target.getLatLng(); const next = { lat: Number(point.lat.toFixed(7)), lon: Number((((point.lng + 180) % 360 + 360) % 360 - 180).toFixed(7)) }; try { validateVertex(next); setVertices((current) => current.map((value, i) => i === index ? next : value)); setAnnouncement(`Punto ${index + 1} movido. Guarda para confirmar.`) } catch { setVertices((current) => [...current]); setError('Punto fuera del rango admitido.') } } }} />)}
      </MapContainer>
      <span className="map-center-crosshair" aria-hidden="true">+</span>
    </div>
    <div className="map-toolbar" role="group" aria-label="Navegación y precisión del mapa"><button type="button" onClick={() => mapRef.current?.setView([12, -12], 2, { animate: false })}>Ver mundo</button><button type="button" disabled={!location} onClick={() => location && mapRef.current?.setView([Math.max(-MAX_MAP_LAT, Math.min(MAX_MAP_LAT, location.lat)), location.lon], 16, { animate: false })}>Acercar al punto</button><button type="button" disabled={!boundary && vertices.length < 2} onClick={() => { const points = drawing && vertices.length >= 2 ? vertices : verticesOf(boundary); if (points.length >= 2) mapRef.current?.fitBounds(points.map((vertex) => [vertex.lat, vertex.lon]), { padding: [35, 35], maxZoom: 18, animate: false }) }}>Encuadrar parcela</button>{drawing && <button type="button" onClick={() => { const point = mapRef.current?.getCenter(); if (point) add({ lat: Number(point.lat.toFixed(7)), lon: Number(point.lng.toFixed(7)) }) }}>Añadir punto del centro del mapa</button>}</div>
    <p className="map-view-status" role="status">Centro: {view.lat.toFixed(6)}°, {view.lon.toFixed(6)}° · Zoom {view.zoom} · WGS84</p>
    {tileError && <p className="field-error" role="status">No se pudo cargar parte del mapa. Puedes continuar con las coordenadas manuales y los puntos del contorno.</p>}
    {location && Math.abs(location.lat) > MAX_MAP_LAT && <p className="field-error" role="status">Coordenadas guardadas. Esta proyección no representa las latitudes polares mayores de ±85,05°.</p>}
    {outside && <p className="field-error" role="status">El punto de consulta está fuera de la parcela guardada. NASA POWER consultará ese punto, no el polígono. <button type="button" className="text-button" onClick={() => boundary && onSelect({ ...representativePoint(boundary), source: 'parcel' })}>Usar punto de la parcela</button></p>}
    {boundary && <div className="boundary-summary" aria-label="Parcela guardada"><strong>{boundary.properties.name}</strong><p>Superficie delineada aproximada: <b>{boundary.properties.area.value.toLocaleString('es', { maximumFractionDigits: 4 })} ha</b> · {verticesOf(boundary).length} vértices</p><p>Contorno del usuario; área derivada, sin relieve ni precisión catastral. La consulta NASA sigue siendo puntual, sin promediar el polígono.</p><div className="map-toolbar"><button type="button" onClick={download}>Exportar parcela GeoJSON</button><button type="button" onClick={() => { setDeleted(boundary); onSaveBoundary(null); setDrawing(false); setAnnouncement('Parcela eliminada. Puedes deshacer esta acción.') }}>Eliminar parcela guardada</button></div></div>}
    {deleted && !boundary && <button type="button" className="secondary-button" onClick={() => { onSaveBoundary(deleted); setDeleted(null); setAnnouncement('Parcela restaurada.') }}>Deshacer eliminación de parcela</button>}
    {drawing && <section className="boundary-controls" aria-labelledby="boundary-heading"><h3 id="boundary-heading">Puntos del contorno — borrador</h3><p>{role === 'grower' ? 'Recorre el borde de tu campo y añade sus esquinas en orden. Puedes hacerlo sin arrastrar nada.' : 'Anillo simple WGS84, máximo 100 vértices. Se validan cruces, duplicados, rango y área antes de confirmar.'}</p><label>Nombre del contorno<input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label><form onSubmit={manualAdd} noValidate aria-label="Añadir punto por coordenadas" className="add-vertex-form"><label>Latitud del vértice<input id="add-vertex-lat" inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} /></label><label>Longitud del vértice<input inputMode="decimal" value={lon} onChange={(event) => setLon(event.target.value)} /></label><button type="submit" className="secondary-button">Añadir vértice</button></form>
      <p className="helper-text">{vertices.length} de {MAX_VERTICES} puntos. La línea discontinua es un borrador; el contorno guardado se muestra continuo.</p>
      <ol className="vertex-list" aria-label="Vértices editables del contorno">{vertices.map((vertex, index) => <VertexRow key={index} index={index} count={vertices.length} vertex={vertex} onUpdate={(next) => { setVertices((current) => current.map((value, i) => i === index ? next : value)); setError(''); setAnnouncement(`Punto ${index + 1} actualizado.`) }} onRemove={() => removeVertex(index)} onMove={(direction) => { setVertices((current) => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next }); setAnnouncement(`Punto ${index + 1} reordenado.`) }} />)}</ol><div className="map-toolbar"><button type="button" disabled={!vertices.length} onClick={() => { setVertices((current) => current.slice(0, -1)); setError(''); setAnnouncement('Último punto quitado del borrador.') }}>Quitar último punto</button><button type="button" className="primary-button" onClick={save}>Cerrar y guardar parcela</button><button type="button" onClick={cancel}>Cancelar cambios del contorno</button></div>
    </section>}
    <div className="parcel-import"><label>Importar parcela GeoJSON<input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = '' }} /></label><p>Una parcela activa por navegador. Se guarda solo su contorno; no el perfil agrícola. Para cambiar de zona, exporta tu parcela e importa otra.</p></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    {storageMessage && <p className="map-announcement" role="status">{storageMessage}</p>}
    <p className="map-announcement" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </div>
}
