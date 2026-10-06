import { AGENTS } from '../agents'

// A tiny LEGO head in the agent's torso colour, used wherever an agent is named.
export default function AgentAvatar({ agent, size = 28 }) {
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 28 28" role="img" aria-label={AGENTS[agent].name}>
      <rect x="2" y="17" width="24" height="11" rx="3" fill={`var(--${agent})`} />
      <rect x="10.5" y="1" width="7" height="3.5" rx="1" className="skin" />
      <rect x="6" y="4" width="16" height="14" rx="4.5" className="skin" />
      <circle cx="11" cy="10" r="1.3" className="ink-fill" />
      <circle cx="17" cy="10" r="1.3" className="ink-fill" />
      <path d="M11 13.5 Q14 15.6 17 13.5" className="ink-line thin" />
    </svg>
  )
}
