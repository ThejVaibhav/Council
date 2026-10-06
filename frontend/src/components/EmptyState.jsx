import { motion } from 'motion/react'
import { AGENTS, MEMBERS } from '../agents'
import { EMPTY_CONSTRAINTS } from '../constraints'
import { SCENARIOS } from '../scenarios'
import AgentAvatar from './AgentAvatar'

export default function EmptyState({ setDraft }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <h1>Plan it with the council</h1>
      <p className="empty-lede">Send your plan to the group. Three agents debate it over two rounds, then the Moderator pins the decision.</p>

      <ul className="members">
        {MEMBERS.map((a) => (
          <li key={a}>
            <AgentAvatar agent={a} size="lg" />
            <span className="member-name">{AGENTS[a].name}</span>
            <span className="member-role">{AGENTS[a].role}</span>
          </li>
        ))}
      </ul>

      <span className="suggest-label">Try one</span>
      <div className="suggestions">
        {SCENARIOS.map((s) => (
          <button
            type="button"
            key={s.label}
            className="suggestion"
            onClick={() => setDraft({ brief: s.brief, constraints: { ...EMPTY_CONSTRAINTS, ...s.constraints }, active: s.label, open: true })}
          >
            <span className="suggestion-title">{s.label}</span>
            <span className="suggestion-meta">{s.meta}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
