import { AnimatePresence, motion } from 'motion/react'
import { Pencil, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ROUND_LABEL, chatStatus } from '../agents'
import { AgentMessage, MissingMessage, SystemLine, TypingMessage, UserMessage } from './Messages'
import Crew from './art/Crew'
import Verdict from './Verdict'

export default function DebateView({ debate, profile, sceneId, title, onNew, onEdit }) {
  const { request, items, pending, plan, status, error } = debate
  const endRef = useRef(null)
  const live = status === 'running' || status === 'moderating'
  const rounds = items.filter((i) => i.kind === 'round').length
  const people = request?.constraints?.headcount ?? 1

  useEffect(() => {
    if (live) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items.length, pending.length, live])

  useEffect(() => {
    if (plan) setTimeout(() => document.getElementById('verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
  }, [plan])

  return (
    <motion.main className="debate" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <header className="debate-head glass">
        <Crew count={people} profile={profile} sceneId={sceneId} size="sm" />
        <div className="debate-title">
          <span className="debate-name">{title}</span>
          <span className={`debate-status ${live ? 'is-live' : ''}`}>{chatStatus(debate)}</span>
        </div>
        <span className="round-pill">{status === 'done' ? 'Decided' : status === 'moderating' ? 'Verdict' : status === 'error' ? 'Stopped' : `Round ${Math.max(rounds, 1)} of 2`}</span>
      </header>

      <div className="thread">
        <UserMessage request={request} />
        {items.map((it, i) => {
          if (it.kind === 'round') return <SystemLine key={`r${it.round}`}>{ROUND_LABEL[it.round]}</SystemLine>
          if (it.kind === 'missing') return <MissingMessage key={`m${i}`} item={it} />
          return <AgentMessage key={it.id} turn={it} />
        })}
        <AnimatePresence initial={false}>
          {pending.map((a) => (
            <TypingMessage key={`t-${a}`} agent={a} />
          ))}
        </AnimatePresence>
        {status === 'moderating' && <SystemLine>The Moderator is weighing both rounds</SystemLine>}
        {plan && <Verdict plan={plan} constraints={request.constraints} />}
        {status === 'error' && (
          <div className="error-card glass" role="alert">
            <strong>The debate stopped.</strong>
            <p>{error}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => debate.start(request)}>
              <RotateCcw size={14} /> Try again
            </button>
          </div>
        )}
        <div ref={endRef} className="thread-end" />
      </div>

      <div className="action-bar">
        <div className="action-inner glass">
          {live ? (
            <span className="action-wait">
              <span className="live-dot" /> The council is debating. The decision usually lands in under a minute.
            </span>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={onEdit}>
                <Pencil size={15} /> Edit plan
              </button>
              <button type="button" className="btn btn-accent" onClick={onNew}>
                <Plus size={16} /> New plan
              </button>
            </>
          )}
        </div>
      </div>
    </motion.main>
  )
}
