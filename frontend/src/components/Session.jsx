import { AnimatePresence, motion } from 'motion/react'
import { Pencil, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ROUND_LABEL, SPECIALISTS } from '../agents'
import { DEMO } from '../hooks/useDebate'
import { MissingCard, PendingCard, TurnCard } from './TurnCard'
import Verdict from './Verdict'

function BriefCard({ request, onEdit, live }) {
  const c = request.constraints || {}
  const chips = [
    c.budget && `₹${String(c.budget).replace(/\s*INR$/i, '')}`,
    c.headcount && `${c.headcount} people`,
    c.dates,
    c.location,
  ].filter(Boolean)
  return (
    <section className="panel brief-card">
      <div className="brief-card-head">
        <span className="section-label">Your brief</span>
        {DEMO && <span className="tag">Sample debate</span>}
        {!live && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Pencil size={14} /> Edit brief
          </button>
        )}
      </div>
      <p className="brief-text">{request.brief}</p>
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}
    </section>
  )
}

function RoundSection({ round, entries, pending }) {
  const done = entries.length
  return (
    <section className="round">
      <header className="round-head">
        <h3>
          {ROUND_LABEL[round].title} <span>· {ROUND_LABEL[round].subtitle}</span>
        </h3>
        <span className="round-count">{done} of {SPECIALISTS.length}</span>
      </header>
      <div className="round-list">
        {entries.map((it) =>
          it.kind === 'missing' ? <MissingCard key={`m-${it.agent}-${round}`} item={it} /> : <TurnCard key={it.id} turn={it} />,
        )}
        <AnimatePresence initial={false}>
          {pending.map((a) => (
            <PendingCard key={`p-${a}`} agent={a} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

export default function Session({ debate, onEdit }) {
  const { request, items, pending, plan, status, error } = debate
  const endRef = useRef(null)
  const live = status === 'running' || status === 'moderating'

  useEffect(() => {
    if (live || plan) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items.length, pending.length, plan, live])

  const rounds = items.filter((i) => i.kind === 'round').map((i) => i.round)
  const current = rounds[rounds.length - 1]

  return (
    <motion.div className="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <BriefCard request={request} onEdit={onEdit} live={live} />
      {rounds.map((r) => (
        <RoundSection
          key={r}
          round={r}
          entries={items.filter((i) => i.round === r && (i.kind === 'turn' || i.kind === 'missing'))}
          pending={r === current && status === 'running' ? pending : []}
        />
      ))}
      <AnimatePresence>
        {status === 'moderating' && (
          <section className="round">
            <header className="round-head"><h3>Verdict</h3></header>
            <PendingCard agent="moderator" />
          </section>
        )}
      </AnimatePresence>
      {plan && <Verdict plan={plan} />}
      {status === 'error' && (
        <section className="panel error-card" role="alert">
          <strong>The debate stopped.</strong>
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => debate.start(request)}>
            <RotateCcw size={14} /> Try again
          </button>
        </section>
      )}
      <div ref={endRef} />
    </motion.div>
  )
}
