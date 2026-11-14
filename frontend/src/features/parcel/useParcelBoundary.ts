import { useState } from 'react'
import { importBoundary } from './geometry'
import type { ParcelBoundary } from './geometry'

const KEY = 'pacha-pulse.parcel.v1'
export function useParcelBoundary() {
  const [boundary, setBoundary] = useState<ParcelBoundary | null>(() => {
    try {
      const data = localStorage.getItem(KEY)
      if (!data || data.length > 200_000) return null
      const saved = JSON.parse(data)
      if (saved.version !== 1) return null
      const feature = importBoundary(saved.feature)
      const savedDate = saved.feature?.properties?.updated_at
      if (typeof savedDate === 'string' && Number.isFinite(Date.parse(savedDate))) feature.properties.updated_at = savedDate
      return feature
    } catch { return null }
  })
  const [storageMessage, setStorageMessage] = useState('')
  function save(next: ParcelBoundary | null) {
    setBoundary(next)
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify({ version: 1, feature: next }))
      else localStorage.removeItem(KEY)
      setStorageMessage(next ? 'Field saved in this browser. Export GeoJSON to keep a copy.' : 'Field removed from this browser.')
    } catch { setStorageMessage('The browser could not save. The field remains in this session; export GeoJSON as a backup.') }
  }
  return { boundary, save, storageMessage }
}
