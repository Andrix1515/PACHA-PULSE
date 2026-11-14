import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import type { AgriculturalProfile } from '../../types'

export default function ProfileForm({ profile, onSave }: { profile: AgriculturalProfile; onSave: (profile: AgriculturalProfile) => void }) {
  const [draft, setDraft] = useState(profile)
  const [area, setArea] = useState(profile.areaHa === null ? '' : String(profile.areaHa))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setDraft(profile); setArea(profile.areaHa === null ? '' : String(profile.areaHa)) }, [profile])
  function change<K extends keyof AgriculturalProfile>(key: K, value: AgriculturalProfile[K]) { setDraft((current) => ({ ...current, [key]: value })); setMessage('') }
  function submit(event: FormEvent) {
    event.preventDefault()
    const areaHa = area.trim() ? Number(area.replace(',', '.')) : null
    if (areaHa !== null && (!Number.isFinite(areaHa) || areaHa <= 0 || areaHa > 1_000_000)) { setError('Enter an area greater than 0 and at most 1,000,000 ha, or leave it blank.'); return }
    const saved = { ...draft, name: draft.name.trim(), crop: draft.crop.trim(), previousRotation: draft.previousRotation.trim(), areaHa }
    onSave(saved); setError(''); setMessage('Profile saved for this session. Both work modes use the same data.')
  }
  return <section className="panel profile-panel" aria-labelledby="profile-heading">
    <div className="panel-title"><div><span className="eyebrow">WHAT YOU KNOW</span><h2 id="profile-heading">Your field profile</h2></div><SlidersHorizontal size={21} /></div>
    <p className="muted">Start with a name and crop. You can leave everything else unknown.</p>
    <form onSubmit={submit} noValidate>
      <label>Field name <span className="optional">optional</span><input maxLength={80} value={draft.name} onChange={(e) => change('name', e.target.value)} placeholder="e.g. North field" /></label>
      <div className="profile-pair"><label>Current crop<input maxLength={80} value={draft.crop} onChange={(e) => change('crop', e.target.value)} placeholder="Not specified" /></label><label>Area (ha)<input inputMode="decimal" value={area} aria-invalid={!!error} aria-describedby={error ? 'profile-error' : undefined} onChange={(e) => { setArea(e.target.value); setMessage('') }} placeholder="Unknown" /></label></div>
      <label>Soil type<select value={draft.soil} onChange={(e) => change('soil', e.target.value as AgriculturalProfile['soil'])}><option value="unknown">I do not know yet</option><option value="sandy">Sandy</option><option value="loamy">Loamy</option><option value="clayey">Clayey</option><option value="other">Other / mixed</option></select></label>
      <label>Water supply<select value={draft.water} onChange={(e) => change('water', e.target.value as AgriculturalProfile['water'])}><option value="unknown">Not specified</option><option value="rainfed">Rainfall only</option><option value="irrigated">Irrigation</option><option value="mixed">Rainfall and irrigation</option></select></label>
      <label>Previous rotation <span className="optional">optional</span><textarea rows={2} maxLength={500} value={draft.previousRotation} onChange={(e) => change('previousRotation', e.target.value)} placeholder="e.g. Wheat, then beans, then fallow" /></label>
      {error && <p className="field-error" role="alert" id="profile-error">{error}</p>}
      <button type="submit" className="secondary-button w-full"><Check size={17} />Save profile</button>
      {message && <p className="save-message" role="status">{message}</p>}
    </form><p className="profile-footnote">Your input, without agronomic verification. Profile details clear when you reload. Export a report to keep them.</p>
  </section>
}
