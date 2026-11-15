import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MessageCircle, Pause, Play, Sparkles } from 'lucide-react'
import Pacha3D from '../assistant/Pacha3D'
import type { PachaMood } from '../assistant/pachaModel'
import type { Guidance, Scene } from './journey'

export default function PachaStage({ scene, focus = scene, guidance, guided, paused, resting = false, onPause, onAsk }: { scene: Scene; focus?: string; guidance: Guidance; guided: boolean; paused: boolean; resting?: boolean; onPause: () => void; onAsk: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [travelling, setTravelling] = useState(false)
  const avatar = useRef<HTMLDivElement>(null)
  const pocket = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const positioned = useRef(false)
  useEffect(() => { setExpanded(false) }, [scene, guidance.title])
  useLayoutEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    function position(animate: boolean) {
      const element = avatar.current
      if (!element || !pocket.current) return
      const before = element.getBoundingClientRect()
      const width = innerWidth, height = innerHeight
      let x: number, y: number, size: number
      if (width <= 760) {
        const rect = pocket.current.getBoundingClientRect()
        const docked = rect.bottom < 75
        element.dataset.docked = String(docked)
        size = docked ? 48 : rect.width; x = docked ? width - 63 : rect.left; y = docked ? 80 : rect.top
      } else {
        size = width < 1050 ? 155 : 210
        const positions: Record<string, [number, number]> = {
          evidence: [.82, .60], crops: [.80, .60], soil: [.82, .60], terrain: [.78, .62], sources: [.84, .60], candidate_review: [.80, .60], welcome: [.80, .20], field: [.85, .18], profile: [.83, .60], climate: [.77, .60], planning: [.80, .60], charts: [.82, .64], summary: [.80, .58], help: [.82, .60],
          naming: [.82, .60], crop: [.76, .55], water: [.87, .64], rainfall: [.75, .62], temperature: [.86, .61], meaning: [.78, .66],
          baseline: [.79, .62], alternative_a: [.86, .61], alternative_b: [.75, .64], scenario: [.84, .62], results: [.77, .63], exploring_3d: [.70, .16], drawing: [.85, .18],
        }
        const anchor = positions[focus] || positions[scene]
        x = Math.min(width - size - 20, Math.max(width * .66, width * anchor[0] - size / 2))
        y = Math.min(height - size * 1.35 - 65, Math.max(95, height * anchor[1]))
        if (scene === 'welcome') size = width < 1050 ? 225 : 290
        x = Math.min(x, width - size - 24)
      }
      animation.current?.cancel(); animation.current = null
      element.style.setProperty('--pacha-left', `${x}px`); element.style.setProperty('--pacha-top', `${y}px`); element.style.width = `${size}px`; element.style.height = `${size * 1.35}px`
      if (animate && positioned.current && !paused && !resting && !reduced.matches && Math.hypot(before.left - x, before.top - y) > 8) {
        const dx = before.left - x, dy = before.top - y, scale = before.width / size
        setTravelling(true)
        const flight = element.animate([
          { transform: `translate(${dx}px,${dy}px) scale(${scale}) rotate(0deg)` },
          { transform: `translate(${dx * .48}px,${dy * .48 - Math.min(65, height * .06)}px) scale(${(scale + 1) / 2}) rotate(${dx > 0 ? -7 : 7}deg)`, offset: .52 },
          { transform: 'translate(0,0) scale(1) rotate(0deg)' },
        ], { duration: 1050, easing: 'cubic-bezier(.22,.65,.2,1)' })
        animation.current = flight
        flight.finished.then(() => { if (animation.current === flight) { animation.current = null; setTravelling(false) } }).catch(() => {})
      } else setTravelling(false)
      positioned.current = true
    }
    position(true)
    const resize = () => position(false)
    const scroll = () => { if (innerWidth <= 760) position(false) }
    addEventListener('resize', resize); addEventListener('scroll', scroll, { passive: true }); reduced.addEventListener('change', resize)
    let firstObservation = true
    const observer = new ResizeObserver(() => { if (firstObservation) { firstObservation = false; return }; resize() }); if (pocket.current) observer.observe(pocket.current)
    return () => { observer.disconnect(); removeEventListener('resize', resize); removeEventListener('scroll', scroll); reduced.removeEventListener('change', resize) }
  }, [scene, focus, paused, resting, guided, expanded])
  useEffect(() => () => animation.current?.cancel(), [])
  const expression: PachaMood = travelling ? 'travel' : focus === 'temperature' ? 'curious' : focus === 'crop' || focus === 'alternative_a' ? 'point' : guidance.mood
  return <aside className={`pacha-stage ${guided ? 'is-guided' : 'is-quiet'}`} data-focus={focus} data-scene={scene} aria-label="Pacha's guidance">
    <div className="pacha-avatar-pocket" ref={pocket} aria-hidden="true" />
    <div ref={avatar} className={`pacha-stage-character ${travelling ? 'is-travelling' : ''}`} data-travelling={travelling}>
      <Pacha3D mood={expression} paused={paused || resting} />
      <button className="character-motion-control icon-button" aria-label={paused ? 'Enable animations' : 'Pause animations'} aria-pressed={paused} onClick={onPause}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
    </div>
    <div className="pacha-story-bubble">
      <span className="pacha-name"><span className="pacha-presence-dot" />PACHA · YOUR FIELD COMPANION</span>
      {guided ? <><div className="pacha-story-copy" role="status" aria-live="polite" aria-atomic="true"><h2>{guidance.title}</h2><p>{expanded ? guidance.extra : guidance.text}</p></div><div className="pacha-story-actions"><button className="text-button" onClick={() => setExpanded(!expanded)}><Sparkles size={14} />{expanded ? 'Back to the small step' : 'Explain a little more'}</button><button id="pacha-chat-trigger" className="pacha-ask-button" onClick={onAsk} aria-label="Ask Pacha"><MessageCircle size={16} /><span>Ask Pacha</span></button></div></> : <><p className="pacha-quiet-copy">I am here whenever you need a hand.</p><button id="pacha-chat-trigger" className="pacha-ask-button" onClick={onAsk} aria-label="Ask Pacha"><MessageCircle size={16} />Ask Pacha</button></>}
    </div>
  </aside>
}
