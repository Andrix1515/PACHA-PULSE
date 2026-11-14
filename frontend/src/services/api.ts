import type { ClimateResponse, HealthResponse, Location } from '../types'

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('The API could not be reached.')
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || !('status' in body) || body.status !== 'ok' ||
      !('service' in body) || body.service !== 'agroshift-api' || !('version' in body) || typeof body.version !== 'string') {
    throw new Error('The API returned an unexpected response.')
  }
  return body as HealthResponse
}

export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(65000)]) : AbortSignal.timeout(65000), headers: { Accept: 'application/json', ...options.headers } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error?.message || 'The request could not be completed. Check the data or try again.')
  return body as T
}

export function getClimate(location: Location, start: string, end: string, signal: AbortSignal): Promise<ClimateResponse> {
  const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon), start, end })
  return requestJson(`/observations/climate?${params}`, { signal })
}
