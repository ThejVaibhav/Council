import { motion } from 'motion/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { AGENTS, budgetCap, formatCost } from '../agents'
import { TRAVEL } from '../avatarOptions'
import AgentAvatar from './AgentAvatar'
import RouteCard from './art/RouteCard'
import { findPlace, placeInText } from '../places'

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
  const people = constraints?.headcount
  const routeFrom = findPlace(constraints?.location)
  const routeTo = findPlace(constraints?.destination) ?? placeInText(`${plan.title} ${plan.summary} ${plan.description}`, routeFrom)
  const route = routeFrom && routeTo ? { from: routeFrom, to: routeTo, mode: constraints?.travel?.length === 1 && constraints.travel[0] === 'flight' ? 'flight' : (constraints?.travel?.[0] ?? 'own_car') } : null

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
      id="verdict"
      className="verdict"
      data-testid="plan"
      initial={{ opacity: 0, y: 24, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
      <div className="ticket">
        <div className="ticket-main">
          <div className="ticket-top">
            <span className="ticket-brand">
              <AgentAvatar agent="moderator" size="xs" /> Council · decision
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy plan'}
            </button>
          </div>
          <h2 className="display ticket-title">{plan.title}</h2>
          <p className="ticket-summary">{plan.summary}</p>
          <dl className="ticket-facts">
            {people && (
              <div><dt>Travellers</dt><dd>{people}</dd></div>
            )}
            {constraints?.dates && (
              <div><dt>When</dt><dd>{constraints.dates}</dd></div>
            )}
            {constraints?.location && (
              <div><dt>From</dt><dd>{constraints.location}</dd></div>
            )}
            {constraints?.travel?.length > 0 && (
              <div><dt>Getting there</dt><dd>{constraints.travel.map((t) => TRAVEL.find((x) => x.id === t)?.label ?? t).join(', ')}</dd></div>
            )}
          </dl>
        </div>
        <div className="ticket-stub">
          <span className="stub-label">Estimated total</span>
          <span className="stub-num">{cost ?? 'n/a'}</span>
          {share != null && (
            <>
              <div className={`budget-bar ${share > 1 ? 'is-over' : ''}`} role="img" aria-label={`${Math.round(share * 100)}% of the budget`}>
                <motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(share, 1) * 100}%` }} transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <span className="stub-foot">{Math.round(share * 100)}% of {formatCost(cap)}</span>
            </>
          )}
          <span className="barcode" aria-hidden="true" />
        </div>
      </div>

      {route && (
        <div className="plan-detail glass">
          <span className="field-label">The route</span>
          <RouteCard compact from={constraints.location} to={route.to.name} fromPlace={route.from} toPlace={route.to} mode={route.mode} />
        </div>
      )}

      <div className="plan-detail glass">
        <span className="field-label">The plan</span>
        <p>{plan.description}</p>
      </div>

      {plan.trade_off_log.length > 0 && (
        <div className="stamps">
          <span className="field-label">Who won what</span>
          <ul>
            {plan.trade_off_log.map((t, i) => {
              const winner = winnerOf(t.which_concern_won)
              return (
                <motion.li
                  key={i}
                  className={`stamp ${winner ? `c-${winner}` : ''}`}
                  initial={{ opacity: 0, scale: 1.25 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.18, type: 'spring', stiffness: 320, damping: 18 }}
                  style={{ '--tilt': `${i % 2 ? 1.2 : -1.4}deg` }}
                >
                  <div className="stamp-head">
                    {t.agents_involved.map((a) => (
                      <AgentAvatar key={a} agent={a} size="xs" />
                    ))}
                    <span>{t.agents_involved.map((a) => AGENTS[a]?.name ?? a).join(' vs ')}</span>
                    {winner && <b className="stamp-win">{AGENTS[winner].name} wins</b>}
                  </div>
                  <p className="stamp-issue">{t.disagreement}</p>
                  <p className="stamp-call">{t.which_concern_won}</p>
                </motion.li>
              )
            })}
          </ul>
        </div>
      )}
    </motion.section>
  )
}
