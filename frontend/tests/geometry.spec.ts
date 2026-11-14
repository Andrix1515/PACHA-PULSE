import { test, expect } from '@playwright/test'
import { containsPoint, createBoundary, importBoundary, representativePoint } from '../src/features/parcel/geometry'

test.beforeEach(({}, info) => { test.skip(info.project.name === 'mobile', 'Pure geometry is independent of the device.') })
const square = [{ lat: 0, lon: 0 }, { lat: 0, lon: .01 }, { lat: .01, lon: .01 }, { lat: .01, lon: 0 }]

test('GeoJSON closes the ring and calculates a reference spherical area in hectares', () => {
  const result = createBoundary(square, 'Field A')
  expect(result.geometry.coordinates[0]).toHaveLength(5)
  expect(result.geometry.coordinates[0][0]).toEqual(result.geometry.coordinates[0].at(-1))
  expect(result.properties.area.value).toBeCloseTo(123.64, 0)
  expect(result.properties.area.status).toBe('derived')
  expect(importBoundary(JSON.parse(JSON.stringify(result))).properties.area.value).toBeCloseTo(result.properties.area.value)
})

test('reference point belongs to a concave polygon', () => {
  const concave = createBoundary([{ lat: 0, lon: 0 }, { lat: 0, lon: .03 }, { lat: .01, lon: .03 }, { lat: .01, lon: .01 }, { lat: .03, lon: .01 }, { lat: .03, lon: 0 }], '')
  expect(containsPoint(concave, representativePoint(concave))).toBe(true)
  expect(containsPoint(concave, { lat: .02, lon: .02 })).toBe(false)
})

test('rejects intersections, duplicates, invalid ranges and zero area', () => {
  expect(() => createBoundary([square[0], square[2], square[1], square[3]], '')).toThrow('cross')
  expect(() => createBoundary([square[0], square[1], square[1]], '')).toThrow('repeated')
  expect(() => createBoundary([{ lat: 0, lon: 0 }, { lat: 0, lon: .01 }, { lat: 0, lon: .02 }], '')).toThrow('collinear')
  expect(() => createBoundary([{ lat: 86, lon: 0 }, ...square.slice(1)], '')).toThrow('latitude')
  expect(() => createBoundary([{ lat: NaN, lon: 0 }, ...square.slice(1)], '')).toThrow('latitude')
  expect(() => createBoundary(square.slice(0, 2), '')).toThrow('3 and 100')
})

test('import validates format and size and recalculates supplied areas', () => {
  const result = createBoundary(square, 'GeoJSON')
  result.properties.area.value = 999999
  expect(importBoundary(result).properties.area.value).toBeCloseTo(123.64, 0)
  expect(() => importBoundary({ type: 'FeatureCollection', features: [result, result] })).toThrow('one field')
  expect(() => importBoundary({ type: 'Polygon', coordinates: [[[0, 0], [.01, 0], [.01, .01], [0, .01]]] })).toThrow('closed')
  expect(() => importBoundary({ type: 'Polygon', coordinates: [result.geometry.coordinates[0], result.geometry.coordinates[0]] })).toThrow('without holes')
  expect(() => createBoundary([{ lat: 0, lon: 179.9 }, { lat: .01, lon: -179.9 }, { lat: .02, lon: 179.9 }], '')).toThrow('antimeridian')
})
