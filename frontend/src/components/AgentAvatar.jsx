import { AGENTS } from '../agents'

export default function AgentAvatar({ agent, size = 'md' }) {
  return (
    <span className={`avatar avatar-${size} c-${agent}`} role="img" aria-label={AGENTS[agent].name}>
      {AGENTS[agent].initial}
    </span>
  )
}

export function AvatarStack({ size = 'md' }) {
  return (
    <span className={`avatar-stack stack-${size}`} aria-hidden="true">
      {['budget', 'logistics', 'vibe', 'moderator'].map((a) => (
        <AgentAvatar key={a} agent={a} size={size} />
      ))}
    </span>
  )
}
