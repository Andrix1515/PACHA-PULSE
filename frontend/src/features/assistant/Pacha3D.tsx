import { useEffect, useRef, useState } from 'react'
import PachaRobot from './PachaRobot'
import type { PachaMood } from './pachaModel'

export default function Pacha3D({ mood, paused }: { mood: PachaMood; paused: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const state = useRef({ mood, paused }); state.current = { mood, paused }
  const controller = useRef<{ refresh: () => void; dispose: () => void } | null>(null)
  const [renderer, setRenderer] = useState<'loading' | 'webgl' | 'svg'>('loading')
  useEffect(() => {
    let cancelled = false
    import('./pachaModel').then(({ mountPacha }) => {
      if (cancelled || !container.current) return
      try { controller.current = mountPacha(container.current, state, () => setRenderer('svg')); setRenderer('webgl') }
      catch { setRenderer('svg') }
    }).catch(() => { if (!cancelled) setRenderer('svg') })
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null }
  }, [])
  useEffect(() => { if (renderer === 'svg') { controller.current?.dispose(); controller.current = null } else controller.current?.refresh() }, [mood, paused, renderer])
  return <div className={`pacha-model ${paused ? 'animations-paused' : ''}`} aria-hidden="true" data-renderer={renderer} data-mood={mood}>
    <div className="pacha-model-canvas" ref={container} />
    {renderer !== 'webgl' && <PachaRobot thinking={mood === 'think'} happy={mood === 'celebrate'} />}
    <span className="pacha-ground-shadow" />
  </div>
}
