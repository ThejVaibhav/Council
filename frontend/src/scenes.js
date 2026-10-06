// Scenes: the world behind the planner changes with what the brief is about.
// Each scene sets a palette, a ground layer, floating objects, and what the crew wears.

const kw = (...words) => words

export const SCENES = {
  everyday: {
    label: 'Open road',
    tagline: 'Where are we going?',
    keywords: [],
    palette: { top: '#f7f2ea', bottom: '#efe4d3', ink: '#231d17', soft: '#6b6157', accent: '#d9572b', accentInk: '#ffffff', card: 'rgba(255,252,247,0.78)', line: 'rgba(60,40,20,0.12)', dark: false },
    ground: 'horizon',
    particles: [
      { icon: 'cloud', count: 4, motion: 'drift', size: [60, 110] },
      { icon: 'plane', count: 2, motion: 'drift', size: [26, 34] },
      { icon: 'pin', count: 3, motion: 'bob', size: [18, 26] },
      { icon: 'sparkle', count: 4, motion: 'twinkle', size: [10, 16] },
    ],
    outfit: { shirts: ['#d9572b', '#2f6f73', '#e9b44c', '#5b6bbf', '#a85c7a'], pants: ['#2f3a4a', '#6b5a4a', '#3d4f3d'], gear: 'backpack' },
  },
  romance: {
    label: 'Date night',
    tagline: 'Make it a night to remember.',
    keywords: kw('date', 'date night', 'dinner date', 'anniversary', 'valentine', 'romantic', 'romance', 'girlfriend', 'boyfriend', 'wife', 'husband', 'proposal', 'propose', 'honeymoon', 'candlelight', 'candle light', 'couple'),
    palette: { top: '#2a0d1e', bottom: '#5e1a3c', ink: '#fdeef3', soft: '#e6b6c7', accent: '#ff8fb1', accentInk: '#3a0b22', card: 'rgba(48,14,34,0.62)', line: 'rgba(255,200,220,0.16)', dark: true },
    ground: 'bokeh',
    particles: [
      { icon: 'heart', count: 12, motion: 'rise', size: [14, 30] },
      { icon: 'rose', count: 3, motion: 'bob', size: [26, 34] },
      { icon: 'candle', count: 2, motion: 'bob', size: [24, 30] },
      { icon: 'sparkle', count: 8, motion: 'twinkle', size: [8, 14] },
    ],
    outfit: { shirts: ['#7a1f3d', '#1e1e2a', '#c0446b', '#3b2a4a', '#e8c1c5'], pants: ['#15121a', '#2a2230'], gear: 'rose', dress: true },
  },
  beach: {
    label: 'Beach day',
    tagline: 'Salt, sand and a plan.',
    keywords: kw('beach', 'beaches', 'sea', 'seaside', 'coast', 'coastal', 'goa', 'gokarna', 'varkala', 'pondicherry', 'puducherry', 'island', 'andaman', 'surf', 'surfing', 'snorkel*', 'scuba', 'shore', 'ocean', 'lagoon', 'swim*'),
    palette: { top: '#bfe9f5', bottom: '#fff1d6', ink: '#0d3a4a', soft: '#3f6b78', accent: '#ff7a59', accentInk: '#ffffff', card: 'rgba(255,255,255,0.74)', line: 'rgba(13,58,74,0.14)', dark: false },
    ground: 'waves',
    particles: [
      { icon: 'cap', count: 2, motion: 'bob', size: [30, 38] },
      { icon: 'shorts', count: 2, motion: 'bob', size: [28, 36] },
      { icon: 'flipflop', count: 2, motion: 'bob', size: [22, 28] },
      { icon: 'crab', count: 2, motion: 'bob', size: [26, 34] },
      { icon: 'prawn', count: 2, motion: 'bob', size: [24, 30] },
      { icon: 'coconut', count: 2, motion: 'bob', size: [28, 34] },
      { icon: 'shell', count: 2, motion: 'bob', size: [18, 24] },
      { icon: 'cloud', count: 3, motion: 'drift', size: [60, 100] },
    ],
    outfit: { shirts: ['#ff7a59', '#2ec4b6', '#ffd166', '#5b8def', '#f28ab2'], pants: ['#2a6f97', '#e9c46a', '#264653'], gear: 'beach', shorts: true, hat: 'cap', shades: true },
  },
  mountains: {
    label: 'Into the hills',
    tagline: 'Up where the air is slower.',
    keywords: kw('hill', 'hills', 'hill station', 'mountain', 'mountains', 'trek', 'trekking', 'hike', 'hiking', 'coorg', 'chikmagalur', 'munnar', 'ooty', 'kodaikanal', 'wayanad', 'manali', 'shimla', 'himalaya*', 'valley', 'waterfall*', 'forest', 'nature', 'estate', 'plantation', 'sakleshpur'),
    palette: { top: '#dceadb', bottom: '#f4efe2', ink: '#1d3324', soft: '#4d6654', accent: '#e07a2e', accentInk: '#ffffff', card: 'rgba(255,255,250,0.74)', line: 'rgba(29,51,36,0.14)', dark: false },
    ground: 'hills',
    particles: [
      { icon: 'bird', count: 5, motion: 'drift', size: [20, 30] },
      { icon: 'leaf', count: 6, motion: 'fall', size: [14, 22] },
      { icon: 'cloud', count: 3, motion: 'drift', size: [70, 110] },
      { icon: 'coffee', count: 1, motion: 'bob', size: [26, 30] },
    ],
    outfit: { shirts: ['#e07a2e', '#3f7d58', '#c9a227', '#4f6d8f', '#9b4d3a'], pants: ['#3b3a36', '#5b4a3a', '#2f4a3a'], gear: 'backpack', hat: 'beanie' },
  },
  camping: {
    label: 'Under the stars',
    tagline: 'Pitch the tent. Plan the night.',
    keywords: kw('camp', 'camping', 'tent', 'bonfire', 'campfire', 'stargaz*', 'glamping', 'night sky'),
    palette: { top: '#0e1530', bottom: '#2b2452', ink: '#eef0ff', soft: '#aab0d6', accent: '#ffb347', accentInk: '#2a1600', card: 'rgba(18,20,48,0.6)', line: 'rgba(200,210,255,0.14)', dark: true },
    ground: 'camp',
    particles: [
      { icon: 'star', count: 16, motion: 'twinkle', size: [6, 14] },
      { icon: 'firefly', count: 8, motion: 'bob', size: [8, 12] },
    ],
    outfit: { shirts: ['#c2553a', '#3f6b4f', '#d9a441', '#5163a8', '#8a4e7a'], pants: ['#2b2a33', '#3d3a2f'], gear: 'backpack', hat: 'beanie' },
  },
  snow: {
    label: 'Snow trip',
    tagline: 'Wrap up. It is going to be good.',
    keywords: kw('snow', 'snowfall', 'ski', 'skiing', 'kashmir', 'gulmarg', 'auli', 'winter', 'sled*', 'ice'),
    palette: { top: '#e3eef9', bottom: '#ffffff', ink: '#1b2b44', soft: '#53657f', accent: '#3e7bd6', accentInk: '#ffffff', card: 'rgba(255,255,255,0.78)', line: 'rgba(27,43,68,0.12)', dark: false },
    ground: 'snow',
    particles: [{ icon: 'snowflake', count: 22, motion: 'fall', size: [10, 20] }],
    outfit: { shirts: ['#d64545', '#3e7bd6', '#f2b134', '#2a9d8f', '#8e5bd6'], pants: ['#26324a', '#3a3a44'], gear: 'backpack', hat: 'beanie', scarf: true },
  },
  party: {
    label: 'Celebration',
    tagline: 'Someone is getting a cake.',
    keywords: kw('birthday', 'bday', 'party', 'celebrate', 'celebration', 'surprise', 'graduation', 'farewell', 'reunion'),
    palette: { top: '#fff6e8', bottom: '#ffe1ec', ink: '#2b1a3d', soft: '#6a5680', accent: '#7c4dff', accentInk: '#ffffff', card: 'rgba(255,255,255,0.76)', line: 'rgba(43,26,61,0.12)', dark: false },
    ground: 'bunting',
    particles: [
      { icon: 'balloon', count: 7, motion: 'rise', size: [26, 40] },
      { icon: 'confetti', count: 26, motion: 'fall', size: [6, 10] },
      { icon: 'cake', count: 1, motion: 'bob', size: [34, 40] },
      { icon: 'sparkle', count: 5, motion: 'twinkle', size: [10, 16] },
    ],
    outfit: { shirts: ['#7c4dff', '#ff5d8f', '#ffbe0b', '#06d6a0', '#3a86ff'], pants: ['#2b2d42', '#4a4e69'], gear: 'none', hat: 'party' },
  },
  nightlife: {
    label: 'Night out',
    tagline: 'The night is young.',
    keywords: kw('club', 'clubbing', 'bar', 'pub', 'pubs', 'concert', 'gig', 'dj', 'night out', 'brewery', 'karaoke', 'rooftop'),
    palette: { top: '#0b0b1a', bottom: '#1d1038', ink: '#f5f3ff', soft: '#b9b2dd', accent: '#00e0c6', accentInk: '#04201c', card: 'rgba(20,16,40,0.62)', line: 'rgba(200,190,255,0.14)', dark: true },
    ground: 'skyline',
    particles: [
      { icon: 'note', count: 8, motion: 'rise', size: [16, 24] },
      { icon: 'sparkle', count: 10, motion: 'twinkle', size: [8, 14] },
    ],
    outfit: { shirts: ['#1a1a2e', '#00a896', '#e0479e', '#f4f1de', '#7b2cbf'], pants: ['#0f0f17', '#24243a'], gear: 'none' },
  },
  food: {
    label: 'Food run',
    tagline: 'Plans taste better shared.',
    keywords: kw('restaurant', 'cafe', 'café', 'brunch', 'dinner', 'lunch', 'breakfast', 'food', 'foodie', 'eat', 'eating', 'street food', 'buffet', 'dessert', 'biryani', 'dosa'),
    palette: { top: '#fdeedf', bottom: '#f6d6bd', ink: '#3a1f14', soft: '#7a5546', accent: '#c2410c', accentInk: '#ffffff', card: 'rgba(255,250,245,0.76)', line: 'rgba(58,31,20,0.12)', dark: false },
    ground: 'lights',
    particles: [
      { icon: 'coffee', count: 2, motion: 'bob', size: [28, 34] },
      { icon: 'pizza', count: 2, motion: 'bob', size: [28, 34] },
      { icon: 'noodles', count: 2, motion: 'bob', size: [30, 36] },
      { icon: 'chili', count: 2, motion: 'bob', size: [20, 26] },
    ],
    outfit: { shirts: ['#c2410c', '#2f6f73', '#e9b44c', '#7b4b94', '#3a5a40'], pants: ['#2f2a28', '#5a4636'], gear: 'none' },
  },
  roadtrip: {
    label: 'Road trip',
    tagline: 'Windows down, plan up.',
    keywords: kw('road trip', 'roadtrip', 'drive', 'driving', 'ride', 'bike', 'biking', 'highway', 'car', 'self-drive'),
    palette: { top: '#fde6c4', bottom: '#f5c58e', ink: '#3b2414', soft: '#77543a', accent: '#1f6f78', accentInk: '#ffffff', card: 'rgba(255,250,240,0.76)', line: 'rgba(59,36,20,0.14)', dark: false },
    ground: 'road',
    particles: [
      { icon: 'bird', count: 4, motion: 'drift', size: [18, 26] },
      { icon: 'cloud', count: 3, motion: 'drift', size: [60, 100] },
    ],
    outfit: { shirts: ['#1f6f78', '#d9572b', '#e9b44c', '#5b6bbf', '#8a5a44'], pants: ['#2f3a4a', '#4a3a2a'], gear: 'backpack', shades: true },
  },
}

// Order breaks ties: a "dinner date" is a date before it is a dinner.
const PRIORITY = ['romance', 'party', 'beach', 'snow', 'camping', 'nightlife', 'mountains', 'roadtrip', 'food']

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const MATCHERS = Object.fromEntries(
  PRIORITY.map((id) => [
    id,
    SCENES[id].keywords.map((k) => (k.endsWith('*') ? new RegExp(`\\b${escape(k.slice(0, -1))}`, 'i') : new RegExp(`\\b${escape(k)}\\b`, 'i'))),
  ]),
)

export function detectScene(text) {
  if (!text || text.trim().length < 3) return 'everyday'
  let best = 'everyday'
  let bestScore = 0
  for (const id of PRIORITY) {
    const score = MATCHERS[id].reduce((n, re) => n + (re.test(text) ? 1 : 0), 0)
    if (score > bestScore) {
      best = id
      bestScore = score
    }
  }
  return best
}

export const SCENE_IDS = ['everyday', ...PRIORITY]

// People count mentioned in the brief: "six friends", "dinner for two", "a date", "solo".
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 }
const NUM = `(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})`
const GROUP_NOUN = '(?:of us|people|persons|friends|adults|guys|girls|members|pax|travell?ers|colleagues|folks|cousins)'

export function detectPeople(text) {
  if (!text) return null
  const toN = (w) => NUMBER_WORDS[w.toLowerCase()] ?? parseInt(w, 10)
  const counted = text.match(new RegExp(`\\b${NUM}\\s+${GROUP_NOUN}\\b`, 'i')) || text.match(new RegExp(`\\b(?:for|party of|group of)\\s+${NUM}\\b(?!\\s*(?:days?|nights?|hours?|hrs?|km|rupees|k\\b|pm|am))`, 'i'))
  if (counted) {
    const n = toN(counted[1])
    if (n >= 1 && n <= 20) return n
  }
  if (/\b(solo|alone|by myself|just me)\b/i.test(text)) return 1
  if (/\b(date|couple|honeymoon|anniversary|partner|girlfriend|boyfriend|wife|husband)\b/i.test(text)) return 2
  return null
}
