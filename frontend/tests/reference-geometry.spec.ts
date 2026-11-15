import { test, expect } from '@playwright/test'
import { computeParcelSectors } from '../src/features/field3d/fieldGeometry'

test('subplot hectares come from polygon geometry even with no decorative plant points', () => {
  const result=computeParcelSectors([[0,0],[.1,0],[.1,.01],[0,.01]],8)
  expect(result.points).toHaveLength(0)
  result.sectors.forEach(sector=>expect(sector.areaHa).toBeCloseTo(2,9))
  expect(result.sectors.reduce((sum,sector)=>sum+sector.areaHa,0)).toBeCloseTo(8,9)
  const reversed=computeParcelSectors([[0,.01],[.1,.01],[.1,0],[0,0]],8)
  reversed.sectors.forEach((sector,index)=>expect(sector.areaHa).toBeCloseTo(result.sectors[index].areaHa,9))
})
import { createBoundary } from '../src/features/parcel/geometry'
import { fieldFootprint, inFootprint, plantingPoints } from '../src/features/field3d/fieldGeometry'
import { cropReferences, referenceCheck } from '../src/features/crops/references'
import type { ClimateResponse, Location } from '../src/types'

test.skip(({ isMobile }) => isMobile, 'Device-independent arithmetic is already tested on desktop.')

test('3D footprint preserves a concave outline and illustrative points stay inside it', () => {
  const boundary = createBoundary([{ lat: -12, lon: -75 }, { lat: -12, lon: -74.999 }, { lat: -11.9995, lon: -74.9995 }, { lat: -11.999, lon: -74.999 }, { lat: -11.999, lon: -75 }], 'Concave')
  const ring = fieldFootprint(boundary)
  expect(ring).toHaveLength(5)
  expect(ring.flat().every(Number.isFinite)).toBe(true)
  expect(Math.max(...ring.flat().map(Math.abs))).toBeLessThanOrEqual(5.00001)
  const points = plantingPoints(ring)
  expect(points.length).toBeGreaterThan(0)
  expect(points.every((p) => inFootprint(p, ring))).toBe(true)
})

test('reference comparisons retain missing evidence, point mismatch and unknown crop thresholds', async ({ request }) => {
  const climate: ClimateResponse = await (await request.get('/api/v1/observations/climate/demo')).json()
  const point: Location = { lat: climate.lat, lon: climate.lon, source: 'manual' }
  const maize = cropReferences.find((crop) => crop.id === 'maize')!
  expect(referenceCheck(maize, climate, point).state).toBe('outside')
  expect(referenceCheck(maize, climate, { ...point, lat: 1 }).state).toBe('unknown')
  expect(referenceCheck(maize, null, point).state).toBe('unknown')
  const partial = structuredClone(climate); partial.data[0].T2M = null
  expect(referenceCheck(maize, partial, point).state).toBe('unknown')
  expect(referenceCheck(cropReferences.find((crop) => crop.id === 'wheat')!, climate, point).state).toBe('unknown')
})

test('temperature reference boundaries are inclusive; this is a synthetic arithmetic fixture', async ({ request }) => {
  const climate: ClimateResponse = await (await request.get('/api/v1/observations/climate/demo')).json()
  // Modified copies below are only arithmetic fixtures, never presented as NASA observations.
  climate.data = climate.data.map((day) => ({ ...day, T2M: 20 }))
  const point: Location = { lat: climate.lat, lon: climate.lon, source: 'manual' }
  const maize = cropReferences.find((crop) => crop.id === 'maize')!
  for (const value of [20, 30]) { climate.summary.temperature_mean.value = value; expect(referenceCheck(maize, climate, point).state).toBe('within') }
  climate.summary.temperature_mean.value = 30.01
  expect(referenceCheck(maize, climate, point).state).toBe('outside')
})
