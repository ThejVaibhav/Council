import { AnimatePresence, motion } from 'motion/react'
import { RotateCcw, ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ROUND_LABEL } from '../agents'
import { AgentMessage, MissingMessage, Typing, UserMessage } from './Message'
import Verdict from './Verdict'

function Divider({ round }) {
  const r = ROUND_LABEL[round]
  return (
    <motion.div className="divider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <span className="divider-line" />
      <span className="divider-text">
        {r.title} <span className="divider-note">{r.note}</span>
      </span>
      <span className="divider-line" />
    </motion.div>
  )
}

export default function Council({ debate, onNew }) {
  const { request, items, pending, plan, status, error } = debate
  const endRef = useRef(null)

  // Follow the conversation as it grows, the way a chat does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items.length, pending.length, plan, status])

  const live = status === 'running' || status === 'moderating'

  return (
    <motion.main
      className="council"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="council-status">
        <span className={`live-dot ${live ? 'is-live' : ''}`} />
        {live ? (status === 'moderating' ? 'Moderator deliberating' : 'Council in session') : status === 'done' ? 'Decision reached' : 'Session ended'}
      </div>

      <div className="thread" aria-live="polite">
        <UserMessage request={request} />
        {items.map((it, i) =>
          it.kind === 'round' ? (
            <Divider key={`r${it.round}`} round={it.round} />
          ) : it.kind === 'missing' ? (
            <MissingMessage key={`m${i}`} item={it} />
          ) : (
            <AgentMessage key={it.id} turn={it} />
          ),
        )}
        <AnimatePresence initial={false}>
          {pending.map((a) => (
            <Typing key={`t-${a}`} agent={a} />
          ))}
        </AnimatePresence>

        {plan && <Verdict plan={plan} />}

        {status === 'error' && (
          <motion.div className="error-card glass" role="alert" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <strong>The council hit a snag.</strong>
            <p>{error}</p>
            <button type="button" className="ghost-btn" onClick={() => debate.start(request)}>
              <RotateCcw size={16} /> Try again
            </button>
          </motion.div>
        )}
        <div ref={endRef} className="thread-end" />
      </div>

      <AnimatePresence>
        {!live && (
          <motion.div className="council-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button type="button" className="cta cta-small" onClick={onNew}>
              <ArrowLeft size={16} /> Plan something else
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  )
}
