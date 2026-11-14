import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, LocateFixed } from 'lucide-react'
import type { Location } from '../../types'

export default function CoordinateForm({ location, onSelect }: { location: Location | null; onSelect: (location: Location) => void }) {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setLat(location ? String(location.lat) : '')
    setLon(location ? String(location.lon) : '')
    setError('')
  }, [location])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const latitude = Number(lat.replace(',', '.'))
    const longitude = Number(lon.replace(',', '.'))
    if (!lat.trim() || !lon.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      setError('Enter a latitude from −90 to 90 and a longitude from −180 to 180.')
      return
    }
    setError('')
    onSelect({ lat: latitude, lon: longitude, source: 'manual' })
  }

  return <form className="coordinate-form" onSubmit={submit} noValidate aria-label="Location coordinates">
    <div className="coordinate-heading"><LocateFixed size={17} /><span>Enter coordinates</span><span className="datum">WGS84 · degrees</span></div>
    <div className="coordinate-inputs">
      <label>Latitude<input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="−90 to 90" aria-invalid={!!error} aria-describedby={error ? 'coordinate-error' : undefined} /></label>
      <label>Longitude<input inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="−180 to 180" aria-invalid={!!error} aria-describedby={error ? 'coordinate-error' : undefined} /></label>
      <button className="primary-button" type="submit">Use location <ArrowUpRight size={17} /></button>
    </div>
    {error && <p id="coordinate-error" className="field-error" role="alert">{error}</p>}
  </form>
}
