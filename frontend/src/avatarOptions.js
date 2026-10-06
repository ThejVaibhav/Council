// Character options. Must stay in step with backend/app/avatar.py.

export const SKIN = ['#fde0c8', '#f6d3b3', '#e8b48a', '#d9a06f', '#c98b5e', '#a8714a', '#8a5a3a', '#5e3b24']
export const HAIR_COLORS = ['#1f1814', '#3b2619', '#5a3825', '#8a5530', '#b5713a', '#d9b26f', '#e8d3a8', '#9a9a9a', '#c2416b', '#3f5fbf']
export const TOP_COLORS = ['#e4572e', '#2f6f73', '#e9b44c', '#5b6bbf', '#a85c7a', '#3a7d44', '#1f2a44', '#f2f0ea', '#d64545', '#7c4dff', '#ff8fab', '#5bc0eb']
export const BOTTOM_COLORS = ['#2f3a4a', '#1c1c22', '#6b5a4a', '#3d4f3d', '#4f6d8f', '#c9b79c', '#8a3b3b', '#e7e1d6']
export const SHOE_COLORS = ['#2b2320', '#f4f1ea', '#8a5a3a', '#d64545', '#3a5ba0', '#2f6f4f']

export const OPTIONS = {
  body: [
    { id: 'female', label: 'Woman' },
    { id: 'male', label: 'Man' },
    { id: 'neutral', label: 'Prefer not to say' },
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
  body: 'neutral', skin: 2, hair: 'short', hairColor: 1, eyes: 'dots', brows: 'soft', facialHair: 'none', glasses: 'none',
  headwear: 'none', top: 'tee', topColor: 0, bottom: 'pants', bottomColor: 0, shoeColor: 0,
  pet: { kind: 'none', breed: '', name: '' },
}

export function withDefaults(a) {
  return { ...DEFAULT_AVATAR, ...(a || {}), pet: { ...DEFAULT_AVATAR.pet, ...(a?.pet || {}) } }
}

// A sensible starting look for a body choice, used when someone picks a body in the editor for the first time.
export function presetFor(body, base = DEFAULT_AVATAR) {
  if (body === 'female') return { ...base, body, hair: 'long', facialHair: 'none', top: 'tee', bottom: 'pants' }
  if (body === 'male') return { ...base, body, hair: 'short', top: 'tee', bottom: 'pants' }
  return { ...base, body, hair: 'bob', facialHair: 'none' }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function shuffleAvatar(current) {
  const body = current?.body ?? pick(['female', 'male', 'neutral'])
  const hairPool = body === 'male' ? ['short', 'curly', 'afro', 'waves', 'buzz', 'bald', 'bun'] : body === 'female' ? ['long', 'bun', 'ponytail', 'bob', 'curly', 'afro', 'waves'] : OPTIONS.hair
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
  withDefaults({ body: 'female', skin: 4, hair: 'bun', hairColor: 0, eyes: 'happy', top: 'tee' }),
  withDefaults({ body: 'male', skin: 5, hair: 'curly', hairColor: 0, top: 'hoodie' }),
  withDefaults({ body: 'female', skin: 1, hair: 'ponytail', hairColor: 4, eyes: 'lashes' }),
  withDefaults({ body: 'male', skin: 7, hair: 'short', hairColor: 0, facialHair: 'beard', top: 'shirt' }),
  withDefaults({ body: 'neutral', skin: 0, hair: 'bob', hairColor: 5 }),
]

export function partnerFor(a) {
  return a.body === 'male'
    ? withDefaults({ body: 'female', skin: 3, hair: 'long', hairColor: 0, eyes: 'lashes', top: 'tee' })
    : withDefaults({ body: 'male', skin: 4, hair: 'short', hairColor: 0, facialHair: 'beard', top: 'shirt' })
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
