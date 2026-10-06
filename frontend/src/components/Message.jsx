import { motion } from 'motion/react'
import { AGENTS, STANCE_LABEL, formatCost } from '../agents'
import AgentAvatar from './AgentAvatar'

const bubbleIn = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring', stiffness: 260, damping: 26 },
}

// Words fade in one after another so each reply reads like it is being said.
function Reveal({ text }) {
  const words = text.split(/\s+/)
  return (
    <motion.span initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.018 } } }}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="word"
          variants={{ hidden: { opacity: 0, filter: 'blur(4px)' }, show: { opacity: 1, filter: 'blur(0px)' } }}
          transition={{ duration: 0.25 }}
        >
          {w}{' '}
        </motion.span>
      ))}
    </motion.span>
  )
}

export function AgentMessage({ turn }) {
  const a = AGENTS[turn.agent]
  const cost = formatCost(turn.estimated_cost)
  return (
    <motion.article className={`msg agent-${turn.agent}`} {...bubbleIn}>
      <AgentAvatar agent={turn.agent} />
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-name">{a.name}</span>
          <span className={`stance stance-${turn.stance}`}>{STANCE_LABEL[turn.stance]}</span>
        </div>
        <div className="bubble">
          <p className="bubble-text">
            <Reveal text={turn.commentary} />
          </p>
          <motion.div
            className="option-pill"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
          >
            <div className="option-head">
              <span className="option-title">{turn.option_title}</span>
              {cost && <span className="option-cost">{cost}</span>}
            </div>
            <p className="option-desc">{turn.description}</p>
          </motion.div>
        </div>
      </div>
    </motion.article>
  )
}

export function MissingMessage({ item }) {
  return (
    <motion.article className={`msg msg-missing agent-${item.agent}`} {...bubbleIn}>
      <AgentAvatar agent={item.agent} />
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-name">{AGENTS[item.agent].name}</span>
          <span className="stance">offline</span>
        </div>
        <div className="bubble bubble-ghost">
          Couldn't make it this round ({item.error}). The council carries on without them.
        </div>
      </div>
    </motion.article>
  )
}

export function Typing({ agent }) {
  return (
    <motion.div
      className={`msg typing agent-${agent}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
    >
      <AgentAvatar agent={agent} />
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-name">{AGENTS[agent].name}</span>
          <span className="typing-label">{agent === 'moderator' ? 'is weighing it all up' : 'is typing'}</span>
        </div>
        <div className="bubble bubble-typing" aria-label={`${AGENTS[agent].name} is typing`}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </motion.div>
  )
}

export function UserMessage({ request }) {
  const c = request.constraints || {}
  const chips = [
    c.budget && `₹ ${String(c.budget).replace(/\s*INR$/i, '')}`,
    c.headcount && `${c.headcount} people`,
    c.dates,
    c.location,
  ].filter(Boolean)
  return (
    <motion.article className="msg msg-user" {...bubbleIn}>
      <div className="bubble bubble-user">
        <p>{request.brief}</p>
        {chips.length > 0 && (
          <div className="user-chips">
            {chips.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  )
}
