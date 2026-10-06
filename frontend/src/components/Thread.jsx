import { AnimatePresence } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ROUND_LABEL } from '../agents'
import { AgentMessage, MissingMessage, SystemLine, TypingMessage, UserMessage } from './Messages'
import Verdict from './Verdict'

export default function Thread({ debate }) {
  const { request, items, pending, plan, status, error } = debate
  const endRef = useRef(null)

  // Follow new messages the way a chat does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items.length, pending.length, status])

  // When the verdict lands, bring its top into view instead of its bottom.
  useEffect(() => {
    if (plan) setTimeout(() => document.getElementById('verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }, [plan])

  return (
    <div className="thread">
      <SystemLine>You started a council</SystemLine>
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
      {status === 'moderating' && <SystemLine>Moderator is weighing both rounds</SystemLine>}
      {plan && <Verdict plan={plan} constraints={request.constraints} />}
      {status === 'error' && (
        <div className="error-card" role="alert">
          <strong>The debate stopped.</strong>
          <p>{error}</p>
          <button type="button" className="ghost-btn" onClick={() => debate.start(request)}>
            <RotateCcw size={14} /> Try again
          </button>
        </div>
      )}
      <div ref={endRef} className="thread-end" />
    </div>
  )
}
