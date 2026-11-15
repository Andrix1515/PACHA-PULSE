import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, MessageCircle, Pause, Play, Send, X } from 'lucide-react'
import type { AppView, AssistantContext, AssistantProposal, AssistantReply, ChartArtifact, JourneyContext } from '../../types'
import { requestJson } from '../../services/api'
import PachaRobot from './PachaRobot'

interface Props { embedded?: boolean; motionPaused?: boolean; onMotionChange?: (paused: boolean) => void; task?: { id: number; text: string } | null; onCharts: (charts: ChartArtifact[]) => void; open: boolean; onOpen: (open: boolean) => void; context: AssistantContext; onNavigate: (view: AppView) => void; onApply: (proposal: AssistantProposal) => void }
interface Message { role: 'user' | 'assistant'; text: string; reply?: AssistantReply; id: number }
const steps: { title: string; text: string; view: AppView; scene: JourneyContext['scene']; action: string }[] = [
  { title: 'Hello, I am Pacha!', text: 'We can take this one step at a time. You do not need to understand every chart. First, let us find your field.', view: 'parcel', scene: 'field', action: 'Find my field' },
  { title: 'Give your field an outline', text: 'Zoom in, choose Draw my field, and tap each corner in order. After three corners, tap point 1 to close and save. The Close and save field button is also available. You can also type coordinates instead of using the map.', view: 'parcel', scene: 'field', action: 'Go to the map' },
  { title: 'Tell me what you grow', text: 'In About my field, answer one small question at a time: a name, current crop and water supply. Unknown soil or water details can stay blank. In Ask Pacha, you can describe these details and review a proposed form update.', view: 'parcel', scene: 'profile', action: 'About my field' },
  { title: 'Look at past weather', text: 'Understand the weather can load rainfall and temperature for a location and period. Try the saved Mantaro example if you want a quick demonstration. It changes the query point to Mantaro and uses January 2025. This is past weather, not a forecast.', view: 'monitoring', scene: 'climate', action: 'Understand the weather' },
  { title: 'Explore three planting sequences', text: 'Start with your usual rotation. Edit two alternatives and compare. A 70% rainfall scenario means seven tenths of the historical total. It does not predict next season or tell us which crop is best.', view: 'planning', scene: 'planning', action: 'Explore planting options' },
  { title: 'Keep your findings', text: 'Make a chart prepares rainfall, temperature and rotation charts, with or without AI. Keep my findings brings together your inputs and available results, including chart snapshots. Export a JSON report or print it, and discuss the missing information with an agronomist before making a planting decision.', view: 'reports', scene: 'summary', action: 'Keep my findings' },
]
const fieldLabels: Record<string, string> = { name: 'Field name', crop: 'Current crop', areaHa: 'Area (ha)', soil: 'Soil type', water: 'Water supply', previousRotation: 'Previous rotation' }

export default function PachaCompanion({ embedded = false, motionPaused, onMotionChange, task, onCharts, open, onOpen, context, onNavigate, onApply }: Props) {
  const [tab, setTab] = useState<'guide' | 'chat'>('guide')
  const [step, setStep] = useState(0)
  const [localPaused, setLocalPaused] = useState(false)
  const paused = motionPaused ?? localPaused
  const setPaused = (value: boolean) => { setLocalPaused(value); onMotionChange?.(value) }
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [statusError, setStatusError] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<string[]>([])
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const request = useRef<AbortController | null>(null)
  const messageId = useRef(0)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { if (task) { setTab('chat'); setText(task.text) } }, [task])
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const controller = new AbortController()
    requestJson<{ configured: boolean }>('/assistant/status', { signal: controller.signal }).then((value) => { setConfigured(value.configured); setStatusError(false) }).catch(() => { if (!controller.signal.aborted) setStatusError(true) })
    return () => controller.abort()
  }, [open])
  useEffect(() => { if (open && tab === 'chat') transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: 'instant' }) }, [open, tab, messages, pending])
  function close() { onOpen(false); requestAnimationFrame(() => (embedded ? document.getElementById('pacha-chat-trigger') : trigger.current)?.focus()) }
  async function send(value = text) {
    const question = value.trim()
    if (!question || pending) return
    if (question.length > 2000) { setError('Please keep your message under 2,000 characters.'); return }
    const history = messages.slice(-8).map(({ role, text: content }) => ({ role, text: content }))
    setMessages((current) => [...current.slice(-29), { role: 'user', text: question, id: ++messageId.current }]); setText(''); setError(''); setPending(true)
    const controller = new AbortController(); request.current = controller
    try {
      const reply = await requestJson<AssistantReply>('/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, context, history }), signal: controller.signal })
      if (reply.charts?.length) onCharts(reply.charts)
      setMessages((current) => [...current, { role: 'assistant', text: reply.message, reply, id: ++messageId.current }])
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Pacha could not answer. Your data has not changed.') }
    finally { if (!controller.signal.aborted) setPending(false) }
  }
  function apply(proposal: AssistantProposal, key: string) { onApply(proposal); setApplied((current) => [...current, key]) }
  const current = steps[step]
  return <div className={`companion ${paused ? 'animations-paused' : ''}`}>
    {!embedded && <button ref={trigger} className="companion-trigger" aria-label={open ? 'Close Pacha companion' : 'Open Pacha companion'} aria-expanded={open} aria-controls="pacha-companion" onClick={() => open ? close() : onOpen(true)}><PachaRobot thinking={pending} happy={!!messages.at(-1)?.reply?.charts?.length} /><span>Ask Pacha<MessageCircle size={16} /></span></button>}
    {open && <section id="pacha-companion" className="companion-panel" role="dialog" aria-labelledby="companion-title" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
      <header className="companion-header"><div><strong id="companion-title">Your field companion</strong><small>One small step at a time</small></div><button className="icon-button" aria-label={paused ? 'Enable robot animations' : 'Pause robot animations'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={18} /> : <Pause size={18} />}</button><button ref={closeButton} className="icon-button" aria-label="Close companion" onClick={close}><X size={21} /></button></header>
      <div className="companion-tabs" role="group" aria-label="Companion mode"><button aria-pressed={tab === 'guide'} onClick={() => setTab('guide')}>Guided steps</button><button aria-pressed={tab === 'chat'} onClick={() => setTab('chat')}>Ask Pacha · AI</button></div>
      {tab === 'guide' ? <div className="guide-content"><PachaRobot /><p className="eyebrow">STEP {step + 1} OF {steps.length} · BUILT-IN GUIDE</p><div aria-live="polite" aria-atomic="true"><h2>{current.title}</h2><p>{current.text}</p></div><button className="primary-button" onClick={() => { onApply({ kind: 'navigate', label: current.action, reason: 'You selected this guide step.', view: current.view, scene: current.scene }); close() }}>{current.action}<ArrowRight size={17} /></button><div className="guide-progress" aria-label={`Guide step ${step + 1} of ${steps.length}`}>{steps.map((item, index) => <button key={item.title} aria-label={`Guide step ${index + 1}: ${item.title}`} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}>{index < step ? <Check size={13} /> : index + 1}</button>)}</div><div className="guide-navigation"><button className="text-button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button><button className="secondary-button" onClick={() => setStep(step === steps.length - 1 ? 0 : step + 1)}>{step === steps.length - 1 ? 'Start again' : 'Next step'}<ArrowRight size={16} /></button></div></div> : <>
        <p className="assistant-privacy">Sending a message shares it and your current field context with Google Gemini. AI can make mistakes. Pacha can inspect available evidence and prepare charts. Check explanations and proposed field values before using them.</p>
        {configured === false && <p className="assistant-notice" role="status">AI chat needs the project owner’s Gemini key. Guided steps and all field tools work without it. <button className="text-button" onClick={() => { onNavigate('charts'); close() }}>Open manual chart builder</button></p>}
        {statusError && <p className="assistant-notice" role="status">AI availability could not be checked. You can try sending a message or use Guided steps.</p>}
        <div ref={transcript} className="chat-transcript" role="log" aria-label="Conversation with Pacha" aria-live="polite" aria-relevant="additions text">
          {!messages.length && <div className="chat-welcome"><PachaRobot /><h2>What would you like help with?</h2><p>Tell me what you grow, ask what a number means, or ask me to prepare a chart from your available data.</p></div>}
          {messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}><strong>{message.role === 'user' ? 'You' : 'Pacha'}</strong><p>{message.text}</p>{message.reply && <><small className="evidence-label">{message.reply.evidence === 'verified_climate' ? 'NASA climate context verified by the server' : message.reply.evidence === 'climate_unavailable' ? 'Climate context unavailable; no verified observations supplied' : 'Interface guidance and user inputs'} · {message.reply.model}</small>{message.reply.next_question && <p>{message.reply.next_question}</p>}{!!message.reply.tool_steps?.length && <details className="agent-steps"><summary>Steps Pacha completed</summary><ul>{message.reply.tool_steps.map((value, index) => <li key={index}>{value}</li>)}</ul></details>}{!!message.reply.charts?.length && <div className="agent-chart-receipt"><PachaRobot happy /><div><strong>{message.reply.charts.length === 1 ? 'Your chart is ready' : `${message.reply.charts.length} charts are ready`}</strong><ul>{message.reply.charts.map((chart) => <li key={chart.id}>{chart.title}: {chart.rows.length} groups</li>)}</ul><button className="secondary-button" onClick={() => { onNavigate('charts'); close() }}>Open prepared charts<ArrowRight size={16} /></button></div></div>}{message.reply.proposals.map((proposal, index) => { const key = `${message.id}-${index}`; const done = applied.includes(key); return <div className="proposal" key={key}><h3>{proposal.label}</h3><p>{proposal.reason}</p>{proposal.profile && <dl>{Object.entries(proposal.profile).filter(([, value]) => value !== null).map(([field, value]) => <div key={field}><dt>{fieldLabels[field] || field}</dt><dd>{String(value)}</dd></div>)}</dl>}{proposal.location && <p>Latitude: {proposal.location.lat} · Longitude: {proposal.location.lon}</p>}{proposal.kind === 'update_profile' && <small>Applying updates the listed saved fields and refreshes the profile form. Save any other unfinished profile edits first.</small>}{proposal.kind === 'set_location' && <small>Changing the query point clears the previous climate result.</small>}<button className="secondary-button" aria-disabled={done} onClick={() => { if (!done) apply(proposal, key) }}>{done ? <><Check size={15} />Applied</> : proposal.kind === 'navigate' ? 'Open module' : 'Confirm and apply'}</button></div> })}</>}</article>)}
          {pending && <div className="pacha-thinking" role="status"><PachaRobot thinking /><span>Pacha is thinking…</span></div>}
        </div>
        {error && <p className="field-error chat-error" role="alert">{error}</p>}
        <div className="quick-questions">
          <button disabled={pending} onClick={() => void send('Analyze my land conditions, coordinates and SoilGrids soil properties.')}>Analyze my land</button>
          <button disabled={pending} onClick={() => void send('Which crops could suit this location based on GAEZ and climate?')}>Suitable crops</button>
          <button disabled={pending} onClick={() => void send('¿Cuáles cultivos son adecuados para este lugar y qué riesgos tiene mi rotación?')}>Evaluar en español</button>
          <button disabled={pending} onClick={() => void send('Simulate a 15% rainfall reduction and evaluate the sensitivity impact.')}>Simulate -15% rain</button>
          <button disabled={pending} onClick={() => void send('Please create a readable chart from my available data. Use rainfall if observations are loaded, or rotation structure if a comparison is available. Explain any missing data.')}>Make a chart</button>
        </div>
        <form className="chat-form" onSubmit={(event) => { event.preventDefault(); void send() }}><label htmlFor="pacha-message">Message Pacha</label><div><textarea id="pacha-message" rows={2} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder="e.g. My field is 2 hectares and I grow maize." /><button className="primary-button" type="submit" disabled={pending || !text.trim()} aria-label="Send message"><Send size={20} /></button></div><small>Nothing is entered into your forms without your confirmation.</small></form>
      </>}
    </section>}
  </div>
}
