import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MessageCircle, Pause, Play, Sparkles } from 'lucide-react'
import Pacha3D from '../assistant/Pacha3D'
import type { PachaMood } from '../assistant/pachaModel'
import type { UserRole } from '../../types'
import type { Guidance, Scene } from './journey'

export default function PachaStage({ scene, focus = scene, guidance, guided, paused, resting = false, role = 'grower', onPause, onAsk }: { scene: Scene; focus?: string; guidance: Guidance; guided: boolean; paused: boolean; resting?: boolean; role?: UserRole | null; onPause: () => void; onAsk: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [travelling, setTravelling] = useState(false)
  const avatar = useRef<HTMLDivElement>(null)
  const pocket = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
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
        element.dataset.docked = 'false'
        size = rect.width || 68
        x = rect.left
        y = rect.top
      } else {
        const bubbleRect = bubble.current?.getBoundingClientRect()
        size = scene === 'welcome' ? (width < 1050 ? 215 : 255) : scene === 'field' ? (width < 1050 ? 145 : 175) : (width < 1050 ? 155 : 195)
        const positions: Record<string, [number, number]> = {
          evidence: [.82, .56], crops: [.80, .56], soil: [.83, .57], terrain: [.79, .58], sources: [.84, .56], candidate_review: [.80, .56], welcome: [.80, .16], field: [.86, .52], profile: [.83, .56], climate: [.79, .56], planning: [.81, .56], charts: [.82, .58], summary: [.80, .55], help: [.82, .56],
          naming: [.82, .56], crop: [.78, .54], water: [.85, .58], rainfall: [.78, .57], temperature: [.85, .56], meaning: [.80, .59],
          baseline: [.80, .57], alternative_a: [.85, .56], alternative_b: [.78, .58], scenario: [.84, .57], results: [.79, .58], exploring_3d: [.84, .48], drawing: [.86, .52],
        }
        const bubbleAbove = (scene !== 'welcome' && scene !== 'field') || focus === 'exploring_3d'
        const anchor = positions[focus] || positions[scene]
        if (bubbleRect && bubbleRect.width > 0) {
          if (!bubbleAbove) {
            let safeTop = 76
            if (scene === 'field') {
              document.querySelectorAll('.immersive-map .leaflet-control-zoom, .immersive-map .leaflet-control-scale').forEach((control) => {
                const box = control.getBoundingClientRect()
                if (box.width && box.height) safeTop = Math.max(safeTop, box.bottom + 14)
              })
            }
            const availTop = Math.max(70, bubbleRect.top - safeTop - 12)
            size = Math.min(size, Math.floor(availTop / 1.35))
            y = Math.max(safeTop, bubbleRect.top - size * 1.35 - 12)
          } else {
            const minTop = bubbleRect.bottom + 18
            const availHeight = Math.max(135, height - minTop - 16)
            size = Math.min(size, Math.floor(availHeight / 1.35))
            y = Math.max(minTop, Math.min(height - size * 1.35 - 16, Math.max(minTop, height * anchor[1])))
          }
          const minX = Math.max(width * .62, bubbleRect.left - 10)
          const maxX = Math.min(width - size - 20, bubbleRect.right - size + 10)
          const ratio = Math.max(0, Math.min(1, (anchor[0] - .75) / .12))
          x = minX + (maxX - minX) * ratio
        } else {
          x = Math.min(width - size - 24, Math.max(width * .66, width * anchor[0] - size / 2))
          y = Math.min(height - size * 1.35 - 65, Math.max(95, height * anchor[1]))
        }
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
    addEventListener('resize', resize); addEventListener('pacha:map-layout', resize); addEventListener('scroll', scroll, { passive: true }); reduced.addEventListener('change', resize)
    let firstObservation = true
    const observer = new ResizeObserver(() => { if (firstObservation) { firstObservation = false; return }; resize() })
    if (pocket.current) observer.observe(pocket.current)
    if (bubble.current) observer.observe(bubble.current)
    return () => { observer.disconnect(); removeEventListener('resize', resize); removeEventListener('pacha:map-layout', resize); removeEventListener('scroll', scroll); reduced.removeEventListener('change', resize) }
  }, [scene, focus, paused, resting, guided, expanded, role])
  useEffect(() => () => animation.current?.cancel(), [])
  const expression: PachaMood = travelling ? 'travel' : focus === 'temperature' ? 'curious' : focus === 'crop' || focus === 'alternative_a' ? 'point' : guidance.mood
  const bubbleAbove = (scene !== 'welcome' && scene !== 'field') || focus === 'exploring_3d'
  return <aside className={`pacha-stage ${guided ? 'is-guided' : 'is-quiet'} ${bubbleAbove ? 'bubble-above' : 'bubble-below'}`} data-focus={focus} data-scene={scene} data-role={role || 'grower'} aria-label="Pacha's guidance">
    <div className="pacha-avatar-pocket" ref={pocket} aria-hidden="true" />
    <div ref={avatar} className={`pacha-stage-character ${travelling ? 'is-travelling' : ''}`} data-travelling={travelling}>
      <Pacha3D mood={expression} paused={paused || resting} />
      <button className="character-motion-control icon-button" aria-label={paused ? 'Enable animations' : 'Pause animations'} aria-pressed={paused} onClick={onPause}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
    </div>
    <div ref={bubble} className="pacha-story-bubble pacha-cloud-bubble">
      <span className="pacha-cloud-tail" aria-hidden="true"><span /><span /><span /></span>
      <span className="pacha-name"><span className="pacha-presence-dot" />{role === 'agronomist' ? 'PACHA · TECHNICAL ADVISOR VIEW' : 'PACHA · YOUR FIELD COMPANION'}</span>
      {guided ? <><div className="pacha-story-copy" role="status" aria-live="polite" aria-atomic="true"><h2>{guidance.title}</h2><p>{expanded ? guidance.extra : guidance.text}</p></div><div className="pacha-story-actions"><button className="text-button" onClick={() => setExpanded(!expanded)}><Sparkles size={15} />{expanded ? 'Back to the small step' : 'Explain a little more'}</button><button id="pacha-chat-trigger" className="pacha-ask-button" onClick={onAsk} aria-label="Ask Pacha"><MessageCircle size={17} /><span>Ask Pacha</span></button></div></> : <><p className="pacha-quiet-copy">I am here whenever you need a hand.</p><button id="pacha-chat-trigger" className="pacha-ask-button" onClick={onAsk} aria-label="Ask Pacha"><MessageCircle size={17} />Ask Pacha</button></>}
    </div>
  </aside>
}
