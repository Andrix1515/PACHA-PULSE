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
  if (!value.trim()) throw new Error('Complete both coordinates.')
  const number = Number(value.replace(',', '.'))
  if (!Number.isFinite(number)) throw new Error('Enter valid numeric coordinates.')
  return number
}

export function validateVertex(vertex: Vertex) {
  if (!Number.isFinite(vertex.lat) || !Number.isFinite(vertex.lon) || Math.abs(vertex.lat) > MAX_MAP_LAT || Math.abs(vertex.lon) > 180) {
    throw new Error('For drawing, use latitude from −85.05112878 to 85.05112878 and longitude from −180 to 180.')
  }
}

export function verticesOf(boundary: ParcelBoundary | null): Vertex[] {
  return boundary ? boundary.geometry.coordinates[0].slice(0, -1).map(([lon, lat]) => ({ lat, lon })) : []
}

export function createBoundary(vertices: Vertex[], name: string): ParcelBoundary {
  if (vertices.length < 3 || vertices.length > MAX_VERTICES) throw new Error('A field needs between 3 and 100 distinct points.')
  vertices.forEach(validateVertex)
  if (new Set(vertices.map(({ lat, lon }) => `${lat}:${lon}`)).size !== vertices.length) throw new Error('Some points are repeated. Remove duplicates; the ring closes automatically.')
  if (Math.max(...vertices.map((v) => v.lon)) - Math.min(...vertices.map((v) => v.lon)) >= 180) throw new Error('Fields crossing the antimeridian are not supported. Split the area before importing.')
  const ring = vertices.map(({ lat, lon }) => [lon, lat])
  ring.push([...ring[0]])
  const feature: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
  if (kinks(feature).features.length) throw new Error('Polygon edges cross or touch. Reorder or correct the points.')
  const squareMetres = area(feature)
  if (!Number.isFinite(squareMetres) || squareMetres < 1) throw new Error('The outline must enclose at least 1 m²; the points cannot be collinear.')
  if (squareMetres > 10_000_000_000) throw new Error('Draw a field of at most 1,000,000 ha.')
  return { ...feature, properties: {
    name: name.trim().slice(0, 80) || 'Outlined field', status: 'user_input', source: 'Outline drawn or imported by the user, WGS84', updated_at: new Date().toISOString(),
    area: { value: squareMetres / 10000, unit: 'ha', status: 'derived', source: 'Turf spherical area calculated from the user outline', quality: 'Approximate; not cadastral precision', limitations: ['Does not account for slope or terrain.', 'Accuracy depends on the points and map, not the number of decimal places.', 'Does not increase NASA POWER resolution or validate ownership or agricultural suitability.'] },
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
  if (!input || typeof input !== 'object') throw new Error('The file must contain valid GeoJSON.')
  let candidate = input as Record<string, unknown>
  if (candidate.type === 'FeatureCollection') {
    if (!Array.isArray(candidate.features) || candidate.features.length !== 1) throw new Error('Import one field per file (one Polygon Feature).')
    candidate = candidate.features[0] as Record<string, unknown>
  }
  if (!candidate || typeof candidate !== 'object') throw new Error('The GeoJSON field is invalid.')
  const properties = candidate.type === 'Feature' && candidate.properties && typeof candidate.properties === 'object' ? candidate.properties as Record<string, unknown> : {}
  const geometry = (candidate.type === 'Feature' ? candidate.geometry : candidate) as Record<string, unknown> | null
  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) throw new Error('Use a simple Polygon without holes, in WGS84 [longitude, latitude] order.')
  const ring = geometry.coordinates[0] as unknown
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > MAX_VERTICES + 1) throw new Error('The GeoJSON ring must be closed and contain 3 to 100 vertices.')
  const points = ring.map((item) => {
    if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'number' || typeof item[1] !== 'number') throw new Error('Each point must contain only numeric [longitude, latitude].')
    return { lon: item[0], lat: item[1] }
  })
  if (points[0].lat !== points.at(-1)!.lat || points[0].lon !== points.at(-1)!.lon) throw new Error('The GeoJSON ring is not closed.')
  return createBoundary(points.slice(0, -1), typeof properties.name === 'string' ? properties.name : '')
}
