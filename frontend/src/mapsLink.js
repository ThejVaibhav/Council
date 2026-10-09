// Directions on Google Maps through the public Maps URLs scheme: no API key, nothing billed.
// https://developers.google.com/maps/documentation/urls/get-started#directions-action

const ROAD = new Set(['own_car', 'rental', 'cab', 'bike', 'walk', 'bus_state', 'bus_private'])

// Places go by name so Google shows "Kadapa" rather than numbers; a place with no usable name
// (the device's own position) goes by coordinates.
function where(p) {
  if (!p) return ''
  const name = String(p.label || p.name || '').trim()
  return name && name !== 'My location' ? name : `${Number(p.lat).toFixed(5)},${Number(p.lon).toFixed(5)}`
}

function travelMode(legs) {
  const modes = legs.map((l) => l.mode)
  if (modes.every((m) => m === 'walk')) return 'walking'
  if (modes.every((m) => m === 'bike')) return 'two-wheeler'
  // Google drops stops on transit routes, so mixed trips are shown as a road route through every stop.
  if (modes.every((m) => ROAD.has(m) || m === 'flight')) return 'driving'
  return modes.some((m) => ['train', 'bus_state', 'bus_private'].includes(m)) && modes.length === 1 ? 'transit' : 'driving'
}

/**
 * points: [start, ...stops, end] as { lat, lon, label?, name?, source? }; legs: the journey's legs.
 * Google allows up to 9 stops in between; extra ones are dropped from the middle outwards.
 */
export function googleMapsUrl(points, legs = []) {
  if (!points || points.length < 2) return null
  const [origin, ...rest] = points
  const destination = rest.pop()
  let stops = rest
  while (stops.length > 9) stops = stops.filter((_, i) => i !== Math.floor(stops.length / 2))
  const mode = travelMode(legs)
  const q = new URLSearchParams({ api: '1', origin: where(origin), destination: where(destination), travelmode: mode })
  if (stops.length && mode !== 'transit') q.set('waypoints', stops.map(where).join('|'))
  return `https://www.google.com/maps/dir/?${q.toString()}`
}
