import { describe, expect, it } from 'vitest'
import { legHours } from '../geo'

// Same cases as backend/app/prices.py, so the route card and the server's check agree.
describe('legHours', () => {
  it('slows the ghat climb into a hill stop and adds breaks', () => {
    expect(legHours(115, 'bike', 'Araku Valley')).toBeCloseTo(3.66, 1)
    expect(legHours(265, 'own_car', 'Coorg')).toBeCloseTo(5.71, 1)
  })
  it('keeps long bus legs long', () => {
    expect(legHours(715, 'bus_state', 'Visakhapatnam')).toBeCloseTo(17.02, 1)
  })
  it('adds airport time to flights', () => {
    expect(legHours(650, 'flight', 'Goa')).toBeCloseTo(3.5, 1)
  })
})
