export const AGENTS = {
  budget: { name: 'Budget', role: 'Keeps the plan inside your budget' },
  logistics: { name: 'Logistics', role: 'Checks travel time, timing and group size' },
  vibe: { name: 'Vibe', role: 'Protects the experience you asked for' },
  moderator: { name: 'Moderator', role: 'Weighs the debate and makes the call' },
}

export const SPECIALISTS = ['budget', 'logistics', 'vibe']
export const SEATS = ['budget', 'logistics', 'vibe', 'moderator']

export const STANCE_LABEL = { propose: 'Proposes', support: 'Agrees', flag: 'Pushes back' }

export const ROUND_LABEL = {
  1: { title: 'Round 1', subtitle: 'Proposals' },
  2: { title: 'Round 2', subtitle: 'Reactions' },
}

export const formatCost = (c) => (c == null ? null : `₹${Math.round(c).toLocaleString('en-IN')}`)
