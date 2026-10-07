// Retro vehicle glyphs as SVG strings, facing right and centred on 0,0 (about 44 x 28).
// Strings so the same art works inside React (dangerouslySetInnerHTML) and inside Leaflet map markers.

const INK = '#2a1d18'
const wheel = (x, y, r = 4.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="#e9e1d2"/>`

const car = (body, roof = body) =>
  `<path d="M-20 6C-20 1-18-1-14-1.5L-9-8.5C-7.6-10.2-6-11 -4-11H8C10-11 11.6-10.2 13-8.6L18-2C21-1.6 22 0.6 22 3V8H-20Z" fill="${body}"/>` +
  `<path d="M-7-8.6H1.6V-2.2H-11.6ZM4-8.6H8.6C10-8.6 11-8 12-6.8L15-2.2H4Z" fill="#e9f1f0"/>` +
  `<path d="M-20 4H22" stroke="${roof}" stroke-width="1.2" opacity="0.6"/>` +
  `<rect x="18" y="0.5" width="3.6" height="2.4" rx="1" fill="#f3d27a"/>` +
  wheel(-11, 8) + wheel(13, 8)

export const VEHICLES = {
  own_car: car('#a8553a'),
  rental: car('#3e6b5a'),
  cab: car('#e2b43a') + `<rect x="-5" y="-15" width="10" height="4" rx="1.2" fill="${INK}"/><text x="0" y="-12" text-anchor="middle" font-size="3.2" font-weight="700" fill="#e2b43a" font-family="sans-serif">TAXI</text>`,
  bike:
    wheel(-13, 7, 6) + wheel(14, 7, 6) +
    `<path d="M-13 7L-4-3H8L14 7M-4-3L-8-9M2-3L-1 5H10" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M-6-4C-4-9 6-9 9-4Z" fill="#a8553a"/><path d="M8-9L12-11" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<circle cx="1" cy="-16" r="4.2" fill="#d99a2b"/><path d="M-2-12C-4-8-3-5 0-4L5-5" stroke="#3e6b5a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  bus_state:
    `<rect x="-22" y="-12" width="44" height="19" rx="4" fill="#c2443a"/><rect x="-22" y="2" width="44" height="3" fill="#efe3c8"/>` +
    [-17, -8, 1, 10].map((x) => `<rect x="${x}" y="-9" width="7" height="7" rx="1.4" fill="#e9f1f0"/>`).join('') + wheel(-13, 8) + wheel(13, 8),
  bus_private:
    `<rect x="-22" y="-13" width="44" height="20" rx="5" fill="#4a5f8a"/><path d="M-22-1H22" stroke="#d99a2b" stroke-width="2"/>` +
    `<rect x="-18" y="-10" width="32" height="6" rx="1.6" fill="#e9f1f0"/><rect x="16" y="-10" width="4" height="10" rx="1" fill="#e9f1f0"/>` + wheel(-13, 8) + wheel(13, 8),
  train:
    `<path d="M-22-10H14C19-10 22-6 22-1V6H-22Z" fill="#3e6b5a"/><rect x="-22" y="1" width="44" height="3" fill="#d99a2b"/>` +
    [-18, -9, 0].map((x) => `<rect x="${x}" y="-7" width="7" height="6" rx="1.2" fill="#e9f1f0"/>`).join('') +
    `<path d="M10-7H15C17-7 18.6-5 19-3H10Z" fill="#e9f1f0"/>` + wheel(-15, 8, 3.6) + wheel(-5, 8, 3.6) + wheel(5, 8, 3.6) + wheel(15, 8, 3.6),
  flight:
    `<path d="M-20 0C-20-2.6-17-3.4-14-3.4H14C19-3.4 23-2 23 0S19 3.4 14 3.4H-14C-17 3.4-20 2.6-20 0Z" fill="#efe3c8"/>` +
    `<path d="M-2-3L-10-16H-5L8-3ZM-2 3L-10 16H-5L8 3ZM-16-3L-20-10H-16.6L-11-3Z" fill="#a8553a"/>` +
    `<path d="M16-2H20" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  walk:
    `<circle cx="1" cy="-15" r="4.4" fill="#c68a5c"/><path d="M-1-10L-3 3M-3 3L-8 13M-3 3L3 13M-1-8L6-2M-1-8L-7-1" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="-9" y="-11" width="7" height="10" rx="2.4" fill="#3e6b5a"/>`,
}

export const MODE_COLOR = {
  own_car: '#a8553a', rental: '#3e6b5a', cab: '#d9a42b', bike: '#3f8f9b', bus_state: '#c2443a', bus_private: '#4a5f8a', train: '#3e6b5a', flight: '#7a6aa8', walk: '#6f8a6b',
}

export const vehicleSvg = (mode, size = 44) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -20 48 34" width="${size}" height="${(size * 34) / 48}">${VEHICLES[mode] ?? VEHICLES.own_car}</svg>`
