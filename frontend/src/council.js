// Who took part in a debate and how much they agreed, worked out from the transcript.
// Mirrors participation() in the server's app/validation.py, so old plans without a stored check read the same.
import { SPECIALISTS } from './agents'

const statusOf = (items, agent, round) => {
  if (items.some((i) => i.kind === 'turn' && i.agent === agent && i.round === round)) return 'responded'
  const miss = items.find((i) => i.kind === 'missing' && i.agent === agent && i.round === round)
  if (!miss) return 'missing'
  return miss.reason === 'timeout' || /timed out|timeout/i.test(miss.error ?? '') ? 'timed_out' : 'failed'
}

export function participationFromItems(items = []) {
  const agents = SPECIALISTS.map((agent) => {
    const round1 = statusOf(items, agent, 1)
    const round2 = statusOf(items, agent, 2)
    return { agent, round1, round2, counted: round2 === 'responded' }
  })
  const final = items.filter((i) => i.kind === 'turn' && i.round === 2)
  const agreeing = final.filter((t) => t.stance !== 'flag').length
  const consensus = final.length === 3 && agreeing === 3 ? 'unanimous' : agreeing >= 2 ? 'majority' : 'split'
  return { agents, responded: final.length, agreeing, consensus }
}

export function consensusLabel(p) {
  if (!p) return null
  if (p.consensus === 'unanimous') return { tone: 'good', text: 'Unanimous: all three agents backed the final direction' }
  if (p.consensus === 'majority') {
    const outOf = p.responded < 3 ? `${p.agreeing} of the ${p.responded} agents who answered` : `${p.agreeing} of 3 agents`
    return { tone: 'mid', text: `Majority decision: ${outOf} agreed` }
  }
  return { tone: 'low', text: 'Split council: the Moderator made the call without a majority' }
}

export const STATUS_TEXT = {
  responded: 'answered',
  timed_out: 'timed out',
  failed: 'failed',
  missing: 'no reply',
}

/** Splits a transcript into its rounds. */
export function roundsOf(items) {
  const out = []
  for (const it of items) {
    if (it.kind === 'round') out.push({ round: it.round, items: [] })
    else if (out.length) out[out.length - 1].items.push(it)
    else out.push({ round: it.round ?? 1, items: [it] })
  }
  return out
}
