import { describe, expect, it } from 'vitest'
import { budgetCap, budgetInfo } from '../agents'
import { participationFromItems, consensusLabel } from '../council'

describe('budgetInfo', () => {
  it('treats the amount as the group total by default', () => {
    expect(budgetInfo({ budget: '8000 INR', headcount: 4 })).toEqual({ total: 8000, perPerson: 2000, basis: 'total', people: 4 })
  })
  it('multiplies a per-person budget by the group size', () => {
    expect(budgetInfo({ budget: '2000', headcount: 4, budget_basis: 'per_person' })).toMatchObject({ total: 8000, perPerson: 2000 })
    expect(budgetCap({ budget: '1,500 each', headcount: 8 })).toBe(12000)
  })
  it('understands k and lakh, and ignores budgets with no number', () => {
    expect(budgetCap({ budget: '8k' })).toBe(8000)
    expect(budgetCap({ budget: '1.5 lakh' })).toBe(150000)
    expect(budgetInfo({ budget: 'flexible' })).toBeNull()
  })
})

describe('participation', () => {
  const turn = (agent, round, stance = 'propose') => ({ kind: 'turn', agent, round, stance })
  it('marks a round-two timeout as not counted and calls it a majority', () => {
    const items = [turn('budget', 1), turn('logistics', 1), turn('vibe', 1), turn('budget', 2, 'support'), { kind: 'missing', agent: 'logistics', round: 2, error: 'timed out after 45s' }, turn('vibe', 2)]
    const p = participationFromItems(items)
    expect(p.agents.find((a) => a.agent === 'logistics')).toMatchObject({ round1: 'responded', round2: 'timed_out', counted: false })
    expect(p.consensus).toBe('majority')
    expect(consensusLabel(p).text).toMatch(/2 of the 2 agents who answered/)
  })
  it('is unanimous only when all three answer without pushing back', () => {
    const all = ['budget', 'logistics', 'vibe'].flatMap((a) => [turn(a, 1), turn(a, 2, 'support')])
    expect(participationFromItems(all).consensus).toBe('unanimous')
    const flagged = all.map((t) => (t.agent === 'vibe' && t.round === 2 ? { ...t, stance: 'flag' } : t))
    expect(participationFromItems(flagged).consensus).toBe('majority')
  })
})
