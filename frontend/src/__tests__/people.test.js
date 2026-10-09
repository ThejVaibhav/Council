import { describe, expect, it } from 'vitest'
import { detectPeople } from '../scenes'

describe('detectPeople', () => {
  it.each([
    ['Date night for two in Bengaluru this Friday. One of us has a 6 am flight', 2],
    ['Four of us want a beach trip', 4],
    ['Birthday outing for eight people in Bengaluru', 8],
    ['A two day weekend trip to the hills for three friends', 3],
    ['solo trip to the hills', 1],
    ['One of us is vegetarian, we are six friends', 6],
    ['dinner for 2', 2],
    ["I'm travelling from Bengaluru to Coorg by car for a 2-day weekend trip with 3 friends.", 4],
    ['me and 2 friends want to go to Goa', 3],
    ['road trip with my 4 cousins', 5],
  ])('%s -> %i', (text, n) => {
    expect(detectPeople(text)).toBe(n)
  })
})
