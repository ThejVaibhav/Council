// A small built-in gazetteer so a route can show rough distance and direction without a maps service.
// [name, lat, lon, aliases]
const PLACES = [
  ['Bengaluru', 12.97, 77.59, ['bangalore', 'blr']], ['Mysuru', 12.3, 76.64, ['mysore']], ['Coorg', 12.42, 75.74, ['madikeri', 'kodagu']],
  ['Chikmagalur', 13.32, 75.77, ['chikkamagaluru']], ['Sakleshpur', 12.94, 75.78, []], ['Nandi Hills', 13.37, 77.68, []],
  ['Kabini', 11.93, 76.35, []], ['Bandipur', 11.67, 76.63, []], ['Hampi', 15.34, 76.46, []], ['Dandeli', 15.25, 74.62, []],
  ['Gokarna', 14.55, 74.32, ['kudle', 'om beach']], ['Murudeshwar', 14.09, 74.48, []], ['Udupi', 13.34, 74.75, ['manipal']],
  ['Mangaluru', 12.91, 74.86, ['mangalore']], ['Agumbe', 13.5, 75.09, []], ['Goa', 15.49, 73.83, ['panaji', 'panjim']],
  ['Ooty', 11.41, 76.7, ['udhagamandalam']], ['Kodaikanal', 10.24, 77.49, []], ['Yercaud', 11.78, 78.21, []],
  ['Munnar', 10.09, 77.06, []], ['Wayanad', 11.69, 76.13, []], ['Kochi', 9.93, 76.27, ['cochin']], ['Alleppey', 9.49, 76.33, ['alappuzha']],
  ['Varkala', 8.73, 76.72, []], ['Pondicherry', 11.94, 79.81, ['puducherry', 'pondy']], ['Mahabalipuram', 12.62, 80.19, ['mamallapuram']],
  ['Chennai', 13.08, 80.27, ['madras']], ['Tirupati', 13.63, 79.42, []], ['Hyderabad', 17.39, 78.49, []], ['Mumbai', 19.08, 72.88, ['bombay']],
  ['Pune', 18.52, 73.86, []], ['Lonavala', 18.75, 73.41, []], ['Delhi', 28.61, 77.21, ['new delhi']], ['Jaipur', 26.91, 75.79, []],
  ['Udaipur', 24.59, 73.71, []], ['Rishikesh', 30.09, 78.27, []], ['Manali', 32.24, 77.19, []], ['Shimla', 31.1, 77.17, []],
  ['Leh', 34.15, 77.58, ['ladakh']], ['Srinagar', 34.08, 74.8, []], ['Gulmarg', 34.05, 74.38, []], ['Kolkata', 22.57, 88.36, ['calcutta']],
  ['Darjeeling', 27.04, 88.26, []], ['Port Blair', 11.62, 92.73, ['andaman', 'havelock']], ['Kempegowda Airport', 13.2, 77.71, ['kempegowda']],
]

const INDEX = PLACES.map(([name, lat, lon, aliases]) => ({ name, lat, lon, keys: [name.toLowerCase(), ...aliases] }))

export function findPlace(text) {
  if (!text) return null
  const t = text.toLowerCase().trim()
  return INDEX.find((p) => p.keys.some((k) => t === k || t.startsWith(k) || t.includes(k))) ?? null
}

// First known place mentioned in free text, skipping the starting point.
export function placeInText(text, except) {
  if (!text) return null
  const t = text.toLowerCase()
  let best = null
  for (const p of INDEX) {
    if (except && p.name === except.name) continue
    for (const k of p.keys) {
      const i = t.search(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`))
      if (i >= 0 && (!best || i < best.i)) best = { p, i }
    }
  }
  return best?.p ?? null
}

export function distanceKm(a, b) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Rough door-to-door figures; road distance is about 1.3x the straight line.
const MODES = {
  flight: { kmh: 600, overheadH: 2.5, road: false, label: 'by air' },
  train: { kmh: 55, overheadH: 0.5, road: true, label: 'by train' },
  bus_state: { kmh: 45, overheadH: 0.3, road: true, label: 'by bus' },
  bus_private: { kmh: 50, overheadH: 0.3, road: true, label: 'by bus' },
  bike: { kmh: 45, overheadH: 0, road: true, label: 'by bike' },
  cab: { kmh: 50, overheadH: 0, road: true, label: 'by cab' },
  rental: { kmh: 55, overheadH: 0.2, road: true, label: 'by car' },
  own_car: { kmh: 55, overheadH: 0, road: true, label: 'by car' },
  walk: { kmh: 20, overheadH: 0, road: true, label: 'locally' },
}

export function estimate(a, b, mode = 'own_car') {
  const m = MODES[mode] ?? MODES.own_car
  const straight = distanceKm(a, b)
  const km = m.road ? straight * 1.3 : straight
  const hours = km / m.kmh + m.overheadH
  return { km: Math.round(km / 5) * 5, hours, label: m.label }
}

export function formatHours(h) {
  if (h < 1) return `${Math.max(10, Math.round((h * 60) / 10) * 10)} min`
  if (h < 10) return `${Math.round(h * 2) / 2} h`.replace('.5 h', '½ h')
  return `${Math.round(h)} h`
}
