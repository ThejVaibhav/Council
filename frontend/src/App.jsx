import { useRef, useState } from 'react'
import { streamDebate } from './sse'
import { SCENARIOS } from './scenarios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const AGENT_LABEL = { budget: 'Budget', logistics: 'Logistics', vibe: 'Vibe', moderator: 'Moderator' }
const ROUND_LABEL = { 1: 'Round one, proposals', 2: 'Round two, reactions' }

const formatCost = (c) => (c == null ? null : `₹${Math.round(c).toLocaleString('en-IN')}`)

function Turn({ item }) {
  if (item.kind === 'error') {
    return (
      <div className={`turn turn-${item.agent} turn-failed`}>
        <div className="turn-head">
          <span className="agent-tag">{AGENT_LABEL[item.agent]}</span>
          <span className="stance">no response</span>
        </div>
        <p className="commentary">This agent did not respond ({item.error}). The council continues without it.</p>
      </div>
    )
  }
  return (
    <div className={`turn turn-${item.agent}`}>
      <div className="turn-head">
        <span className="agent-tag">{AGENT_LABEL[item.agent]}</span>
        <span className={`stance stance-${item.stance}`}>{item.stance}</span>
      </div>
      <p className="commentary">{item.commentary}</p>
      <div className="option">
        <strong>{item.option_title}</strong>
        {formatCost(item.estimated_cost) && <span className="cost">{formatCost(item.estimated_cost)}</span>}
        <p>{item.description}</p>
      </div>
    </div>
  )
}

function PlanCard({ plan }) {
  return (
    <section className="plan" data-testid="plan">
      <div className="plan-kicker">Moderator's decision</div>
      <h2>{plan.title}</h2>
      <p className="plan-summary">{plan.summary}</p>
      <div className="plan-details">
        <p>{plan.description}</p>
        {formatCost(plan.estimated_cost) && <div className="plan-cost">Estimated total {formatCost(plan.estimated_cost)}</div>}
      </div>
      <h3>Trade-off log</h3>
      {plan.trade_off_log.length === 0 && <p className="muted">The agents did not record a real disagreement.</p>}
      <ul className="tradeoffs">
        {plan.trade_off_log.map((t, i) => (
          <li key={i}>
            <div className="tradeoff-agents">
              {t.agents_involved.map((a) => (
                <span key={a} className={`agent-tag tag-${a}`}>{AGENT_LABEL[a]}</span>
              ))}
            </div>
            <p><span className="muted">Disagreement:</span> {t.disagreement}</p>
            <p><span className="muted">Decision:</span> {t.which_concern_won}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function App() {
  const [brief, setBrief] = useState('')
  const [constraints, setConstraints] = useState(null)
  const [items, setItems] = useState([])
  const [phase, setPhase] = useState('idle') // idle | running | moderating | done | error
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const pickScenario = (s) => {
    setBrief(s.brief)
    setConstraints(s.constraints)
  }

  const run = async (e) => {
    e.preventDefault()
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setItems([])
    setPlan(null)
    setError(null)
    setPhase('running')
    let finished = false
    try {
      await streamDebate(
        `${API_BASE}/sessions/stream`,
        { brief, constraints },
        (type, data) => {
          if (type === 'round_start') setItems((xs) => [...xs, { kind: 'round', round: data.round }])
          else if (type === 'turn') setItems((xs) => [...xs, { kind: 'turn', ...data }])
          else if (type === 'agent_error') setItems((xs) => [...xs, { kind: 'error', ...data }])
          else if (type === 'moderator_start') setPhase('moderating')
          else if (type === 'final_plan') setPlan(data)
          else if (type === 'error') {
            finished = true
            setError(data.error)
            setPhase('error')
          } else if (type === 'done') {
            finished = true
            setPhase('done')
          }
        },
        controller.signal,
      )
      if (!finished) {
        setError('The connection closed before the council finished.')
        setPhase('error')
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setPhase('error')
    }
  }

  const busy = phase === 'running' || phase === 'moderating'

  return (
    <main className="page">
      <header>
        <h1>Council</h1>
        <p className="tagline">Three agents argue out your plan. A moderator makes the call, and says why.</p>
      </header>

      <form onSubmit={run} className="brief-form">
        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button type="button" key={s.label} onClick={() => pickScenario(s)} disabled={busy}>
              {s.label}
            </button>
          ))}
        </div>
        <textarea
          value={brief}
          onChange={(e) => {
            setBrief(e.target.value)
            setConstraints(null)
          }}
          placeholder="What are you planning? Include budget, group size, dates, location, and the vibe you want."
          rows={4}
          disabled={busy}
        />
        <button type="submit" className="primary" disabled={busy || brief.trim().length < 10}>
          {busy ? 'Council in session...' : 'Convene the council'}
        </button>
      </form>

      {error && (
        <div className="error-banner" role="alert">
          Something went wrong: {error}
        </div>
      )}

      {items.length > 0 && (
        <section className="transcript" aria-live="polite">
          {items.map((it, i) =>
            it.kind === 'round' ? (
              <h2 key={i} className="round-label">{ROUND_LABEL[it.round]}</h2>
            ) : (
              <Turn key={i} item={it} />
            ),
          )}
          {busy && <div className="thinking">{phase === 'moderating' ? 'Moderator is weighing the debate...' : 'Agents are thinking...'}</div>}
        </section>
      )}

      {plan && <PlanCard plan={plan} />}
    </main>
  )
}
