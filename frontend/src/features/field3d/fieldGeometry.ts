import type { ParcelBoundary } from '../parcel/geometry'

export function fieldFootprint(boundary: ParcelBoundary): [number, number][] {
  const ring = boundary.geometry.coordinates[0].slice(0, -1)
  const xs = ring.map(([lon]) => lon), ys = ring.map(([, lat]) => lat)
  const x = (Math.min(...xs) + Math.max(...xs)) / 2, y = (Math.min(...ys) + Math.max(...ys)) / 2
  const cos = Math.cos(y * Math.PI / 180)
  const span = Math.max((Math.max(...xs) - Math.min(...xs)) * cos, Math.max(...ys) - Math.min(...ys))
  return ring.map(([lon, lat]) => [(lon - x) * cos / span * 10, -(lat - y) / span * 10])
}
export function inFootprint(point: [number, number], ring: [number, number][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j]
    if ((zi > point[1]) !== (zj > point[1]) && point[0] < (xj - xi) * (point[1] - zi) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
/** Display grid only: these positions never represent actual plant density. */
export function plantingPoints(ring: [number, number][]) {
  const points: [number, number][] = []
  for (let z = -4.6; z < 5; z += .8) for (let x = -4.6; x < 5; x += .8) if (inFootprint([x, z], ring)) points.push([x, z])
  return points.slice(0, 144)
}

export interface ParcelSectorInfo {
  id: number
  code: string
  label: string
  pointIndices: number[]
  center: [number, number]
  areaShare: number
  areaHa: number
}

/** Splits the normalized parcel footprint into 4 interactive agricultural zones (NW, NE, SW, SE) with proportional area in hectares. */
export function computeParcelSectors(ring: [number, number][], totalAreaHa: number): { points: [number, number][]; pointSectors: number[]; sectors: ParcelSectorInfo[] } {
  const points = plantingPoints(ring)
  if (!points.length) {
    return {
      points,
      pointSectors: [],
      sectors: [0, 1, 2, 3].map((id) => ({
        id,
        code: ['NW', 'NE', 'SW', 'SE'][id],
        label: ['Zone 1 · NW', 'Zone 2 · NE', 'Zone 3 · SW', 'Zone 4 · SE'][id],
        pointIndices: [],
        center: [id % 2 === 0 ? -1.5 : 1.5, id < 2 ? -1.5 : 1.5],
        areaShare: 0.25,
        areaHa: +(totalAreaHa * 0.25).toFixed(4),
      })),
    }
  }
  const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length
  const cz = points.reduce((sum, [, z]) => sum + z, 0) / points.length
  const buckets: number[][] = [[], [], [], []]
  const pointSectors = points.map(([x, z], idx) => {
    const sector = (z >= cz ? 2 : 0) + (x >= cx ? 1 : 0)
    buckets[sector].push(idx)
    return sector
  })
  const total = points.length
  const sectors: ParcelSectorInfo[] = [0, 1, 2, 3].map((id) => {
    const indices = buckets[id]
    const share = total > 0 ? indices.length / total : 0.25
    const sx = indices.length ? indices.reduce((sum, idx) => sum + points[idx][0], 0) / indices.length : cx + (id % 2 === 0 ? -1.5 : 1.5)
    const sz = indices.length ? indices.reduce((sum, idx) => sum + points[idx][1], 0) / indices.length : cz + (id < 2 ? -1.5 : 1.5)
    return {
      id,
      code: ['NW', 'NE', 'SW', 'SE'][id],
      label: ['Zone 1 · NW', 'Zone 2 · NE', 'Zone 3 · SW', 'Zone 4 · SE'][id],
      pointIndices: indices,
      center: [sx, sz],
      areaShare: share,
      areaHa: +(totalAreaHa * share).toFixed(4),
    }
  })
  return { points, pointSectors, sectors }
}
