import { motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Share2, ShieldCheck, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AGENTS, budgetInfo, formatCost } from '../agents'
import { STATUS_TEXT, consensusLabel, participationFromItems } from '../council'
import RichText from './RichText'
import { TRAVEL } from '../avatarOptions'
import { MODE_INFO, fmtKm, fmtTime } from '../geo'
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

const BRAND = {
  verified: 'Council · verified decision',
  needs_review: 'Council · decision, needs review',
  not_verified: 'Council · draft, not verified',
  unchecked: 'Council · decision',
}

const ICON = { error: XCircle, warn: AlertTriangle, ok: CheckCircle2, info: Info }

/** What was checked before this plan was shown, who took part, and how much they agreed. */
function Checks({ validation, participation }) {
  const [open, setOpen] = useState(false)
  const checks = validation?.checks ?? []
  const problems = checks.filter((c) => c.level === 'error' || c.level === 'warn')
  const rest = checks.filter((c) => c.level === 'ok' || c.level === 'info')
  const status = validation?.status ?? 'unchecked'
  const consensus = consensusLabel(participation)
  const head = {
    verified: { icon: ShieldCheck, text: 'Checked: the route, timings and budget add up.' },
    needs_review: { icon: AlertTriangle, text: 'Mostly checks out, but look at these before you book.' },
    not_verified: { icon: XCircle, text: 'Not a verified decision. Something in this plan does not add up.' },
    unchecked: { icon: Info, text: 'This plan has not been checked automatically, so treat the numbers as a draft.' },
  }[status]
  const HeadIcon = head.icon
  return (
    <section className={`checks glass is-${status}`} aria-label="Plan checks">
      <p className="checks-head"><HeadIcon size={18} /> <b>{head.text}</b></p>
      {problems.length > 0 && (
        <ul className="checks-list">
          {problems.map((c, i) => {
            const I = ICON[c.level]
            return <li key={i} className={`is-${c.level}`}><I size={15} /> {c.message}</li>
          })}
        </ul>
      )}
      <div className="council-row">
        {participation.agents.map((a) => (
          <span key={a.agent} className={`who-chip is-${a.round2}`} title={`Round 1: ${STATUS_TEXT[a.round1]}, round 2: ${STATUS_TEXT[a.round2]}`}>
            <AgentAvatar agent={a.agent} size="xs" /> {AGENTS[a.agent].name}
            <em>{a.round2 === 'responded' ? (a.round1 === 'responded' ? 'both rounds' : 'round 2 only') : `${STATUS_TEXT[a.round2]} in round 2${a.round1 === 'responded' ? '' : ' and 1'}, not counted`}</em>
          </span>
        ))}
        {consensus && <span className={`consensus is-${consensus.tone}`}>{consensus.text}</span>}
      </div>
      {rest.length > 0 && (
        <>
          <button type="button" className="checks-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Show'} what was checked ({rest.length}) <ChevronDown size={14} className={open ? 'is-open' : ''} />
          </button>
          {open && (
            <ul className="checks-list is-rest">
              {rest.map((c, i) => {
                const I = ICON[c.level]
                return <li key={i} className={`is-${c.level}`}><I size={15} /> {c.message}</li>
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

/**
 * The pinned decision: a boarding-pass ticket, the journey, the plan and who won what.
 * `items` and `people` feed the share message; `getLink` makes a public recap link.
 */
export default function Verdict({ plan, brief, constraints, items = [], people = [], sceneId = 'everyday', getLink, sharing = false, onShare, onCloseShare }) {
  const cost = formatCost(plan.estimated_cost)
  const budget = budgetInfo(constraints)
  const cap = budget?.total ?? null
  const share = cap && plan.estimated_cost != null ? plan.estimated_cost / cap : null
  const headcount = constraints?.headcount
  const travellers = Math.max(1, Number(headcount) || 1)
  const perPerson = plan.estimated_cost != null && travellers > 1 ? formatCost(Math.round(plan.estimated_cost / travellers)) : null
  const validation = plan.validation ?? null
  const status = validation?.status ?? 'unchecked'
  const participation = validation?.participation ?? participationFromItems(items)
  const breakdown = plan.cost_breakdown ?? []
  // A total checked against an incomplete set of costs is not "within budget" yet.
  const budgetDoubt = (validation?.checks ?? []).some((c) => ['budget', 'costs', 'itinerary'].includes(c.area) && (c.level === 'error' || c.level === 'warn'))
  const realistic = validation?.realistic_minimum

  // Where to: the typed destination, or the first known place the plan itself names.
  const fromText = constraints?.origin?.label ?? constraints?.location ?? ''
  const guessedTo = useMemo(() => (constraints?.destination || constraints?.dest ? null : placeInText(`${plan.title} ${plan.summary} ${plan.description}`, findPlace(constraints?.location))), [plan, constraints])
  const toText = constraints?.dest?.label ?? constraints?.destination ?? guessedTo?.name ?? ''
  const stops = useMemo(() => constraints?.stops?.map((st) => ({ text: st.label, pin: st, mode: st.mode })) ?? null, [constraints])
  const journey = useJourney({ fromText, toText, origin: constraints?.origin, dest: constraints?.dest, stops, modes: constraints?.travel ?? [] })
  const route = journey.status === 'ready'
    ? { from: journey.from.label, to: (journey.points ?? []).slice(1).map((p) => p.label).join(' → ') || journey.to.label, km: fmtKm(journey.summary.km), time: journey.summary.time, modes: journey.legs.length > 1 || constraints?.travel?.length ? journey.summary.modes : MODE_INFO[journey.legs[0].mode]?.label }
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
            <span className={`ticket-brand is-${status}`}>
              <AgentAvatar agent="moderator" size="xs" /> {BRAND[status]}
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
          <span className="stub-label">Estimated total{travellers > 1 ? ', whole group' : ''}</span>
          <span className="stub-num">{cost ?? 'n/a'}</span>
          {perPerson && <span className="stub-per">about {perPerson} per person</span>}
          {share != null && (
            <>
              <div className={`budget-bar ${share > 1 ? 'is-over' : budgetDoubt ? 'is-doubt' : ''}`} role="img" aria-label={`${Math.round(share * 100)}% of the budget`}>
                <motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(share, 1) * 100}%` }} transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <span className="stub-foot">
                {budgetDoubt ? 'Stated total, ' : ''}{Math.round(share * 100)}% of the {formatCost(cap)} group budget
                {budget.basis === 'per_person' ? ` (${formatCost(budget.perPerson)} × ${budget.people})` : ''}
              </span>
              {budgetDoubt && realistic > plan.estimated_cost && (
                <span className="stub-warn">At least {formatCost(realistic)} once every leg, night and the trip home are costed</span>
              )}
            </>
          )}
          <span className="barcode" aria-hidden="true" />
        </div>
      </div>

      <Checks validation={validation} participation={participation} />

      {fromText && toText && journey.status !== 'idle' && (
        <div className="plan-detail glass">
          <span className="field-label">The journey</span>
          <Journey journey={journey} fromText={fromText} toText={toText} compact />
        </div>
      )}

      <div className="plan-detail glass">
        <span className="field-label">The plan</span>
        <RichText text={plan.description} />
        {plan.itinerary?.length > 0 && (
          <ol className="itinerary">
            {plan.itinerary.map((l, i) => (
              <li key={i}>
                <span className="it-when">Day {l.day} · {l.depart}{l.arrive ? ` → ${l.arrive_day !== l.day ? `day ${l.arrive_day}, ` : ''}${l.arrive}` : ''}</span>
                <span className="it-what"><b>{l.from_place} → {l.to_place}</b> by {MODE_INFO[l.mode]?.label.toLowerCase() ?? l.mode}{l.vehicle === 'own' ? ' (your own)' : l.vehicle === 'rental' ? ' (rented)' : ''}</span>
                <span className="it-hours">{fmtTime(l.hours)}</span>
              </li>
            ))}
          </ol>
        )}
        {breakdown.length > 0 && (
          <table className="cost-table">
            <caption>Cost breakdown{travellers > 1 ? `, whole group of ${travellers}` : ''}</caption>
            <tbody>
              {breakdown.map((c, i) => (
                <tr key={i}>
                  <th scope="row">{c.item}{c.assumption && <small className="cost-why">{c.assumption}</small>}</th>
                  <td>{formatCost(c.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th scope="row">Total</th><td>{formatCost(breakdown.reduce((n, c) => n + c.amount, 0))}</td></tr>
              {travellers > 1 && <tr className="is-per"><th scope="row">Per person</th><td>{formatCost(Math.round(breakdown.reduce((n, c) => n + c.amount, 0) / travellers))}</td></tr>}
            </tfoot>
          </table>
        )}
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
