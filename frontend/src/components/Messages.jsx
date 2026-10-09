import { motion } from 'motion/react'
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
          Didn't reply this round ({item.error}). The council carried on without them.
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
