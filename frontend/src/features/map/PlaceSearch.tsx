import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { requestJson } from '../../services/api'

export interface PlaceResult { id: string; label: string; lat: number; lon: number; kind: string; country_code: string | null; bounds: [[number, number], [number, number]] | null }
export default function PlaceSearch({ onChoose }: { onChoose: (place: PlaceResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [pending, setPending] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function search() {
    const value = query.trim()
    if (value.length < 2) { setError('Enter at least two letters of a country or region.'); return }
    controller.current?.abort()
    const request = new AbortController(); controller.current = request
    setPending(true); setError(''); setSelected(''); setResults([]); setSearched(false)
    try {
      const data = await requestJson<{ results: PlaceResult[] }>(`/places/search?q=${encodeURIComponent(value)}`, { signal: request.signal })
      if (!request.signal.aborted) { setResults(data.results); setSearched(true) }
    } catch (caught) { if (!request.signal.aborted) setError(caught instanceof Error ? caught.message : 'Search unavailable. Map and coordinate controls still work.') }
    finally { if (!request.signal.aborted) setPending(false) }
  }
  return <div className="place-search">
    <form role="search" aria-label="Find a country or region" onSubmit={(event) => { event.preventDefault(); void search() }}>
      <Search size={19} aria-hidden="true" /><label className="sr-only" htmlFor="place-query">Country or region</label><input id="place-query" maxLength={100} value={query} onChange={(event) => { setQuery(event.target.value); setResults([]); setSearched(false) }} placeholder="Search a country or region" autoComplete="off" aria-describedby="place-search-note" /><button className="place-submit" type="submit" disabled={pending} aria-label="Search places">{pending ? 'Finding…' : <Search size={18} />}</button>
    </form>
    {(results.length > 0 || searched || error) && <div className="place-results"><div className="place-results-heading"><strong>{error ? 'Try another way' : results.length ? 'Where shall we go?' : 'No places found'}</strong><button className="icon-button" aria-label="Dismiss search results" onClick={() => { setResults([]); setSearched(false); setError('') }}><X size={17} /></button></div>{error && <p role="alert">{error}</p>}<ul aria-label="Place search results">{results.map((place) => <li key={place.id}><button onClick={() => { onChoose(place); setSelected(place.label); setResults([]); setSearched(false); document.querySelector<HTMLInputElement>('#place-query')?.focus() }}><MapPin size={17} /><span>{place.label}<small>{place.kind} · {place.country_code || 'country not specified'}</small></span></button></li>)}</ul>{searched && !results.length && <p>Try a country, region or town name. You can also move the map.</p>}<small>OpenStreetMap contributors · Photon / komoot</small></div>}
    <p id="place-search-note" className="place-search-note" role={selected ? 'status' : undefined}>{selected ? `Browsing ${selected}. Tap or outline your actual field; the search did not change your saved location.` : <>Search runs when you submit. Place names go to <a href="https://github.com/komoot/photon" target="_blank" rel="noreferrer">Photon</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>.</>}</p>
  </div>
}
