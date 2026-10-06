import { motion } from 'motion/react'
import { Check, Copy, Pin } from 'lucide-react'
import { useState } from 'react'
import { AGENTS, budgetCap, formatCost } from '../agents'
import AgentAvatar from './AgentAvatar'

// The trade-off text names the winning agent first ("Budget, because ..."); use it to mark the winner.
function winnerOf(text) {
  const first = text.trim().split(/[\s,.:;]/)[0]?.toLowerCase()
  return AGENTS[first] && first !== 'moderator' ? first : null
}

function planAsText(plan) {
  const cost = formatCost(plan.estimated_cost)
  return [plan.title, '', plan.summary, '', plan.description, ...(cost ? ['', `Estimated total: ${cost}`] : [])].join('\n')
}

export default function Verdict({ plan, constraints }) {
  const [copied, setCopied] = useState(false)
  const cost = formatCost(plan.estimated_cost)
  const cap = budgetCap(constraints)
  const share = cap && plan.estimated_cost != null ? plan.estimated_cost / cap : null

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
    <motion.div
      className="row row-agent"
      id="verdict"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <AgentAvatar agent="moderator" />
      <div className="msg-col msg-col-wide">
        <span className="msg-name t-moderator">Moderator</span>
        <section className="verdict" data-testid="plan">
          <div className="verdict-top">
            <span className="pinned-label"><Pin size={12} /> Pinned decision</span>
            <button type="button" className="ghost-btn" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy plan'}
            </button>
          </div>

          <div className="verdict-bento">
            <div className="tile tile-main">
              <h2>{plan.title}</h2>
              <p className="verdict-summary">{plan.summary}</p>
            </div>
            <div className="tile tile-cost">
              <span className="tile-label">Estimated total</span>
              <span className="big-num">{cost ?? 'n/a'}</span>
              {share != null && (
                <>
                  <div className={`budget-bar ${share > 1 ? 'is-over' : ''}`} role="img" aria-label={`${Math.round(share * 100)}% of the budget`}>
                    <motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(share, 1) * 100}%` }} transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                  <span className="tile-foot">
                    {Math.round(share * 100)}% of your {formatCost(cap)} budget
                  </span>
                </>
              )}
            </div>
            <div className="tile tile-plan">
              <span className="tile-label">The plan</span>
              <p>{plan.description}</p>
            </div>
          </div>

          <span className="tile-label tradeoff-label">Who won what</span>
          {plan.trade_off_log.length === 0 ? (
            <p className="muted">No real disagreement. The council was aligned.</p>
          ) : (
            <ul className="tradeoffs">
              {plan.trade_off_log.map((t, i) => {
                const winner = winnerOf(t.which_concern_won)
                return (
                  <li key={i}>
                    <div className="tradeoff-who">
                      {t.agents_involved.map((a) => (
                        <span key={a} className={`who-chip ${winner === a ? 'is-winner' : ''}`}>
                          <AgentAvatar agent={a} size="xs" /> {AGENTS[a]?.name ?? a}
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
        </section>
      </div>
    </motion.div>
  )
}
