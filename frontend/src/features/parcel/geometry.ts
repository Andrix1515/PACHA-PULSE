import { area } from '@turf/area'
import { kinks } from '@turf/kinks'
import { pointOnFeature } from '@turf/point-on-feature'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import type { Feature, Polygon } from 'geojson'

export const MAX_VERTICES = 100
export const MAX_MAP_LAT = 85.05112878
export interface Vertex { lat: number; lon: number }
export interface ParcelProperties {
  name: string
  status: 'user_input'
  source: string
  updated_at: string
  area: { value: number; unit: 'ha'; status: 'derived'; source: string; quality: string; limitations: string[] }
}
export type ParcelBoundary = Feature<Polygon, ParcelProperties>

export function parseCoordinate(value: string): number {
  if (!value.trim()) throw new Error('Completa ambas coordenadas.')
  const number = Number(value.replace(',', '.'))
  if (!Number.isFinite(number)) throw new Error('Escribe coordenadas numéricas válidas.')
  return number
}

export function validateVertex(vertex: Vertex) {
  if (!Number.isFinite(vertex.lat) || !Number.isFinite(vertex.lon) || Math.abs(vertex.lat) > MAX_MAP_LAT || Math.abs(vertex.lon) > 180) {
    throw new Error('Para dibujar, usa latitudes entre −85,05112878 y 85,05112878 y longitudes entre −180 y 180.')
  }
}

export function verticesOf(boundary: ParcelBoundary | null): Vertex[] {
  return boundary ? boundary.geometry.coordinates[0].slice(0, -1).map(([lon, lat]) => ({ lat, lon })) : []
}

export function createBoundary(vertices: Vertex[], name: string): ParcelBoundary {
  if (vertices.length < 3 || vertices.length > MAX_VERTICES) throw new Error('La parcela necesita entre 3 y 100 puntos distintos.')
  vertices.forEach(validateVertex)
  if (new Set(vertices.map(({ lat, lon }) => `${lat}:${lon}`)).size !== vertices.length) throw new Error('Hay puntos repetidos. Elimina el duplicado; el cierre se hace automáticamente.')
  if (Math.max(...vertices.map((v) => v.lon)) - Math.min(...vertices.map((v) => v.lon)) >= 180) throw new Error('Esta herramienta no admite parcelas que crucen el antimeridiano. Divide esa zona antes de importarla.')
  const ring = vertices.map(({ lat, lon }) => [lon, lat])
  ring.push([...ring[0]])
  const feature: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
  if (kinks(feature).features.length) throw new Error('Los lados del polígono se cruzan o se tocan. Reordena o corrige los puntos.')
  const squareMetres = area(feature)
  if (!Number.isFinite(squareMetres) || squareMetres < 1) throw new Error('El contorno debe encerrar al menos 1 m²; los puntos no pueden estar alineados.')
  if (squareMetres > 10_000_000_000) throw new Error('Delimita una zona de hasta 1 000 000 ha por parcela.')
  return { ...feature, properties: {
    name: name.trim().slice(0, 80) || 'Parcela delimitada', status: 'user_input', source: 'Contorno dibujado o importado por el usuario, WGS84', updated_at: new Date().toISOString(),
    area: { value: squareMetres / 10000, unit: 'ha', status: 'derived', source: 'Área esférica Turf a partir del contorno del usuario', quality: 'Aproximada; sin precisión catastral', limitations: ['No incluye pendiente ni relieve.', 'La precisión depende de los puntos y de la cartografía, no del número de decimales.', 'No aumenta la resolución de NASA POWER ni valida propiedad o aptitud agrícola.'] },
  } }
}

export function representativePoint(boundary: ParcelBoundary): Vertex {
  const [lon, lat] = pointOnFeature(boundary).geometry.coordinates
  return { lat, lon }
}

export function containsPoint(boundary: ParcelBoundary, vertex: Vertex): boolean {
  return booleanPointInPolygon([vertex.lon, vertex.lat], boundary)
}

export function importBoundary(input: unknown): ParcelBoundary {
  if (!input || typeof input !== 'object') throw new Error('El archivo debe ser GeoJSON válido.')
  let candidate = input as Record<string, unknown>
  if (candidate.type === 'FeatureCollection') {
    if (!Array.isArray(candidate.features) || candidate.features.length !== 1) throw new Error('Importa una sola parcela por archivo (una Feature de tipo Polygon).')
    candidate = candidate.features[0] as Record<string, unknown>
  }
  if (!candidate || typeof candidate !== 'object') throw new Error('La parcela GeoJSON no es válida.')
  const properties = candidate.type === 'Feature' && candidate.properties && typeof candidate.properties === 'object' ? candidate.properties as Record<string, unknown> : {}
  const geometry = (candidate.type === 'Feature' ? candidate.geometry : candidate) as Record<string, unknown> | null
  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) throw new Error('Se admite un Polygon simple sin huecos, en WGS84 y orden [longitud, latitud].')
  const ring = geometry.coordinates[0] as unknown
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > MAX_VERTICES + 1) throw new Error('El anillo GeoJSON debe estar cerrado y tener de 3 a 100 vértices.')
  const points = ring.map((item) => {
    if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'number' || typeof item[1] !== 'number') throw new Error('Cada punto debe contener solo [longitud, latitud] numéricas.')
    return { lon: item[0], lat: item[1] }
  })
  if (points[0].lat !== points.at(-1)!.lat || points[0].lon !== points.at(-1)!.lon) throw new Error('El anillo GeoJSON no está cerrado.')
  return createBoundary(points.slice(0, -1), typeof properties.name === 'string' ? properties.name : '')
}
