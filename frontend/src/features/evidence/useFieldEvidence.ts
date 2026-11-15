import { useCallback, useEffect, useRef, useState } from 'react'
import type { Location, LocationInfo, LocationProvidersReport, SoilProfile, TerrainInfo } from '../../types'
import { getLocationInfo, getLocationProviders, getSoilProfile, getTerrain } from '../../services/api'
import type { ParcelBoundary } from '../parcel/geometry'
import { verticesOf } from '../parcel/geometry'

export type EvidenceTab = 'location' | 'terrain' | 'soil' | 'sources'
interface Evidence { location: LocationInfo | null; terrain: TerrainInfo | null; soil: SoilProfile | null; sources: LocationProvidersReport | null }
const empty: Evidence = { location: null, terrain: null, soil: null, sources: null }
export function useFieldEvidence(location: Location | null, boundary: ParcelBoundary | null) {
  const [data, setData] = useState<Evidence>(empty)
  const [busy, setBusy] = useState<Partial<Record<EvidenceTab, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<EvidenceTab, string>>>({})
  const requests = useRef<Partial<Record<EvidenceTab, AbortController>>>({})
  const key = location ? `${location.lat}/${location.lon}/${JSON.stringify(boundary?.geometry ?? null)}` : 'none'
  // The key tags every result. Old responses are never displayed for a new point/polygon.
  const currentKey = useRef(key); currentKey.current = key
  const [resultKey, setResultKey] = useState(key)
  useEffect(() => {
    Object.values(requests.current).forEach((request) => request.abort()); requests.current = {}
    setData(empty); setBusy({}); setErrors({}); setResultKey(key)
    return () => Object.values(requests.current).forEach((request) => request.abort())
  }, [key])
  const load = useCallback(async (tab: EvidenceTab) => {
    if (!location) return
    requests.current[tab]?.abort()
    const controller = new AbortController(); requests.current[tab] = controller
    const startedKey = key
    setBusy((old) => ({ ...old, [tab]: true })); setErrors((old) => ({ ...old, [tab]: '' }))
    try {
      const vertices = verticesOf(boundary)
      const value = tab === 'location' ? await getLocationInfo(location.lat, location.lon, controller.signal)
        : tab === 'soil' ? await getSoilProfile(location.lat, location.lon, controller.signal)
        : tab === 'sources' ? await getLocationProviders(location.lat, location.lon, undefined, controller.signal)
        : await getTerrain(location.lat, location.lon, vertices.length >= 3 ? vertices.map((v) => v.lat).join(',') : undefined, vertices.length >= 3 ? vertices.map((v) => v.lon).join(',') : undefined, controller.signal)
      if (!controller.signal.aborted && currentKey.current === startedKey) { setData((old) => ({ ...old, [tab]: value })); setResultKey(startedKey) }
    } catch (caught) {
      if (!controller.signal.aborted && currentKey.current === startedKey) setErrors((old) => ({ ...old, [tab]: caught instanceof Error ? caught.message : 'The source could not respond. You can retry.' }))
    } finally { if (!controller.signal.aborted && currentKey.current === startedKey) setBusy((old) => ({ ...old, [tab]: false })) }
  }, [key, location, boundary])
  return { data: resultKey === key ? data : empty, busy: resultKey === key ? busy : {}, errors: resultKey === key ? errors : {}, load }
}
