import { motion } from 'motion/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { AGENTS, formatCost } from '../agents'
import AgentAvatar from './AgentAvatar'

// The trade-off text names the winning agent first ("Budget, because..."); pick it out to label the row.
function winnerOf(text) {
  const first = text.trim().split(/[\s,.:;]/)[0]?.toLowerCase()
  return AGENTS[first] && first !== 'moderator' ? first : null
}

function planAsText(plan) {
  const lines = [plan.title, '', plan.summary, '', plan.description]
  const cost = formatCost(plan.estimated_cost)
  if (cost) lines.push('', `Estimated total: ${cost}`)
  return lines.join('\n')
}

export default function Verdict({ plan }) {
  const [copied, setCopied] = useState(false)
  const cost = formatCost(plan.estimated_cost)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planAsText(plan))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.section
      className="panel verdict"
      data-testid="plan"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="verdict-head">
        <span className="verdict-label">
          <AgentAvatar agent="moderator" size={22} /> Moderator's verdict
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy plan'}
        </button>
      </header>

      <div className="verdict-title-row">
        <h2>{plan.title}</h2>
        {cost && (
          <div className="verdict-cost">
            <span>Estimated total</span>
            <strong>{cost}</strong>
          </div>
        )}
      </div>
      <p className="verdict-summary">{plan.summary}</p>
      <p className="verdict-plan">{plan.description}</p>

      <h3 className="section-label">Trade-offs ({plan.trade_off_log.length})</h3>
      {plan.trade_off_log.length === 0 ? (
        <p className="muted">The agents agreed on everything that mattered.</p>
      ) : (
        <ul className="tradeoffs">
          {plan.trade_off_log.map((t, i) => {
            const winner = winnerOf(t.which_concern_won)
            return (
              <li key={i} className="tradeoff">
                <div className="tradeoff-agents">
                  {t.agents_involved.map((a) => (
                    <span key={a} className={`agent-chip ${winner === a ? 'is-winner' : ''}`}>
                      <AgentAvatar agent={a} size={18} /> {AGENTS[a]?.name ?? a}
                      {winner === a && <Check size={12} strokeWidth={3} />}
                    </span>
                  ))}
                </div>
                <p className="tradeoff-issue">{t.disagreement}</p>
                <p className="tradeoff-call">{t.which_concern_won}</p>
              </li>
            )
          })}
        </ul>
      )}
    </motion.section>
  )
}
