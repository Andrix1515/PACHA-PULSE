import type { ClimateResponse, HealthResponse, Location } from '../types'

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('No se pudo conectar con la API local.')
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || !('status' in body) || body.status !== 'ok' ||
      !('service' in body) || body.service !== 'agroshift-api' || !('version' in body) || typeof body.version !== 'string') {
    throw new Error('La API devolvió una respuesta inesperada.')
  }
  return body as HealthResponse
}

export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(65000)]) : AbortSignal.timeout(65000), headers: { Accept: 'application/json', ...options.headers } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error?.message || 'La solicitud no pudo completarse. Revisa los datos o reintenta.')
  return body as T
}

export function getClimate(location: Location, start: string, end: string, signal: AbortSignal): Promise<ClimateResponse> {
  const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon), start, end })
  return requestJson(`/observations/climate?${params}`, { signal })
}
