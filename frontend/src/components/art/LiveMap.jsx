import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { MODE_COLOR, vehicleSvg } from './vehicles'

// Free tiles: CARTO's Voyager basemap over OpenStreetMap data, with plain OSM as the fallback.
const TILES = [
  { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', subdomains: 'abcd' },
  { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', subdomains: 'abc' },
]

// A gentle arc between two airports, so flights read differently from roads.
function arc(a, b, n = 40) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const dx = b[1] - a[1]
  const dy = b[0] - a[0]
  const ctrl = [mid[0] + dx * 0.18, mid[1] - dy * 0.18]
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]]
  })
}

const pin = (html, cls) => L.divIcon({ className: `map-pin ${cls}`, html, iconSize: [30, 30], iconAnchor: [15, 28] })

function lengthOf(pts) {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return d
}
function pointAt(pts, f) {
  const total = lengthOf(pts)
  let target = f * total
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (target <= seg) {
      const t = seg ? target / seg : 0
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]
    }
    target -= seg
  }
  return pts[pts.length - 1]
}

/** A real, pannable map of the journey. Calls onFail when tiles cannot load (offline or blocked). */
export default function LiveMap({ from, to, legs, onFail }) {
  const box = useRef(null)

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
    let tileIndex = 0
    let loaded = 0
    let errors = 0
    let layer
    const addTiles = () => {
      const t = TILES[tileIndex]
      layer = L.tileLayer(t.url, { attribution: t.attribution, subdomains: t.subdomains, maxZoom: 18, detectRetina: true })
      layer.on('tileload', () => { loaded += 1 })
      layer.on('tileerror', () => {
        errors += 1
        if (loaded === 0 && errors >= 4) {
          map.removeLayer(layer)
          errors = 0
          if (++tileIndex < TILES.length) addTiles()
          else onFail?.()
        }
      })
      layer.addTo(map)
    }
    addTiles()

    const lines = legs.map((l) => (l.mode === 'flight' || !l.coords ? (l.mode === 'flight' ? arc([l.from.lat, l.from.lon], [l.to.lat, l.to.lon]) : [[l.from.lat, l.from.lon], [l.to.lat, l.to.lon]]) : l.coords))
    lines.forEach((pts, i) => {
      const color = MODE_COLOR[legs[i].mode] ?? '#a8553a'
      L.polyline(pts, { color: '#ffffff', weight: 9, opacity: 0.9 }).addTo(map)
      L.polyline(pts, { color, weight: 5, opacity: 0.95, dashArray: legs[i].mode === 'flight' ? '2 10' : legs[i].coords ? null : '8 8', lineCap: 'round' }).addTo(map)
    })
    L.marker([from.lat, from.lon], { icon: pin('<span class="map-pin-dot"></span>', 'is-start'), title: from.label ?? from.name }).addTo(map).bindTooltip(from.label ?? from.name, { direction: 'top', offset: [0, -24] })
    L.marker([to.lat, to.lon], { icon: pin('<span class="map-pin-flag"></span>', 'is-end'), title: to.label ?? to.name }).addTo(map).bindTooltip(to.label ?? to.name, { direction: 'top', offset: [0, -24], permanent: true })
    legs.slice(1).forEach((l) => {
      L.circleMarker([l.from.lat, l.from.lon], { radius: 7, color: MODE_COLOR[l.mode], weight: 3, fillColor: '#fffaf2', fillOpacity: 1 }).addTo(map).bindTooltip(`Switch to ${l.mode === 'flight' ? 'the flight' : l.mode.replace('_', ' ')} at ${l.from.name}`)
    })
    map.fitBounds(L.latLngBounds(lines.flat()), { padding: [36, 36] })

    // The vehicle drives each leg in turn and changes at every transfer.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf
    let mover
    if (!reduce) {
      const icon = (mode) => L.divIcon({ className: 'map-vehicle', html: `<span class="map-vehicle-pop">${vehicleSvg(mode, 40)}</span>`, iconSize: [40, 28], iconAnchor: [20, 18] })
      mover = L.marker(lines[0][0], { icon: icon(legs[0].mode), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(map)
      const plan = lines.map((pts, i) => ({ pts, drive: 2600 + Math.min(3000, legs[i].km * 4), pause: 700 }))
      const total = plan.reduce((s, p) => s + p.drive + p.pause, 0) + 1200
      let start = null
      let current = 0
      const frame = (now) => {
        if (start == null) start = now
        let t = (now - start) % total
        let i = plan.length - 1
        let f = 1
        for (let k = 0; k < plan.length; k++) {
          if (t < plan[k].drive) { i = k; f = t / plan[k].drive; break }
          t -= plan[k].drive
          if (t < plan[k].pause) { i = Math.min(k + 1, plan.length - 1); f = k + 1 < plan.length ? 0 : 1; break }
          t -= plan[k].pause
        }
        if (i !== current) { current = i; mover.setIcon(icon(legs[i].mode)) }
        mover.setLatLng(pointAt(plan[i].pts, f))
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }
    return () => {
      cancelAnimationFrame(raf)
      map.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, from, to])

  return <div ref={box} className="live-map" role="region" aria-label="Map of the route" />
}
