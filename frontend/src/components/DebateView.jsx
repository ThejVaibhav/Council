import { AnimatePresence, motion } from 'motion/react'
import { Pencil, Plus, RotateCcw, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROUND_LABEL, chatStatus } from '../agents'
import { AgentMessage, MissingMessage, SystemLine, TypingMessage, UserMessage } from './Messages'
import InvitePanel from './InvitePanel'
import Crew from './art/Crew'
import Verdict from './Verdict'

export default function DebateView({ debate, me, sceneId, title, onNew, onEdit, onMembers }) {
  const { request, items, pending, result, status, error, plan } = debate
  const endRef = useRef(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const live = status === 'running' || status === 'moderating'
  const rounds = items.filter((i) => i.kind === 'round').length
  const people = request?.constraints?.headcount ?? 1
  const others = (plan?.members ?? []).filter((m) => m.username !== me.username)
  const owner = plan?.members?.find((m) => m.role === 'owner')
  const mineToEdit = !owner || owner.username === me.username

  useEffect(() => {
    if (live) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items.length, pending.length, live])

  useEffect(() => {
    if (result && status === 'done') setTimeout(() => document.getElementById('verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
  }, [result, status])

  return (
    <motion.main className="debate" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="debate-top">
        <header className="debate-head glass">
          <Crew count={people} me={me.avatar} friends={others.map((m) => m.avatar)} sceneId={sceneId} size="sm" />
          <div className="debate-title">
            <span className="debate-name">{title}</span>
            <span className={`debate-status ${live ? 'is-live' : ''}`}>
              {others.length > 0 ? `With ${others.map((m) => m.display_name).join(', ')} · ` : ''}
              {status === 'loading' ? 'Loading the debate…' : chatStatus({ ...debate, status: status === 'loading' ? 'running' : status })}
            </span>
          </div>
          {plan && (
            <button type="button" className={`btn btn-ghost btn-sm ${inviteOpen ? 'is-on' : ''}`} onClick={() => setInviteOpen((o) => !o)} aria-expanded={inviteOpen}>
              <UserPlus size={14} /> <span className="hide-sm">Invite</span>
            </button>
          )}
          <span className="round-pill">{status === 'done' ? 'Decided' : status === 'moderating' ? 'Verdict' : status === 'error' ? 'Stopped' : `Round ${Math.max(rounds, 1)} of 2`}</span>
        </header>
        <AnimatePresence>{inviteOpen && plan && <InvitePanel plan={plan} me={me} title={title} onMembers={onMembers} />}</AnimatePresence>
      </div>

      <div className="thread">
        {request && <UserMessage request={request} author={owner && owner.username !== me.username ? owner.display_name : null} />}
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
        {result && <Verdict plan={result} constraints={request?.constraints} />}
        {status === 'error' && (
          <div className="error-card glass" role="alert">
            <strong>The debate stopped.</strong>
            <p>{error}</p>
            {request && mineToEdit && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => debate.start({ ...request, scene: sceneId, member_ids: others.map((m) => m.id) })}>
                <RotateCcw size={14} /> Try again
              </button>
            )}
          </div>
        )}
        <div ref={endRef} className="thread-end" />
      </div>

      <div className="action-bar">
        <div className="action-inner glass">
          {live || status === 'loading' ? (
            <span className="action-wait">
              <span className="live-dot" /> {others.length ? 'Everyone in this plan is watching the same debate.' : 'The council is debating. The decision usually lands in under a minute.'}
            </span>
          ) : (
            <>
              {mineToEdit && (
                <button type="button" className="btn btn-ghost" onClick={onEdit}>
                  <Pencil size={15} /> Edit plan
                </button>
              )}
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
