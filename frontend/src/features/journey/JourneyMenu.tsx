import { useEffect, useRef } from 'react'
import { Check, Cloud, LockKeyhole, Pause, Play, Sprout, X } from 'lucide-react'
import type { UserRole } from '../../types'
import { scenes } from './journey'
import type { Scene } from './journey'

interface Props { scene: Scene; guided: boolean; paused: boolean; role: UserRole | null; ready: Record<Scene, { available: boolean; done: boolean; reason?: string }>; onNavigate: (scene: Scene) => void; onGuided: (guided: boolean) => void; onPause: (paused: boolean) => void; onRole: (role: UserRole) => void; onProject: () => void }

export default function JourneyMenu(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const { scene, ready, guided, paused, role, onNavigate, onGuided, onPause, onRole, onProject } = props
  useEffect(() => { dialog.current?.close() }, [scene])
  function close() { dialog.current?.close(); trigger.current?.focus() }
  return <>
    <button ref={trigger} className="cloud-menu-trigger" aria-label="Open journey menu" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}><Cloud size={27} /><span>Menu</span><span className="cloud-menu-dots" aria-hidden="true">···</span></button>
    <dialog ref={dialog} className="journey-menu" aria-labelledby="journey-menu-heading" onClick={(event) => { if (event.target === event.currentTarget) close() }}>
      <div className="journey-menu-header"><div><span className="eyebrow">YOUR FIELD NOTEBOOK</span><h2 id="journey-menu-heading">Your journey</h2></div><button className="icon-button" aria-label="Close journey menu" onClick={close}><X size={21} /></button></div>
      <nav aria-label="Main navigation">{scenes.map((item) => <button key={item.id} aria-label={item.label} aria-describedby={!ready[item.id].available ? `gate-${item.id}` : undefined} aria-current={scene === item.id ? 'step' : undefined} disabled={!ready[item.id].available} onClick={() => { close(); onNavigate(item.id) }}><span className={`journey-menu-number ${ready[item.id].done ? 'is-done' : ''}`}>{ready[item.id].done ? <Check size={14} /> : !ready[item.id].available ? <LockKeyhole size={13} /> : item.step || <Sprout size={14} />}</span><span>{item.label}{!ready[item.id].available && <small id={`gate-${item.id}`}>{ready[item.id].reason}</small>}</span>{scene === item.id && <span className="current-scene-dot" />}</button>)}</nav>
      <details className="journey-preferences"><summary>Make yourself comfortable</summary><label className="preference-toggle"><input type="checkbox" checked={guided} onChange={(event) => onGuided(event.target.checked)} />Guide me step by step</label><button className="text-button" onClick={() => onPause(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Enable animations' : 'Pause animations'}</button><label>Work mode<select value={role || 'grower'} onChange={(event) => onRole(event.target.value as UserRole)}><option value="grower">Grower</option><option value="agronomist">Agronomist</option></select></label><p>These are presentation preferences. Both modes use the same data.</p></details>
      <button className="journey-about-link" onClick={() => { close(); onProject() }}>About Pacha Pulse ↗</button>
    </dialog>
  </>
}
