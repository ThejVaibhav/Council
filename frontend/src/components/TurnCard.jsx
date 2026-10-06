import { motion } from 'motion/react'
import { Flag, Lightbulb, ThumbsUp } from 'lucide-react'
import { AGENTS, STANCE_LABEL, formatCost } from '../agents'
import AgentAvatar from './AgentAvatar'

const STANCE_ICON = { propose: Lightbulb, support: ThumbsUp, flag: Flag }
const enter = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }

export function TurnCard({ turn }) {
  const Icon = STANCE_ICON[turn.stance]
  const cost = formatCost(turn.estimated_cost)
  return (
    <motion.article className="turn" {...enter}>
      <header className="turn-head">
        <AgentAvatar agent={turn.agent} />
        <span className="turn-name">{AGENTS[turn.agent].name}</span>
        <span className={`stance stance-${turn.stance}`}>
          <Icon size={12} strokeWidth={2.4} /> {STANCE_LABEL[turn.stance]}
        </span>
      </header>
      <p className="turn-text">{turn.commentary}</p>
      <div className="turn-option">
        <div className="turn-option-main">
          <span className="turn-option-title">{turn.option_title}</span>
          <span className="turn-option-desc">{turn.description}</span>
        </div>
        {cost && <span className="cost">{cost}</span>}
      </div>
    </motion.article>
  )
}

export function MissingCard({ item }) {
  return (
    <motion.article className="turn turn-missing" {...enter}>
      <header className="turn-head">
        <AgentAvatar agent={item.agent} />
        <span className="turn-name">{AGENTS[item.agent].name}</span>
        <span className="stance">Did not respond</span>
      </header>
      <p className="turn-text muted">No response this round ({item.error}). The debate continued without this agent and the Moderator was told.</p>
    </motion.article>
  )
}

export function PendingCard({ agent }) {
  const moderator = agent === 'moderator'
  return (
    <motion.article className="turn turn-pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0 } }}>
      <header className="turn-head">
        <AgentAvatar agent={agent} />
        <span className="turn-name">{AGENTS[agent].name}</span>
        <span className="stance">{moderator ? 'Writing the verdict' : 'Thinking'}</span>
      </header>
      <div className="skeleton">
        <span style={{ width: '92%' }} />
        <span style={{ width: '64%' }} />
      </div>
    </motion.article>
  )
}
