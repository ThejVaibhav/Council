import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { AGENTS, STANCE_LABEL, formatCost } from '../agents'
import { TRAVEL } from '../avatarOptions'
import AgentAvatar from './AgentAvatar'

const pop = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring', stiffness: 380, damping: 30 },
}

export function SystemLine({ children }) {
  return (
    <motion.div className="system-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {children}
    </motion.div>
  )
}

export function UserMessage({ request, author }) {
  const c = request.constraints || {}
  const chips = [
    c.budget && (/^\d+(\s*INR)?$/i.test(String(c.budget).trim()) ? `₹${Number(String(c.budget).replace(/\D/g, '')).toLocaleString('en-IN')}` : `₹${String(c.budget).replace(/\s*INR$/i, '')}`),
    c.headcount && `${c.headcount} people`,
    c.dates,
    c.stops?.length ? [c.location ?? c.origin?.label, ...c.stops.map((st) => st.label)].filter(Boolean).join(' → ') : c.location && c.destination ? `${c.location} → ${c.destination}` : c.location,
    ...(c.travel ?? []).map((t) => TRAVEL.find((x) => x.id === t)?.label),
  ].filter(Boolean)
  return (
    <motion.div className="row row-me" {...pop}>
      <div className="bubble bubble-me">
        {author && <span className="me-author">{author}</span>}
        {request.brief}
        {chips.length > 0 && (
          <div className="me-chips">
            {chips.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function AgentMessage({ turn, showName = true }) {
  const cost = formatCost(turn.estimated_cost)
  return (
    <motion.div className="row row-agent" {...pop}>
      <AgentAvatar agent={turn.agent} />
      <div className="msg-col">
        {showName && <span className={`msg-name t-${turn.agent}`}>{AGENTS[turn.agent].name}</span>}
        <div className="bubble bubble-agent">
          <p>{turn.commentary}</p>
          <div className="option">
            <div className="option-main">
              <span className="option-title">{turn.option_title}</span>
              <span className="option-desc">{turn.description}</span>
            </div>
            {cost && <span className="option-cost">{cost}</span>}
          </div>
        </div>
        <span className={`reaction stance-${turn.stance}`}>{STANCE_LABEL[turn.stance]}</span>
      </div>
    </motion.div>
  )
}

export function MissingMessage({ item }) {
  return (
    <motion.div className="row row-agent" {...pop}>
      <AgentAvatar agent={item.agent} />
      <div className="msg-col">
        <span className={`msg-name t-${item.agent}`}>{AGENTS[item.agent].name}</span>
        <div className="bubble bubble-missing">
          {item.reason === 'timeout' || /timed out|timeout/i.test(item.error ?? '')
            ? `Timed out in round ${item.round} and was left out of this round.`
            : `Couldn't answer in round ${item.round} and was left out of this round.`}{' '}
          {item.round === 2 ? 'Their view is not counted in the final decision.' : 'The council carried on without them.'}
        </div>
      </div>
    </motion.div>
  )
}

export function TypingMessage({ agent }) {
  return (
    <motion.div
      className="row row-agent"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
    >
      <AgentAvatar agent={agent} />
      <div className="msg-col">
        <span className={`msg-name t-${agent}`}>{AGENTS[agent].name}</span>
        <div className="bubble bubble-typing" aria-label={`${AGENTS[agent].name} is typing`}>
          <i />
          <i />
          <i />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * One round of the debate. While the debate runs it shows every message; once there is a decision it folds
 * into a one-line pitch per agent that can be opened, so the decision stays the first thing you read.
 */
export function RoundGroup({ label, items, collapsible }) {
  // Remounted (by key) when the decision lands, so it folds itself at that moment.
  const [open, setOpen] = useState(!collapsible)
  const order = (a) => ['budget', 'logistics', 'vibe'].indexOf(a.agent)
  const turns = items.filter((i) => i.kind === 'turn').sort((a, b) => order(a) - order(b))
  const missing = items.filter((i) => i.kind === 'missing')
  return (
    <section className={`round-group ${open ? 'is-open' : 'is-folded'}`} aria-label={label}>
      {collapsible ? (
        <button type="button" className="round-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="round-toggle-label">{label}</span>
          <span className="round-toggle-meta">{turns.length} {turns.length === 1 ? 'reply' : 'replies'}{missing.length ? `, ${missing.length} missing` : ''}</span>
          <ChevronDown size={16} className={open ? 'is-open' : ''} />
        </button>
      ) : (
        <SystemLine>{label}</SystemLine>
      )}
      {!open && (
        <ul className="round-digest">
          {turns.map((t) => (
            <li key={t.id ?? t.agent}>
              <AgentAvatar agent={t.agent} size="xs" />
              <b className={`t-${t.agent}`}>{AGENTS[t.agent].name}</b>
              <span className="digest-title">{t.option_title}</span>
              {t.estimated_cost != null && <span className="digest-cost">{formatCost(t.estimated_cost)}</span>}
              <span className={`digest-stance s-${t.stance}`}>{STANCE_LABEL[t.stance] ?? t.stance}</span>
            </li>
          ))}
          {missing.map((m) => (
            <li key={`m-${m.agent}`} className="is-missing">
              <AgentAvatar agent={m.agent} size="xs" />
              <b className={`t-${m.agent}`}>{AGENTS[m.agent].name}</b>
              <span className="digest-title">{m.reason === 'timeout' || /timed out|timeout/i.test(m.error ?? '') ? 'timed out' : 'did not answer'}, not counted</span>
            </li>
          ))}
        </ul>
      )}
      {open && items.map((it, i) => (it.kind === 'missing' ? <MissingMessage key={`m${i}`} item={it} /> : <AgentMessage key={it.id ?? i} turn={it} />))}
    </section>
  )
}
