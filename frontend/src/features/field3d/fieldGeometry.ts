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
