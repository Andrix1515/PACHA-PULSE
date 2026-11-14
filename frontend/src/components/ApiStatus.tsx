import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getHealth } from '../services/api'

export default function ApiStatus() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    getHealth(controller.signal).then(() => setStatus('ok')).catch(() => {
      if (!controller.signal.aborted) setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])
  return <div className={`api-status ${status}`}>
    <span className="status-dot" aria-hidden="true" />
    <span role="status">{status === 'loading' ? 'Conectando API…' : status === 'ok' ? 'API local conectada' : 'API local sin conexión'}</span>
    {status === 'error' && <button className="icon-button" aria-label="Reintentar conexión con la API" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={16} /></button>}
  </div>
}
