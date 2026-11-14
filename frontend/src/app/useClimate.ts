import { useEffect, useRef, useState } from 'react'
import { getClimate, requestJson } from '../services/api'
import type { ClimateResponse, Location } from '../types'

export function useClimate(initialLocation: Location | null = null) {
  const [location, setLocation] = useState<Location | null>(initialLocation)
  const [climate, setClimate] = useState<ClimateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  function selectLocation(next: Location) {
    active.current?.abort()
    setLocation(next)
    setClimate(null)
    setError('')
    setLoading(false)
  }
  async function load(start: string, end: string, demo = false) {
    if (!demo && !location) { setError('Selecciona primero una ubicación.'); return }
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    if (demo) {
      setLocation({ lat: -12.05, lon: -75.2, source: 'manual' })
      setClimate(null)
    }
    setError('')
    setLoading(true)
    try {
      const result = demo
        ? await requestJson<ClimateResponse>('/observations/climate/demo', { signal: controller.signal })
        : await getClimate(location!, start, end, controller.signal)
      if (!controller.signal.aborted) setClimate(result)
    } catch (caught) {
      if (!controller.signal.aborted) { setError(caught instanceof Error ? caught.message : 'No se pudo obtener el clima.'); setClimate(null) }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }
  return { location, climate, loading, error, selectLocation, load }
}
