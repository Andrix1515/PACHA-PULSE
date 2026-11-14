import { test, expect } from '@playwright/test'
import { containsPoint, createBoundary, importBoundary, representativePoint } from '../src/features/parcel/geometry'

test.beforeEach(({}, info) => { test.skip(info.project.name === 'mobile', 'Geometría pura, sin dependencia del dispositivo.') })
const square = [{ lat: 0, lon: 0 }, { lat: 0, lon: .01 }, { lat: .01, lon: .01 }, { lat: .01, lon: 0 }]

test('GeoJSON cierra el anillo y área esférica de referencia en ha', () => {
  const result = createBoundary(square, 'Parcela A')
  expect(result.geometry.coordinates[0]).toHaveLength(5)
  expect(result.geometry.coordinates[0][0]).toEqual(result.geometry.coordinates[0].at(-1))
  expect(result.properties.area.value).toBeCloseTo(123.64, 0)
  expect(result.properties.area.status).toBe('derived')
  expect(importBoundary(JSON.parse(JSON.stringify(result))).properties.area.value).toBeCloseTo(result.properties.area.value)
})

test('punto de referencia pertenece a un polígono cóncavo', () => {
  const concave = createBoundary([{ lat: 0, lon: 0 }, { lat: 0, lon: .03 }, { lat: .01, lon: .03 }, { lat: .01, lon: .01 }, { lat: .03, lon: .01 }, { lat: .03, lon: 0 }], '')
  expect(containsPoint(concave, representativePoint(concave))).toBe(true)
  expect(containsPoint(concave, { lat: .02, lon: .02 })).toBe(false)
})

test('rechaza cruces, repetidos, rango inválido y contorno sin área', () => {
  expect(() => createBoundary([square[0], square[2], square[1], square[3]], '')).toThrow('cruzan')
  expect(() => createBoundary([square[0], square[1], square[1]], '')).toThrow('repetidos')
  expect(() => createBoundary([{ lat: 0, lon: 0 }, { lat: 0, lon: .01 }, { lat: 0, lon: .02 }], '')).toThrow('alineados')
  expect(() => createBoundary([{ lat: 86, lon: 0 }, ...square.slice(1)], '')).toThrow('latitudes')
  expect(() => createBoundary([{ lat: NaN, lon: 0 }, ...square.slice(1)], '')).toThrow('latitudes')
  expect(() => createBoundary(square.slice(0, 2), '')).toThrow('3 y 100')
})

test('importación valida formato, tamaño y no confía en áreas suministradas', () => {
  const result = createBoundary(square, 'GeoJSON')
  result.properties.area.value = 999999
  expect(importBoundary(result).properties.area.value).toBeCloseTo(123.64, 0)
  expect(() => importBoundary({ type: 'FeatureCollection', features: [result, result] })).toThrow('una sola')
  expect(() => importBoundary({ type: 'Polygon', coordinates: [[[0, 0], [.01, 0], [.01, .01], [0, .01]]] })).toThrow('cerrado')
  expect(() => importBoundary({ type: 'Polygon', coordinates: [result.geometry.coordinates[0], result.geometry.coordinates[0]] })).toThrow('sin huecos')
  expect(() => createBoundary([{ lat: 0, lon: 179.9 }, { lat: .01, lon: -179.9 }, { lat: .02, lon: 179.9 }], '')).toThrow('antimeridiano')
})
