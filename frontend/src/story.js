// Turns a finished debate into something people actually want to read in a group chat.
// Three formats: a short story (WhatsApp / Messages), a quick take (X, SMS), and plain text for email.
import { AGENTS, budgetCap, formatCost } from './agents'
import { TRAVEL } from './avatarOptions'

const EMOJI = { budget: '💸', logistics: '🧭', vibe: '✨', moderator: '⚖️' }

// Stable variety: the same plan always reads the same, different plans read differently.
function seeded(text) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (list, salt = 0) => list[Math.abs(h + salt * 7919) % list.length]
}

const OPENERS = {
  budget: ['kept it sensible', 'opened with the wallet-friendly pick', 'went practical'],
  logistics: ['checked the clock first', 'did the travel maths', 'mapped out what actually works'],
  vibe: ['dreamed a little bigger', 'went for the feeling', 'pitched the fun version'],
}
const REACTIONS = {
  flag: ['pushed back', 'raised a red flag', "wasn't having it"],
  support: ['came around', 'got on board', 'backed the idea'],
  propose: ['tried a new angle', 'countered', 'put a fresh option on the table'],
}
const ROUND_TWO = ['Round two got spicy', 'Then the gloves came off', 'Round two, the reactions', 'Then everyone hit reply']
const INTROS = ['We let the council decide.', 'We handed our plan to the council.', 'Three AI agents argued about our plan.', 'Decision made, by committee (the good kind).']

// The first sentence of a comment, short enough for a chat bubble.
export function firstLine(text, max = 120) {
  if (!text) return ''
  const s = text.trim().replace(/\s+/g, ' ')
  const cut = s.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? s
  if (cut.length <= max) return cut
  const words = cut.slice(0, max).split(' ').slice(0, -1).join(' ')
  return `${words.replace(/[,;:]$/, '')}…`
}

function winnerOf(text) {
  const first = text?.trim().split(/[\s,.:;]/)[0]?.toLowerCase()
  return AGENTS[first] && first !== 'moderator' ? first : null
}

// "Budget, because the cap was hard." -> "because the cap was hard"
function reasonOf(text, winner) {
  let r = text.trim()
  if (winner) r = r.replace(new RegExp(`^${AGENTS[winner].name}[\\s,:;.-]*`, 'i'), '')
  r = r.replace(/\.$/, '')
  return r ? r[0].toLowerCase() + r.slice(1) : ''
}

export function duels(plan) {
  return (plan?.trade_off_log ?? []).map((t) => {
    const winner = winnerOf(t.which_concern_won)
    const loser = t.agents_involved.find((a) => a !== winner) ?? null
    return { winner, loser, reason: reasonOf(t.which_concern_won, winner), issue: t.disagreement, agents: t.agents_involved }
  })
}

const short = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : formatCost(n))

export function facts({ plan, constraints, route }) {
  const out = []
  const cost = formatCost(plan.estimated_cost)
  const people = Number(constraints?.headcount) || null
  const cap = budgetCap(constraints)
  if (cost) {
    let line = `${cost}${people ? ` for ${people === 1 ? 'one' : people}` : ''}`
    if (cap) {
      const pct = Math.round((plan.estimated_cost / cap) * 100)
      line += pct <= 100 ? ` (${pct}% of the ${formatCost(cap)} budget)` : ` (${pct - 100}% over the ${formatCost(cap)} budget)`
    }
    out.push({ icon: '💰', text: line })
  }
  if (route?.from && route?.to) {
    const bits = [`${route.from} → ${route.to}`]
    if (route.km) bits.push(`~${route.km}`)
    if (route.time) bits.push(`~${route.time}`)
    if (route.modes) bits.push(route.modes)
    out.push({ icon: '📍', text: bits.join(' · ') })
  } else if (constraints?.travel?.length) {
    out.push({ icon: '🚗', text: constraints.travel.map((t) => TRAVEL.find((x) => x.id === t)?.label ?? t).join(' or ') })
  }
  if (constraints?.dates) out.push({ icon: '🗓️', text: constraints.dates })
  return out
}

/**
 * The debate as a short story. `bold` wraps text for the target app (WhatsApp uses *x*, email uses nothing).
 */
export function storyText({ plan, request, items = [], route, link, people = [], bold = (s) => `*${s}*` }) {
  const pick = seeded(`${plan.title}${request?.brief ?? ''}`)
  const turns = items.filter((i) => i.kind === 'turn')
  const order = (t) => ['budget', 'logistics', 'vibe'].indexOf(t.agent)
  const r1 = turns.filter((t) => t.round === 1).sort((a, b) => order(a) - order(b))
  const r2 = turns.filter((t) => t.round === 2).sort((a, b) => order(a) - order(b))
  const lines = []

  const who = people.length > 1 ? `${people.slice(0, -1).join(', ')} and ${people[people.length - 1]}` : people[0]
  lines.push(`🗳️ ${bold(pick(INTROS))} ${who ? `${who} asked, and here's how it went.` : "Here's how it went."}`)
  lines.push('')
  if (request?.brief) {
    lines.push(bold('The ask'))
    lines.push(`“${firstLine(request.brief, 220)}”`)
    lines.push('')
  }
  if (r1.length) {
    lines.push(bold('Round one: everyone pitched'))
    r1.forEach((t, i) => {
      const cost = t.estimated_cost != null ? `, about ${short(t.estimated_cost)}` : ''
      lines.push(`${EMOJI[t.agent]} ${AGENTS[t.agent].name} ${pick(OPENERS[t.agent], i)}: ${t.option_title}${cost}.`)
    })
    lines.push('')
  }
  if (r2.length) {
    lines.push(bold(pick(ROUND_TWO)))
    r2.forEach((t, i) => {
      lines.push(`${EMOJI[t.agent]} ${AGENTS[t.agent].name} ${pick(REACTIONS[t.stance] ?? REACTIONS.propose, i + 3)}: “${firstLine(t.commentary)}”`)
    })
    lines.push('')
  }
  lines.push(`${bold('The verdict')} ⚖️`)
  lines.push(`👉 ${bold(plan.title)}`)
  lines.push(plan.summary)
  for (const f of facts({ plan, constraints: request?.constraints, route })) lines.push(`${f.icon} ${f.text}`)
  const ds = duels(plan).filter((d) => d.winner)
  if (ds.length) {
    lines.push('')
    lines.push(bold('Who won what'))
    for (const d of ds) lines.push(`🏆 ${AGENTS[d.winner].name}${d.loser ? ` beat ${AGENTS[d.loser].name}` : ''}${d.reason ? `, ${d.reason}` : ''}.`)
  }
  lines.push('')
  lines.push(link ? `Read the whole debate 👇\n${link}` : 'Planned with Council')
  return lines.join('\n')
}

// One or two sentences: for X, SMS, or a status update.
export function quickTake({ plan, request, route, link }) {
  const pick = seeded(plan.title)
  const cost = plan.estimated_cost != null ? short(plan.estimated_cost) : null
  const people = Number(request?.constraints?.headcount) || null
  const d = duels(plan).find((x) => x.winner && x.loser)
  const lead = pick(['The council has spoken', 'Plan locked', 'Verdict is in', "It's decided"])
  const parts = [`🗳️ ${lead}: ${plan.title}`]
  const detail = [cost && `${cost}${people > 1 ? ` for ${people}` : ''}`, route?.from && route?.to && `${route.from} → ${route.to}`].filter(Boolean).join(', ')
  if (detail) parts[0] += ` (${detail})`
  parts[0] += '.'
  if (d) parts.push(`${AGENTS[d.winner].name} beat ${AGENTS[d.loser].name} on the big call.`)
  if (link) parts.push(link)
  return parts.join(' ')
}

export function emailText(args) {
  return {
    subject: `We have a plan: ${args.plan.title}`,
    body: storyText({ ...args, bold: (s) => s }).replace(/[*_]/g, ''),
  }
}

// Each specialist's pitch (from `round`, else their latest), one short line each, for the share card.
export function pitches(items, round = null) {
  const turns = items.filter((i) => i.kind === 'turn')
  return ['budget', 'logistics', 'vibe']
    .map((a) => {
      const mine = turns.filter((x) => x.agent === a)
      const t = (round ? mine.find((x) => x.round === round) : null) ?? mine.sort((x, y) => y.round - x.round)[0]
      return t ? { agent: a, title: t.option_title, cost: t.estimated_cost, stance: t.stance, line: firstLine(t.commentary, 90) } : null
    })
    .filter(Boolean)
}
