export const AGENTS = {
  budget: { name: 'Budget', initial: 'B', role: 'Keeps it inside your budget' },
  logistics: { name: 'Logistics', initial: 'L', role: 'Checks travel time and timing' },
  vibe: { name: 'Vibe', initial: 'V', role: 'Protects the experience you want' },
  moderator: { name: 'Moderator', initial: 'M', role: 'Makes the final call' },
}

export const SPECIALISTS = ['budget', 'logistics', 'vibe']
export const MEMBERS = ['budget', 'logistics', 'vibe', 'moderator']

export const STANCE_LABEL = { propose: 'Proposed', support: 'Agreed', flag: 'Pushed back' }

export const ROUND_LABEL = { 1: 'Round 1 · first takes', 2: 'Round 2 · reactions' }

export const formatCost = (c) => (c == null ? null : `₹${Math.round(c).toLocaleString('en-IN')}`)

const listNames = (agents) => {
  const names = agents.map((a) => AGENTS[a].name)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// The header subtitle: who is typing right now, the way a group chat shows it.
export function chatStatus({ status, pending, items }) {
  if (status === 'idle') return 'Budget, Logistics, Vibe and Moderator'
  if (status === 'moderating') return 'Moderator is deciding…'
  if (status === 'done') return 'Decision pinned'
  if (status === 'error') return 'Debate stopped'
  if (pending.length) return `${listNames(pending)} ${pending.length === 1 ? 'is' : 'are'} typing…`
  return items.length ? 'Reading the replies…' : 'Starting…'
}

// The group's budget, worked out the same way as the server's check (app/validation.py):
// { total, perPerson, basis: 'total' | 'per_person', people } in rupees, or null without a usable amount.
export function budgetInfo(constraints) {
  if (!constraints?.budget) return null
  const raw = String(constraints.budget).toLowerCase().replace(/,/g, '')
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(k|lakh|l)?\b/)
  if (!m) return null
  const amount = parseFloat(m[1]) * ({ k: 1000, lakh: 100000, l: 100000 }[m[2]] ?? 1)
  if (!(amount > 0)) return null
  const people = Math.max(1, Number(constraints.headcount) || 1)
  const basis = ['total', 'per_person'].includes(constraints.budget_basis)
    ? constraints.budget_basis
    : /per\s*(person|head)|\beach\b|\/\s*person/.test(raw) ? 'per_person' : 'total'
  const total = basis === 'per_person' ? amount * people : amount
  return { total, perPerson: total / people, basis, people }
}

// Budget cap for the whole group, so the verdict can show how much of it the plan uses.
export function budgetCap(constraints) {
  return budgetInfo(constraints)?.total ?? null
}
