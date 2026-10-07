// Character options. Must stay in step with backend/app/avatar.py.

export const SKIN = ['#f3d2b3', '#e9bf98', '#d9a57a', '#c68a5c', '#b0764c', '#9a643f', '#7d4f33', '#5c3a26']
export const HAIR_COLORS = ['#1c1311', '#3a2519', '#5a3825', '#7f4f2e', '#a8683a', '#cfa45f', '#e3cf9f', '#9a948c', '#a8455e', '#3e5a8a']
export const TOP_COLORS = ['#a8553a', '#3e6b5a', '#d99a2b', '#4a5f8a', '#9b5a72', '#6f8a6b', '#2a2d38', '#efe3c8', '#c2443a', '#7a6aa8', '#e39aa0', '#5aa0b4']
export const BOTTOM_COLORS = ['#3a4256', '#232227', '#7a6450', '#5f6646', '#8fa68a', '#cdb994', '#7d2a35', '#ece0c8']
export const SHOE_COLORS = ['#2a2420', '#f3eee4', '#8a5a3a', '#c2443a', '#4a5f8a', '#3e6b5a']

export const OPTIONS = {
  body: [
    { id: 'female', label: 'Woman' },
    { id: 'male', label: 'Man' },
  ],
  hair: ['short', 'long', 'bun', 'ponytail', 'bob', 'curly', 'afro', 'waves', 'buzz', 'bald'],
  eyes: ['dots', 'happy', 'lashes', 'sleepy'],
  brows: ['none', 'soft', 'bold'],
  facialHair: ['none', 'stubble', 'beard', 'mustache'],
  glasses: ['none', 'round', 'square', 'shades'],
  headwear: ['none', 'cap', 'beanie', 'bucket', 'headband'],
  top: ['tee', 'hoodie', 'shirt', 'jacket', 'dress'],
  bottom: ['pants', 'shorts', 'skirt'],
}

// What each body can pick in the editor.
export const BY_BODY = {
  male: { hair: ['short', 'buzz', 'curly', 'waves', 'afro', 'bald'], facialHair: OPTIONS.facialHair, top: ['tee', 'hoodie', 'shirt', 'jacket'], bottom: ['pants', 'shorts'] },
  female: { hair: ['long', 'bob', 'ponytail', 'bun', 'curly', 'waves', 'afro'], facialHair: ['none'], top: ['tee', 'hoodie', 'shirt', 'jacket', 'dress'], bottom: ['pants', 'shorts', 'skirt'] },
}
export const bodyOf = (a) => (a?.body === 'female' ? 'female' : 'male')
export const optionsFor = (a) => BY_BODY[bodyOf(a)]

// Keep a character's choices valid for its body (older characters may say "neutral").
export function fitToBody(a) {
  const body = bodyOf(a)
  const o = BY_BODY[body]
  return {
    ...a,
    body,
    hair: o.hair.includes(a.hair) ? a.hair : o.hair[0],
    facialHair: o.facialHair.includes(a.facialHair) ? a.facialHair : 'none',
    top: o.top.includes(a.top) ? a.top : 'tee',
    bottom: o.bottom.includes(a.bottom) ? a.bottom : 'pants',
  }
}

export const LABELS = {
  short: 'Short', long: 'Long', bun: 'Bun', ponytail: 'Ponytail', bob: 'Bob', curly: 'Curly', afro: 'Afro', waves: 'Waves', buzz: 'Buzz', bald: 'Bald',
  dots: 'Classic', happy: 'Smiling', lashes: 'Lashes', sleepy: 'Sleepy',
  none: 'None', soft: 'Soft', bold: 'Bold', stubble: 'Stubble', beard: 'Beard', mustache: 'Mustache',
  round: 'Round', square: 'Square', shades: 'Shades', cap: 'Cap', beanie: 'Beanie', bucket: 'Bucket hat', headband: 'Headband',
  tee: 'T-shirt', hoodie: 'Hoodie', shirt: 'Shirt', jacket: 'Jacket', dress: 'Dress', pants: 'Trousers', shorts: 'Shorts', skirt: 'Skirt',
}

export const PET_BREEDS = {
  dog: ['Indie', 'Labrador', 'Golden Retriever', 'Beagle', 'Pug', 'German Shepherd', 'Husky', 'Shih Tzu', 'Dachshund', 'Pomeranian'],
  cat: ['Indie', 'Persian', 'Siamese', 'Maine Coon', 'Bengal', 'British Shorthair'],
  rabbit: ['Lop', 'Lionhead', 'Dutch'],
}

export const DEFAULT_AVATAR = {
  body: 'male', skin: 4, hair: 'short', hairColor: 0, eyes: 'dots', brows: 'soft', facialHair: 'none', glasses: 'none',
  headwear: 'none', top: 'tee', topColor: 7, bottom: 'pants', bottomColor: 0, shoeColor: 1,
  pet: { kind: 'none', breed: '', name: '' },
}

export function withDefaults(a) {
  return { ...DEFAULT_AVATAR, ...(a || {}), pet: { ...DEFAULT_AVATAR.pet, ...(a?.pet || {}) } }
}

// A sensible starting look for a body choice, used when someone picks a body in the editor for the first time.
export function presetFor(body, base = DEFAULT_AVATAR) {
  if (body === 'female') return { ...base, body, hair: 'curly', facialHair: 'none', glasses: 'round', top: 'tee', bottom: 'pants', bottomColor: 4 }
  if (body === 'male') return { ...base, body, hair: 'short', facialHair: 'beard', top: 'tee', bottom: 'pants', bottomColor: 2 }
  return { ...base, body, hair: 'bob', facialHair: 'none' }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function shuffleAvatar(current) {
  const body = bodyOf(current ?? { body: pick(['female', 'male']) })
  const hairPool = BY_BODY[bodyOf({ body })].hair
  const top = body === 'female' ? pick(OPTIONS.top) : pick(['tee', 'hoodie', 'shirt', 'jacket'])
  return withDefaults({
    ...current,
    body,
    skin: Math.floor(Math.random() * SKIN.length),
    hair: pick(hairPool),
    hairColor: Math.floor(Math.random() * 7),
    eyes: pick(OPTIONS.eyes),
    brows: pick(['soft', 'soft', 'bold', 'none']),
    facialHair: body === 'male' ? pick(OPTIONS.facialHair) : 'none',
    glasses: pick(['none', 'none', 'round', 'square', 'shades']),
    headwear: pick(['none', 'none', 'cap', 'beanie', 'bucket', 'headband']),
    top,
    topColor: Math.floor(Math.random() * TOP_COLORS.length),
    bottom: top === 'dress' ? 'pants' : pick(body === 'male' ? ['pants', 'shorts'] : OPTIONS.bottom),
    bottomColor: Math.floor(Math.random() * BOTTOM_COLORS.length),
    shoeColor: Math.floor(Math.random() * SHOE_COLORS.length),
  })
}

// Stand-ins who fill a group beyond the friends actually in the plan.
export const COMPANIONS = [
  withDefaults({ body: 'female', skin: 3, hair: 'curly', hairColor: 0, eyes: 'happy', glasses: 'round', top: 'tee', topColor: 7, bottomColor: 4 }),
  withDefaults({ body: 'male', skin: 5, hair: 'short', hairColor: 0, facialHair: 'beard', top: 'shirt', topColor: 1, bottomColor: 5 }),
  withDefaults({ body: 'female', skin: 1, hair: 'ponytail', hairColor: 3, eyes: 'lashes', top: 'hoodie', topColor: 9 }),
  withDefaults({ body: 'male', skin: 7, hair: 'buzz', hairColor: 0, facialHair: 'stubble', top: 'jacket', topColor: 3, bottomColor: 2 }),
  withDefaults({ body: 'female', skin: 4, hair: 'bob', hairColor: 1, top: 'shirt', topColor: 5 }),
]

export function partnerFor(a) {
  return a.body === 'female'
    ? withDefaults({ body: 'male', skin: 4, hair: 'short', hairColor: 0, facialHair: 'beard', top: 'shirt', topColor: 1, bottomColor: 5 })
    : withDefaults({ body: 'female', skin: 3, hair: 'curly', hairColor: 0, eyes: 'lashes', glasses: 'round', top: 'tee', topColor: 7, bottomColor: 4 })
}

export const TRAVEL = [
  { id: 'own_car', label: 'Own car', icon: 'car' },
  { id: 'rental', label: 'Self-drive', icon: 'key' },
  { id: 'bike', label: 'Bike', icon: 'bike' },
  { id: 'cab', label: 'Cab', icon: 'cab' },
  { id: 'bus_state', label: 'State bus', icon: 'bus' },
  { id: 'bus_private', label: 'Private / sleeper bus', icon: 'bus' },
  { id: 'train', label: 'Train', icon: 'train' },
  { id: 'flight', label: 'Flight', icon: 'plane' },
  { id: 'walk', label: 'Local only', icon: 'walk' },
]
