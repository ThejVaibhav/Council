import { describe, expect, it } from 'vitest'
import { parseTrip } from '../trip'

const cases = [
  ['I am travelling to kadapa in bus, then from kadapa i will go to vizag in car, from vizag i will travel in bike to araku.', ['Kadapa', 'Visakhapatnam', 'Araku Valley'], ['bus_state', 'own_car', 'bike']],
  ["I am going to vizag and then from there to Araku, 1st i'll go by bike and then use car to araku", ['Visakhapatnam', 'Araku Valley'], ['bike', 'own_car']],
  ['From Bangalore to Goa by train, then a cab to Gokarna', ['Goa', 'Gokarna'], ['train', 'cab']],
  ['Take a flight to Delhi, then train to Agra and a cab to Jaipur', ['Delhi', 'Agra', 'Jaipur'], ['flight', 'train', 'cab']],
  ['Bus to Mysuru, from Mysuru by car to Ooty', ['Mysuru', 'Ooty'], ['bus_state', 'own_car']],
  ['Train till Vijayawada, from there bus to Vizag, then bike to Araku', ['Vijayawada', 'Visakhapatnam', 'Araku Valley'], ['train', 'bus_state', 'bike']],
  ['Going to Ooty via Mysuru by car', ['Mysuru', 'Ooty'], ['own_car', 'own_car']],
  ['Sleeper bus to Goa, then rent a scooter to Gokarna', ['Goa', 'Gokarna'], ['bus_private', 'bike']],
]

describe('parseTrip', () => {
  it.each(cases)('%s', (text, stops, modes) => {
    const r = parseTrip(text)
    expect(r.stops).toEqual(stops)
    expect(r.legModes).toEqual(modes)
  })

  it('never turns activities into stops', () => {
    const r = parseTrip("I'm travelling from Bengaluru to Coorg by car for a 2-day weekend trip with 3 friends. We want to visit waterfalls, explore coffee plantations, enjoy scenic viewpoints, and stay at a budget-friendly resort.")
    expect(r.start).toBe('Bengaluru')
    expect(r.stops).toEqual(['Coorg'])
    expect(r.legModes).toEqual(['own_car'])
  })

  it.each(['We want to go to the waterfalls', 'Drive to a resort near the beach', 'going to coffee plantations by car', 'want to relax somewhere quiet'])('no place in "%s"', (text) => {
    expect(parseTrip(text).stops).toEqual([])
  })

  it('still picks up unknown towns after "to" and "from"', () => {
    expect(parseTrip('going from Hyderabad to Pochampally by car').stops).toEqual(['Pochampally'])
  })
})
