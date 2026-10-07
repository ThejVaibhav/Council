import { motion } from 'motion/react'
import { Share2 } from 'lucide-react'
import { useMemo } from 'react'
import { AGENTS, budgetCap, formatCost } from '../agents'
import { TRAVEL } from '../avatarOptions'
import { MODE_INFO, fmtKm } from '../geo'
import { useJourney } from '../hooks/useJourney'
import { findPlace, placeInText } from '../places'
import AgentAvatar from './AgentAvatar'
import Journey from './Journey'
import ShareSheet from './ShareSheet'

// The trade-off text names the winning agent first ("Budget, because ..."); use it to mark the winner.
function winnerOf(text) {
  const first = text.trim().split(/[\s,.:;]/)[0]?.toLowerCase()
  return AGENTS[first] && first !== 'moderator' ? first : null
}

/**
 * The pinned decision: a boarding-pass ticket, the journey, the plan and who won what.
 * `items` and `people` feed the share message; `getLink` makes a public recap link.
 */
export default function Verdict({ plan, brief, constraints, items = [], people = [], sceneId = 'everyday', getLink, sharing = false, onShare, onCloseShare }) {
  const cost = formatCost(plan.estimated_cost)
  const cap = budgetCap(constraints)
  const share = cap && plan.estimated_cost != null ? plan.estimated_cost / cap : null
  const headcount = constraints?.headcount

  // Where to: the typed destination, or the first known place the plan itself names.
  const fromText = constraints?.origin?.label ?? constraints?.location ?? ''
  const guessedTo = useMemo(() => (constraints?.destination || constraints?.dest ? null : placeInText(`${plan.title} ${plan.summary} ${plan.description}`, findPlace(constraints?.location))), [plan, constraints])
  const toText = constraints?.dest?.label ?? constraints?.destination ?? guessedTo?.name ?? ''
  const journey = useJourney({ fromText, toText, origin: constraints?.origin, dest: constraints?.dest, modes: constraints?.travel ?? [] })
  const route = journey.status === 'ready'
    ? { from: journey.from.label, to: journey.to.label, km: fmtKm(journey.summary.km), time: journey.summary.time, modes: journey.legs.length > 1 || constraints?.travel?.length ? journey.summary.modes : MODE_INFO[journey.legs[0].mode]?.label }
    : null

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
            <button type="button" className="btn btn-accent btn-sm" onClick={onShare}>
              <Share2 size={14} /> Share
            </button>
          </div>
          <h2 className="display ticket-title">{plan.title}</h2>
          <p className="ticket-summary">{plan.summary}</p>
          <dl className="ticket-facts">
            {headcount && (
              <div><dt>Travellers</dt><dd>{headcount}</dd></div>
            )}
            {constraints?.dates && (
              <div><dt>When</dt><dd>{constraints.dates}</dd></div>
            )}
            {fromText && (
              <div><dt>From</dt><dd>{fromText}</dd></div>
            )}
            {toText && (
              <div><dt>To</dt><dd>{route?.to ?? toText}</dd></div>
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

      {fromText && toText && journey.status !== 'idle' && (
        <div className="plan-detail glass">
          <span className="field-label">The journey</span>
          <Journey journey={journey} fromText={fromText} toText={toText} compact />
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
      <div className="verdict-share glass">
        <div>
          <b>Tell the group</b>
          <span>A story-style recap with every pitch, the clash and the final call, ready for WhatsApp, Instagram, Messages or mail.</span>
        </div>
        <button type="button" className="btn btn-accent" onClick={onShare}>
          <Share2 size={16} /> Share the decision
        </button>
      </div>

      <ShareSheet
        open={sharing}
        onClose={onCloseShare}
        plan={plan}
        request={{ brief, constraints }}
        items={items}
        people={people}
        sceneId={sceneId}
        route={route}
        getLink={getLink}
      />
    </motion.section>
  )
}
