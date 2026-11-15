import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Droplets, HelpCircle, Sprout } from 'lucide-react'
import type { AgriculturalProfile } from '../../types'
import ProfileForm from '../parcel/ProfileForm'

export default function ProfileScene({ profile, onSave, onContinue, onStep, onCrops, onSimulate3D }: { profile: AgriculturalProfile; onSave: (profile: AgriculturalProfile) => void; onContinue: () => void; onStep: (step: number) => void; onCrops?: () => void; onSimulate3D?: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile.name)
  const [crop, setCrop] = useState(profile.crop)
  useEffect(() => { const frame = requestAnimationFrame(() => { if (!document.getElementById('profile-scene-heading')?.closest('[hidden]')) document.getElementById('profile-scene-heading')?.focus({ preventScroll: true }) }); return () => cancelAnimationFrame(frame) }, [step])
  useEffect(() => { setName(profile.name); setCrop(profile.crop) }, [profile.name, profile.crop])
  function next() { onSave({ ...profile, name: name.trim(), crop: crop.trim() }); if (step < 2) { setStep(step + 1); onStep(step + 1) } else onContinue() }
  return <div className="profile-story">
    <div className="small-question-progress" aria-label={`Field question ${step + 1} of 3`}>{[0, 1, 2].map((value) => <button key={value} aria-label={`Go to field question ${value + 1}`} aria-current={step === value ? 'step' : undefined} onClick={() => { setStep(value); onStep(value) }}>{value < step ? <Check size={12} /> : value + 1}</button>)}</div>
    <form className="profile-question scene-reveal" key={step} onSubmit={(event) => { event.preventDefault(); next() }}>
      {step === 0 && <><span className="question-illustration"><Sprout size={36} /></span><h1 id="profile-scene-heading" tabIndex={-1}>Every field has a story.<br /><em>What is yours called?</em></h1><p>A name you recognise is enough. You can leave it blank.</p><label className="large-answer-label">Field name<input maxLength={80} value={name} placeholder="e.g. The north field" onChange={(event) => setName(event.target.value)} autoComplete="off" /></label></>}
      {step === 1 && <><span className="question-illustration"><Sprout size={36} /></span><h1 id="profile-scene-heading" tabIndex={-1}>What are you<br /><em>growing here?</em></h1><p>Tell me the crop you have now. It is fine if you have not planted yet.</p><label className="large-answer-label">Current crop<input maxLength={80} value={crop} placeholder="e.g. Maize" onChange={(event) => setCrop(event.target.value)} /></label><div className="crop-shortcuts" role="group" aria-label="Common current crops">{['Maize', 'Potato', 'Wheat', 'Bean', 'Quinoa'].map((value) => <button type="button" key={value} aria-pressed={crop === value} onClick={() => setCrop(value)}>{value}</button>)}</div></>}
      {step === 2 && <><span className="question-illustration"><Droplets size={36} /></span><h1 id="profile-scene-heading" tabIndex={-1}>Where does your<br /><em>water come from?</em></h1><p>Your answer adds context. We do not estimate how much water is available.</p><div className="water-choices">{[{ value: 'rainfed', label: 'Rainfall', Icon: Droplets }, { value: 'irrigated', label: 'Irrigation', Icon: Droplets }, { value: 'mixed', label: 'Both', Icon: Droplets }, { value: 'unknown', label: 'I am not sure', Icon: HelpCircle }].map(({ value, label, Icon }) => <button type="button" key={value} aria-pressed={profile.water === value} onClick={() => onSave({ ...profile, water: value as AgriculturalProfile['water'] })}><Icon size={21} /><span>{label}</span>{profile.water === value && <Check size={17} />}</button>)}</div></>}
      <div className="question-actions">{step > 0 && <button className="text-button" type="button" onClick={() => { setStep(step - 1); onStep(step - 1) }}><ArrowLeft size={16} />Back</button>}<button className="primary-button" type="submit">{step === 2 ? 'Let us look at the weather' : 'Continue'}<ArrowRight size={18} /></button></div>
    </form>
    {step === 1 && onCrops && <button className="text-button" onClick={onCrops}>Explore crop options for this field<ArrowRight size={16} /></button>}
    {onSimulate3D && <button className="text-button" type="button" onClick={onSimulate3D}><Sprout size={16} />Open 3D parcel simulator<ArrowRight size={16} /></button>}
    <details className="profile-extra-tools"><summary>Other details I know</summary><ProfileForm profile={profile} onSave={onSave} /></details>
    <p className="session-footnote">Remembered in this tab. Unknown answers can stay unknown.</p>
  </div>
}
