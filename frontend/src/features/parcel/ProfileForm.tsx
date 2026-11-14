import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import type { AgriculturalProfile } from '../../types'

export default function ProfileForm({ profile, onSave }: { profile: AgriculturalProfile; onSave: (profile: AgriculturalProfile) => void }) {
  const [draft, setDraft] = useState(profile)
  const [area, setArea] = useState(profile.areaHa === null ? '' : String(profile.areaHa))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  function change<K extends keyof AgriculturalProfile>(key: K, value: AgriculturalProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setMessage('')
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const areaHa = area.trim() ? Number(area.replace(',', '.')) : null
    if (areaHa !== null && (!Number.isFinite(areaHa) || areaHa <= 0 || areaHa > 1_000_000)) {
      setError('La superficie debe ser mayor que 0 y hasta 1 000 000 ha, o dejarse vacía.')
      return
    }
    const saved = { ...draft, name: draft.name.trim(), crop: draft.crop.trim(), previousRotation: draft.previousRotation.trim(), areaHa }
    onSave(saved)
    setDraft(saved)
    setError('')
    setMessage('Perfil guardado para ambos recorridos. Solo durante esta sesión.')
  }
  return <section className="panel profile-panel" aria-labelledby="profile-heading">
    <div className="panel-title"><div><span className="eyebrow">CONTEXTO DEL CAMPO</span><h2 id="profile-heading">Tu perfil agrícola</h2></div><SlidersHorizontal size={21} /></div>
    <p className="muted text-sm">Cuéntanos lo que sabes. Puedes dejar los datos desconocidos sin completar.</p>
    <form onSubmit={submit} noValidate>
      <label>Nombre de la parcela <span className="optional">opcional</span><input maxLength={80} value={draft.name} onChange={(e) => change('name', e.target.value)} placeholder="Ej. Parcela norte" /></label>
      <div className="profile-pair">
        <label>Cultivo actual<input maxLength={80} value={draft.crop} onChange={(e) => change('crop', e.target.value)} placeholder="Sin especificar" /></label>
        <label>Superficie (ha)<input inputMode="decimal" value={area} aria-invalid={!!error} aria-describedby={error ? 'profile-error' : undefined} onChange={(e) => { setArea(e.target.value); setMessage('') }} placeholder="Desconocida" /></label>
      </div>
      <label>Tipo de suelo<select value={draft.soil} onChange={(e) => change('soil', e.target.value as AgriculturalProfile['soil'])}><option value="unknown">No lo sé todavía</option><option value="sandy">Arenoso</option><option value="loamy">Franco</option><option value="clayey">Arcilloso</option><option value="other">Otro / combinación</option></select></label>
      <label>Disponibilidad de agua<select value={draft.water} onChange={(e) => change('water', e.target.value as AgriculturalProfile['water'])}><option value="unknown">Sin especificar</option><option value="rainfed">Lluvia (secano)</option><option value="irrigated">Riego</option><option value="mixed">Lluvia y riego</option></select></label>
      <label>Rotación previa <span className="optional">opcional</span><textarea rows={2} maxLength={500} value={draft.previousRotation} onChange={(e) => change('previousRotation', e.target.value)} placeholder="Ej. Trigo → leguminosa → descanso" /></label>
      {error && <p className="field-error" role="alert" id="profile-error">{error}</p>}
      <button type="submit" className="secondary-button w-full"><Check size={17} />Guardar perfil</button>
      {message && <p className="save-message" role="status">{message}</p>}
    </form>
    <p className="profile-footnote">Datos aportados por ti · sin verificación agronómica. Se eliminan al recargar la página.</p>
  </section>
}
