import { AGENTS } from '../agents'

export default function AgentAvatar({ agent, size = 'md' }) {
  const { Icon, name } = AGENTS[agent]
  return (
    <span className={`avatar avatar-${size} agent-${agent}`} aria-label={name} role="img">
      <Icon size={size === 'lg' ? 24 : size === 'sm' ? 13 : 18} strokeWidth={1.9} />
    </span>
  )
}
