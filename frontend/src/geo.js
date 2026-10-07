// Free map services: OpenStreetMap Nominatim for places, OSRM for road routes, the browser for "where am I".
// Every call has a timeout and a fallback, so the route still draws offline from the built-in gazetteer.
import { distanceKm, findPlace } from './places'

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OSRM = {
  car: 'https://router.project-osrm.org/route/v1/driving',
  bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
  foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
}

const memo = new Map()
const CACHE_KEY = 'council.geo.v1'
const disk = (() => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
})()
function remember(key, value) {
  memo.set(key, value)
  if (!key.startsWith('g:') && !key.startsWith('r:')) return
  disk[key] = value
  try {
    const keys = Object.keys(disk)
    if (keys.length > 120) delete disk[keys[0]]
    localStorage.setItem(CACHE_KEY, JSON.stringify(disk))
  } catch {
    // storage full or blocked; the in-memory copy still works
  }
}
const recall = (key) => memo.get(key) ?? disk[key]

async function getJSON(url, ms = 6000, signal) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  const onAbort = () => ctl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
    signal?.removeEventListener('abort', onAbort)
  }
}

const tidy = (s) => s?.split(',').map((x) => x.trim()).filter(Boolean)

// A short, human label from a Nominatim result: "Indiranagar, Bengaluru".
function labelOf(r, fallback) {
  const a = r.address ?? {}
  const local = a.neighbourhood || a.suburb || a.village || a.hamlet || a.town
  const city = a.city || a.town || a.county || a.state_district
  const parts = [local, city].filter((x, i, arr) => x && arr.indexOf(x) === i)
  if (parts.length) return parts.join(', ')
  return tidy(r.display_name)?.slice(0, 2).join(', ') || fallback
}

/** Place for free text. Resolves to { lat, lon, name, label, source } or null. */
export async function geocode(text, signal) {
  const q = text?.trim()
  if (!q || q.length < 2) return null
  const key = `g:${q.toLowerCase()}`
  const hit = recall(key)
  if (hit !== undefined) return hit
  let out = null
  try {
    const rows = await getJSON(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1&accept-language=en&q=${encodeURIComponent(q)}`, 6000, signal)
    if (rows?.[0]) out = { lat: Number(rows[0].lat), lon: Number(rows[0].lon), name: tidy(q)[0], label: labelOf(rows[0], q), source: 'osm' }
  } catch (e) {
    if (e.name === 'AbortError' && signal?.aborted) throw e
  }
  if (!out) {
    const p = findPlace(q)
    if (p) out = { lat: p.lat, lon: p.lon, name: p.name, label: p.name, source: 'built-in' }
  }
  if (out?.source === 'osm') remember(key, out)
  else memo.set(key, out)
  return out
}

/** A name for coordinates from the device: "Koramangala, Bengaluru". */
export async function reverseGeocode(lat, lon) {
  try {
    const r = await getJSON(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=en&lat=${lat}&lon=${lon}`, 6000)
    return labelOf(r, 'My location')
  } catch {
    return 'My location'
  }
}

/** The browser's location as { lat, lon }. Rejects with a readable message. */
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot share your location. Type where you are starting from instead.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Number(p.coords.latitude.toFixed(5)), lon: Number(p.coords.longitude.toFixed(5)) }),
      (err) => reject(new Error(err.code === 1 ? 'Location permission was declined. Type where you are starting from instead.' : 'Could not find your location just now. Type it instead.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}

/** A road route: { coords: [[lat, lon], ...], km, minutes, source }. Falls back to a straight estimate. */
export async function roadRoute(a, b, profile = 'car') {
  const key = `r:${profile}:${a.lat.toFixed(3)},${a.lon.toFixed(3)}:${b.lat.toFixed(3)},${b.lon.toFixed(3)}`
  const hit = recall(key)
  if (hit) return hit
  try {
    const r = await getJSON(`${OSRM[profile] ?? OSRM.car}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=simplified&geometries=geojson`, 8000)
    const best = r?.routes?.[0]
    if (best?.geometry?.coordinates?.length) {
      const out = { coords: best.geometry.coordinates.map(([lon, lat]) => [lat, lon]), km: best.distance / 1000, minutes: best.duration / 60, source: 'osrm' }
      remember(key, out)
      return out
    }
  } catch {
    // offline, rate limited or blocked: fall through to the estimate
  }
  return { coords: [[a.lat, a.lon], [b.lat, b.lon]], km: distanceKm(a, b) * 1.3, minutes: null, source: 'estimate' }
}

// ---------- journeys ----------
// Major airports, so a flight leg starts and ends somewhere real.
const AIRPORTS = [
  ['BLR', 'Bengaluru airport', 13.199, 77.706], ['MAA', 'Chennai airport', 12.99, 80.169], ['BOM', 'Mumbai airport', 19.089, 72.866],
  ['DEL', 'Delhi airport', 28.556, 77.1], ['HYD', 'Hyderabad airport', 17.24, 78.429], ['GOI', 'Goa (Dabolim) airport', 15.38, 73.831],
  ['GOX', 'Goa (Mopa) airport', 15.744, 73.86], ['COK', 'Kochi airport', 10.152, 76.402], ['CCU', 'Kolkata airport', 22.654, 88.447],
  ['IXE', 'Mangaluru airport', 12.961, 74.89], ['TRV', 'Thiruvananthapuram airport', 8.482, 76.92], ['PNQ', 'Pune airport', 18.582, 73.92],
  ['JAI', 'Jaipur airport', 26.824, 75.812], ['IXL', 'Leh airport', 34.136, 77.546], ['SXR', 'Srinagar airport', 33.987, 74.774],
  ['IXB', 'Bagdogra airport', 26.681, 88.328], ['IXZ', 'Port Blair airport', 11.641, 92.73], ['UDR', 'Udaipur airport', 24.618, 73.896],
  ['CJB', 'Coimbatore airport', 11.03, 77.043], ['IXM', 'Madurai airport', 9.834, 78.093], ['MYQ', 'Mysuru airport', 12.23, 76.656],
  ['KUU', 'Kullu-Manali airport', 31.877, 77.154], ['DED', 'Dehradun airport', 30.19, 78.18], ['VNS', 'Varanasi airport', 25.452, 82.859],
  ['AMD', 'Ahmedabad airport', 23.077, 72.635], ['IXC', 'Chandigarh airport', 30.673, 76.788], ['CNN', 'Kannur airport', 11.918, 75.547],
  ['HBX', 'Hubballi airport', 15.362, 75.085], ['VGA', 'Vijayawada airport', 16.53, 80.797], ['IXA', 'Agartala airport', 23.887, 91.24],
]

function nearestAirport(p) {
  let best = null
  for (const [code, name, lat, lon] of AIRPORTS) {
    const d = distanceKm(p, { lat, lon })
    if (!best || d < best.d) best = { code, name, lat, lon, d }
  }
  return best
}

const lerp = (a, b, t) => ({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t })

export const MODE_INFO = {
  walk: { label: 'Walk', verb: 'walk', kmh: 4.5, profile: 'foot', kind: 'road' },
  bike: { label: 'Bike', verb: 'ride', kmh: 40, profile: 'car', kind: 'road' },
  cab: { label: 'Cab', verb: 'cab', kmh: 45, profile: 'car', kind: 'road' },
  own_car: { label: 'Car', verb: 'drive', kmh: 55, profile: 'car', kind: 'road' },
  rental: { label: 'Self-drive', verb: 'drive', kmh: 55, profile: 'car', kind: 'road' },
  bus_state: { label: 'State bus', verb: 'bus', kmh: 42, profile: 'car', kind: 'road' },
  bus_private: { label: 'Sleeper bus', verb: 'bus', kmh: 48, profile: 'car', kind: 'road' },
  train: { label: 'Train', verb: 'train', kmh: 55, profile: 'car', kind: 'rail' },
  flight: { label: 'Flight', verb: 'fly', kmh: 650, profile: null, kind: 'air' },
}

/**
 * Split a trip into legs from the travel modes the group picked.
 * Returns [{ mode, from, to, note }], where from/to are { lat, lon, name }.
 */
export function planLegs(from, to, modes = []) {
  const km = distanceKm(from, to)
  const has = (m) => modes.includes(m)
  const firstMile = has('bike') ? 'bike' : has('own_car') ? 'own_car' : has('walk') && km < 3 ? 'walk' : 'cab'

  // Flying only makes sense when the airports are far apart and close to each end.
  const wantsFlight = has('flight') || (!modes.length && km > 750)
  if (wantsFlight) {
    const a = nearestAirport(from)
    const b = nearestAirport(to)
    if (a && b && a.code !== b.code && distanceKm(a, b) > 250) {
      const legs = []
      const A = { lat: a.lat, lon: a.lon, name: a.name }
      const B = { lat: b.lat, lon: b.lon, name: b.name }
      if (a.d > 2) legs.push({ mode: firstMile, from, to: A, note: 'to the airport' })
      legs.push({ mode: 'flight', from: A, to: B, note: `${a.code} → ${b.code}` })
      if (b.d > 2) legs.push({ mode: has('rental') ? 'rental' : 'cab', from: B, to, note: 'the last stretch' })
      return legs
    }
  }
  const trunk = ['train', 'bus_private', 'bus_state'].find(has)
  if (trunk && km > 60) {
    // Stations and bus stands sit near the city centre: start and end the trunk leg a little inside each end.
    const s1 = { ...lerp(from, to, Math.min(0.06, 8 / km)), name: trunk === 'train' ? 'the station' : 'the bus stand' }
    const s2 = { ...lerp(from, to, 1 - Math.min(0.06, 8 / km)), name: trunk === 'train' ? 'the station' : 'the bus stand' }
    return [
      { mode: firstMile === 'own_car' ? 'cab' : firstMile, from, to: s1, note: `to ${s1.name}` },
      { mode: trunk, from: s1, to: s2, note: MODE_INFO[trunk].label },
      { mode: has('rental') ? 'rental' : 'cab', from: s2, to, note: 'the last stretch' },
    ]
  }
  // Road trips: a lighter mode first (ride to the meetup), then the main vehicle.
  const road = ['own_car', 'rental', 'cab', 'bike', 'walk'].filter(has)
  if (road.length >= 2) {
    const [main, start] = [road[0], road[road.length - 1]]
    const meet = { ...lerp(from, to, Math.min(0.12, 10 / Math.max(km, 1))), name: 'the meetup point' }
    return [
      { mode: start, from, to: meet, note: 'to the meetup' },
      { mode: main, from: meet, to, note: MODE_INFO[main].label },
    ]
  }
  return [{ mode: road[0] ?? trunk ?? (modes[0] && MODE_INFO[modes[0]] ? modes[0] : 'own_car'), from, to, note: null }]
}

/** Distance and time for a leg; `routeKm` from a real route overrides the estimate. */
export function legNumbers(leg, routeKm) {
  const info = MODE_INFO[leg.mode] ?? MODE_INFO.own_car
  const straight = distanceKm(leg.from, leg.to)
  const km = routeKm ?? (info.kind === 'air' ? straight : straight * 1.3)
  const hours = km / info.kmh + (info.kind === 'air' ? 2 : 0)
  return { km, hours }
}

export function fmtKm(km) {
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`
  if (km < 20) return `${Math.round(km * 10) / 10} km`
  return `${Math.round(km / 5) * 5} km`
}

export function fmtTime(h) {
  if (h < 1) return `${Math.max(5, Math.round((h * 60) / 5) * 5)} min`
  const whole = Math.floor(h)
  const min = Math.round(((h - whole) * 60) / 15) * 15
  if (min === 60) return `${whole + 1} h`
  return min ? `${whole} h ${min} min` : `${whole} h`
}

/** One-line summary for sharing: total distance, time and the chain of modes. */
export function journeySummary(legs, numbers) {
  const km = numbers.reduce((s, n) => s + n.km, 0)
  const hours = numbers.reduce((s, n) => s + n.hours, 0)
  const modes = legs.map((l) => MODE_INFO[l.mode]?.label ?? l.mode)
  return { km: Math.round(km), time: fmtTime(hours), modes: modes.join(' → ') }
}
