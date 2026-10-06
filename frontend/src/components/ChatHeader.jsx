import { ChevronLeft, Pin } from 'lucide-react'
import { chatStatus, formatCost } from '../agents'
import { DEMO } from '../hooks/useDebate'
import { AvatarStack } from './AgentAvatar'

export default function ChatHeader({ debate, title, onBack }) {
  const { status, items, plan } = debate
  const live = status === 'running' || status === 'moderating'
  const rounds = items.filter((i) => i.kind === 'round').length
  const typing = live && /typing|deciding/.test(chatStatus(debate))

  return (
    <header className="chat-header">
      <div className="chat-header-row">
        {status !== 'idle' && !live ? (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Start a new plan">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <span className="icon-btn-spacer" />
        )}
        <AvatarStack size="sm" />
        <div className="chat-title">
          <span className="chat-name">
            {title}
            {DEMO && <span className="demo-tag">sample</span>}
          </span>
          <span className={`chat-sub ${typing ? 'is-typing' : ''}`}>{chatStatus(debate)}</span>
        </div>
        {status !== 'idle' && (
          <span className="round-pill">
            {status === 'done' ? 'Done' : status === 'moderating' ? 'Verdict' : `Round ${Math.max(rounds, 1)} of 2`}
          </span>
        )}
      </div>
      {plan && (
        <button
          type="button"
          className="pinned-bar"
          onClick={() => document.getElementById('verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <Pin size={14} className="pin-icon" />
          <span className="pinned-title">{plan.title}</span>
          {formatCost(plan.estimated_cost) && <span className="pinned-cost">{formatCost(plan.estimated_cost)}</span>}
        </button>
      )}
    </header>
  )
}
