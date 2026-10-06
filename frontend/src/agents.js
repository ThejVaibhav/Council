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

// Budget cap in rupees from the constraints, so the verdict can show how much of it the plan uses.
export function budgetCap(constraints) {
  if (!constraints?.budget) return null
  const raw = String(constraints.budget).toLowerCase().replace(/,/g, '')
  const m = raw.match(/(\d+(\.\d+)?)\s*(k)?/)
  if (!m) return null
  let n = parseFloat(m[1]) * (m[3] ? 1000 : 1)
  if (/per\s*(person|head)|each/.test(raw)) {
    if (!constraints.headcount) return null
    n *= Number(constraints.headcount)
  }
  return n > 0 ? n : null
}
