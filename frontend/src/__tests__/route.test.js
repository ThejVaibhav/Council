import { describe, expect, it } from 'vitest'
import { checkRoute } from '../geo'
import { googleMapsUrl } from '../mapsLink'

const BLR = { lat: 12.97, lon: 77.59, label: 'Bengaluru', country: 'in' }
const COORG = { lat: 12.42, lon: 75.74, label: 'Coorg', text: 'Coorg', country: 'in', mode: 'own_car' }
const BURKINA = { lat: 12.37, lon: -1.52, label: 'Waterfalls, Burkina Faso', text: 'Waterfalls', country: 'bf', mode: 'own_car' }
const LEH = { lat: 34.15, lon: 77.58, label: 'Leh', text: 'Leh', country: 'in', mode: 'bike' }

describe('checkRoute', () => {
  it('keeps a sensible route', () => {
    const r = checkRoute([BLR, COORG])
    expect(r.points).toHaveLength(2)
    expect(r.problems).toEqual([])
  })

  it('drops a stop matched in another country and says so', () => {
    const r = checkRoute([BLR, COORG, BURKINA])
    expect(r.points.map((p) => p.label)).toEqual(['Bengaluru', 'Coorg'])
    expect(r.problems[0].text).toBe('Waterfalls')
    expect(r.problems[0].reason).toMatch(/another country/)
  })

  it('drops a stop thousands of km away even without a country', () => {
    const r = checkRoute([BLR, { ...BURKINA, country: null }])
    expect(r.points).toHaveLength(1)
    expect(r.problems[0].reason).toMatch(/km away/)
  })

  it('rejects an impossible road leg but allows the same hop by flight', () => {
    expect(checkRoute([BLR, LEH]).problems[0].reason).toMatch(/too far for one leg by bike/)
    expect(checkRoute([BLR, { ...LEH, mode: 'flight' }]).problems).toEqual([])
  })
})

describe('googleMapsUrl', () => {
  it('builds directions through every stop without an API key', () => {
    const url = new URL(googleMapsUrl([BLR, { ...COORG }, { lat: 12.3, lon: 76.64, label: 'Mysuru' }], [{ mode: 'own_car' }, { mode: 'own_car' }]))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('origin')).toBe('Bengaluru')
    expect(url.searchParams.get('destination')).toBe('Mysuru')
    expect(url.searchParams.get('waypoints')).toBe('Coorg')
    expect(url.searchParams.has('key')).toBe(false)
  })
})
