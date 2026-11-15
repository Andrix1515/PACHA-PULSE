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
  // Polygon integrals, independent of the decorative planting grid.
  const signedDoubleArea = (polygon: [number, number][]) => polygon.reduce((sum, [x,z], i) => { const next=polygon[(i+1)%polygon.length]; return sum+x*next[1]-next[0]*z },0)
  const doubleArea=signedDoubleArea(ring)
  const cx=ring.reduce((sum,[x,z],i)=>{const next=ring[(i+1)%ring.length];return sum+(x+next[0])*(x*next[1]-next[0]*z)},0)/(3*doubleArea)
  const cz=ring.reduce((sum,[x,z],i)=>{const next=ring[(i+1)%ring.length];return sum+(z+next[1])*(x*next[1]-next[0]*z)},0)/(3*doubleArea)
  function clip(polygon:[number,number][],axis:0|1,bound:number,upper:boolean):[number,number][] {
    const output:[number,number][]=[]
    polygon.forEach((point,i)=>{
      const previous=polygon[(i+polygon.length-1)%polygon.length]
      const inside=(p:[number,number])=>upper?p[axis]>=bound:p[axis]<=bound
      if(inside(point)!==inside(previous)) {
        const t=(bound-previous[axis])/(point[axis]-previous[axis])
        output.push([previous[0]+t*(point[0]-previous[0]),previous[1]+t*(point[1]-previous[1])])
      }
      if(inside(point))output.push(point)
    })
    return output
  }
  const buckets: number[][] = [[], [], [], []]
  const pointSectors = points.map(([x, z], idx) => {
    const sector = (z >= cz ? 2 : 0) + (x >= cx ? 1 : 0)
    buckets[sector].push(idx)
    return sector
  })
  const sectors: ParcelSectorInfo[] = [0, 1, 2, 3].map((id) => {
    const indices = buckets[id]
    const fragment=clip(clip(ring,0,cx,id%2===1),1,cz,id>=2)
    const share=Math.abs(signedDoubleArea(fragment)/doubleArea)
    const sx = indices.length ? indices.reduce((sum, idx) => sum + points[idx][0], 0) / indices.length : cx + (id % 2 === 0 ? -1.5 : 1.5)
    const sz = indices.length ? indices.reduce((sum, idx) => sum + points[idx][1], 0) / indices.length : cz + (id < 2 ? -1.5 : 1.5)
    return {
      id,
      code: ['NW', 'NE', 'SW', 'SE'][id],
      label: ['Zone 1 · NW', 'Zone 2 · NE', 'Zone 3 · SW', 'Zone 4 · SE'][id],
      pointIndices: indices,
      center: [sx, sz],
      areaShare: share,
      areaHa: totalAreaHa * share,
    }
  })
  return { points, pointSectors, sectors }
}
