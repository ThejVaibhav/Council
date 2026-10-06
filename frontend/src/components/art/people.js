export const SKIN = ['#f6d3b3', '#e8b48a', '#c98b5e', '#9a6340', '#6a4128']
export const HAIR = ['#2a1d16', '#5a3825', '#141110', '#a8642a', '#d9b26f']

const HAIR_FOR = { female: 'long', male: 'short', neutral: 'bob' }

// The people who travel with you, in the order they join the picture.
export const COMPANIONS = [
  { look: 'female', hair: 'bun', skin: 2, hairColor: 0 },
  { look: 'male', hair: 'curly', skin: 3, hairColor: 2 },
  { look: 'female', hair: 'long', skin: 1, hairColor: 3 },
  { look: 'male', hair: 'short', skin: 4, hairColor: 2, beard: true },
  { look: 'neutral', hair: 'bob', skin: 0, hairColor: 4 },
]

export function userPerson(profile) {
  const look = profile?.look ?? 'neutral'
  return { look, hair: HAIR_FOR[look], skin: profile?.skin ?? 1, hairColor: look === 'female' ? 1 : 0, beard: false }
}

export function partnerFor(user) {
  return user.look === 'male' ? { look: 'female', hair: 'long', skin: 2, hairColor: 0 } : { look: 'male', hair: 'short', skin: 3, hairColor: 2, beard: true }
}

