// Reads a trip out of the plan message: the places in the order they come up, and how each leg is travelled.
// "Going to Vizag, then from there to Araku. First by bike, then car to Araku"
//   -> stops [Vizag, Araku], legModes ['bike', 'own_car'], modes ['bike', 'own_car']
import { INDEX } from './places'

const MODE_WORDS = [
  ['rental', /\b(self[- ]?drive|rent(?:ed|al)? (?:a )?car|zoomcar|rental)\b/g],
  ['bus_private', /\b(sleeper(?: bus)?|volvo(?: bus)?|private bus|a\.?c\.? bus)\b/g],
  ['bus_state', /\b(bus|buses|ksrtc|apsrtc|tsrtc|rtc)\b/g],
  ['bike', /\b(bikes?|motor ?bikes?|motorcycles?|scooters?|scooty|two[- ]wheelers?|bullet|royal enfield)\b/g],
  ['cab', /\b(cabs?|taxis?|uber|ola|rapido)\b/g],
  ['own_car', /\b(cars?|drive|driving|road ?trip)\b/g],
  ['train', /\b(trains?|rail|railway|vande bharat)\b/g],
  ['flight', /\b(flights?|fly|flying|plane|airplane)\b/g],
  ['walk', /\b(walk|walking|on foot)\b/g],
]

// Words after "to"/"from" that are never places.
const NOT_PLACES = new Set(
  ('there here home work office it them us me him her somewhere anywhere someplace the a an my our your this that ' +
    'go be have do plan spend eat see try get make stay relax chill enjoy celebrate visit explore drive ride fly take use bring ' +
    'keep find book go-to come leave return reach start end meet catch watch party dinner lunch breakfast beach hills hill ' +
    'mountains mountain weekend friends family airport station bus train car bike cab flight day night evening morning ' +
    'which where what somewhere nearby back them all both each every some any one two three four five').split(' '),
)
const STOP_AT = /\s+(?:and|then|by|via|from|to|on|for|with|in|at|using|use|after|before|next|tomorrow|today|this|next|i|we|it|so|but|or|&)\b|[,.;!?)(]|$/i

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())

/** Every mention of a place: known names anywhere, plus "to/from/via X" for names the built-in list lacks. */
function placeMentions(text) {
  const lower = text.toLowerCase()
  const out = []
  for (const p of INDEX) {
    for (const k of p.keys) {
      const re = new RegExp(`\\b${esc(k)}\\b`, 'g')
      let m
      while ((m = re.exec(lower))) out.push({ name: p.name, key: p.name, at: m.index, end: m.index + k.length, known: true })
    }
  }
  const re = /\b(to|from|via|till|until|towards|reach|reaching|visit|visiting|explore|exploring)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+){0,2})/gi
  let m
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length - m[2].length
    re.lastIndex = start // "from Hyderabad to Pochampally": let "to Pochampally" match too
    const raw = m[2].split(STOP_AT)[0].trim()
    const first = raw.split(/\s+/)[0]?.toLowerCase()
    if (!raw || raw.length < 3 || NOT_PLACES.has(first)) continue
    if (out.some((o) => o.at <= start && start < o.end)) continue // already a known place
    out.push({ name: titleCase(raw), key: raw.toLowerCase(), at: start, end: start + raw.length, known: false, from: m[1].toLowerCase() === 'from' })
  }
  // "from X" marks the start and "via X" a stop on the way, wherever they appear.
  for (const o of out) {
    const before = lower.slice(Math.max(0, o.at - 12), o.at)
    if (/\bfrom\s+$/.test(before)) o.from = true
    if (/\b(via|through)\s+$/.test(before)) o.via = true
  }
  return out.sort((a, b) => a.at - b.at)
}

function modeMentions(text) {
  const lower = text.toLowerCase()
  const out = []
  const taken = []
  for (const [mode, re] of MODE_WORDS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(lower))) {
      const span = [m.index, m.index + m[0].length]
      if (taken.some(([a, b]) => span[0] < b && a < span[1])) continue // "sleeper bus" is not also "bus"
      taken.push(span)
      out.push({ mode, at: m.index })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

// Clause boundaries: punctuation, "then", "and", "after that".
function clauseOf(text, at) {
  const cuts = [0]
  const re = /[,.;!?]|\bthen\b|\band\b|\bafter that\b|\bnext\b/gi
  let m
  while ((m = re.exec(text))) cuts.push(m.index)
  cuts.push(text.length)
  let i = 0
  while (i < cuts.length - 1 && cuts[i + 1] <= at) i++
  return i
}

/**
 * { start, stops, legModes, modes }
 * start: a place named with "from" (or null); stops: the places to go, in order (names);
 * legModes[i]: how to reach stops[i] from the stop before it (or null); modes: every mode mentioned, in order.
 */
export function parseTrip(text) {
  const empty = { start: null, stops: [], legModes: [], modes: [] }
  if (!text || text.trim().length < 4) return empty
  const places = placeMentions(text)
  const modes = modeMentions(text)
  const uniqueModes = [...new Set(modes.map((m) => m.mode))]

  // First mention of each place decides its order; "from X" (other than "from there") is the start.
  const seen = new Map()
  for (const p of places) if (!seen.has(p.key)) seen.set(p.key, { ...p, mentions: [] })
  for (const p of places) seen.get(p.key).mentions.push(p)
  const ordered = [...seen.values()]
  // "Ooty via Mysuru": the via stop comes before the place named just ahead of it.
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].mentions[0].via && !ordered[i - 1].from) [ordered[i - 1], ordered[i]] = [ordered[i], ordered[i - 1]]
  }
  const startPlace = ordered.find((p) => p.from && p.mentions.every((x) => x.from)) ?? null
  const stops = ordered.filter((p) => p !== startPlace)

  // A leg takes the mode named in the same clause as its destination ("car to Araku"); the rest go in order.
  const used = new Set()
  const legModes = stops.map((s) => {
    // Only where the place is a destination ("to Vizag in car"), never where it is a start ("from Vizag ... bike").
    const arrivals = s.mentions.filter((m) => !m.from)
    for (const mention of arrivals.length ? arrivals : s.mentions) {
      const c = clauseOf(text, mention.at)
      const near = modes.filter((m) => clauseOf(text, m.at) === c && !used.has(m))
      if (near.length) {
        const best = near.sort((a, b) => Math.abs(a.at - mention.at) - Math.abs(b.at - mention.at))[0]
        used.add(best)
        return best.mode
      }
    }
    return null
  })
  const spare = modes.filter((m) => !used.has(m)).map((m) => m.mode).filter((m) => !legModes.includes(m))
  for (let i = 0; i < legModes.length && spare.length; i++) if (!legModes[i]) legModes[i] = spare.shift()
  // Still unnamed: carry on with the mode of the neighbouring leg ("Lambasingi and Vizag by bus").
  for (let i = legModes.length - 2; i >= 0; i--) if (!legModes[i]) legModes[i] = legModes[i + 1]
  for (let i = 1; i < legModes.length; i++) if (!legModes[i]) legModes[i] = legModes[i - 1]

  return { start: startPlace?.name ?? null, stops: stops.map((s) => s.name), legModes, modes: uniqueModes }
}
