import { useEffect, useState } from 'react'
import { MODE_INFO, checkRoute, geocode, journeySummary, legNumbers, planLegs, roadRoute } from '../geo'

/**
 * Resolves both ends of a trip (exact coordinates when known, otherwise by name), splits it into legs
 * for the chosen travel modes, and fetches real road geometry for each road or rail leg.
 * `stops` (optional) makes it a multi-stop trip: [{ text, pin?, mode? }] after the start, where `mode` is how
 * that stop is reached (falling back to `modes`). Without it the trip is simply from -> to.
 * status: idle | loading | ready | missing
 */
export function useJourney({ fromText, toText, origin, dest, stops, modes = [], enabled = true }) {
  const [state, setState] = useState({ status: 'idle' })
  const modesKey = modes.join(',')
  const originKey = origin ? `${origin.lat},${origin.lon}` : ''
  const destKey = dest ? `${dest.lat},${dest.lon}` : ''
  const ends = stops?.length ? stops : [{ text: toText, pin: dest }]
  const stopsKey = stops?.length ? stops.map((s) => `${s.text}|${s.pin ? `${s.pin.lat},${s.pin.lon}` : ''}|${s.mode ?? ''}`).join(';') : ''

  useEffect(() => {
    if (!enabled || !(fromText?.trim() || origin) || !ends.every((e) => e.text?.trim() || e.pin)) {
      setState({ status: 'idle' })
      return
    }
    const ctl = new AbortController()
    let live = true
    setState((s) => ({ ...s, status: 'loading' }))
    const t = setTimeout(async () => {
      try {
        // The start first: every other place is then looked up in the same country as the start.
        const from = origin ? { ...origin, name: origin.label ?? fromText, label: origin.label ?? fromText, source: 'device', country: origin.country ?? null } : await geocode(fromText, ctl.signal)
        if (!live) return
        if (!from) {
          setState({ status: 'missing', from: null, to: null, missingText: fromText })
          return
        }
        const near = { country: from.country ?? (from.source === 'device' ? null : 'in') }
        const rest = await Promise.all(ends.map((e) => (e.pin ? { ...e.pin, name: e.pin.label ?? e.text, label: e.pin.label ?? e.text, source: 'pinned' } : geocode(e.text, ctl.signal, near))))
        if (!live) return
        const missing = rest.findIndex((r) => !r)
        if (missing >= 0) {
          setState({ status: 'missing', from, to: null, missingText: ends[missing].text })
          return
        }
        // Never draw a route through a place that cannot be right: drop it and say why.
        const checked = checkRoute([from, ...rest.map((r, i) => ({ ...r, text: ends[i].text, mode: ends[i].mode }))], modes)
        if (checked.points.length < 2) {
          setState({ status: 'invalid', from, problems: checked.problems })
          return
        }
        const keptEnds = checked.points.slice(1).map((p) => ({ mode: p.mode, text: p.text }))
        const named = (p) => ({ ...p, name: p.label ?? p.name })
        const points = checked.points.map(named)
        const fromNamed = points[0]
        const toNamed = points[points.length - 1]
        // Each hop uses its own mode when the message named one, otherwise the group's chosen modes.
        // A hop the message gave a mode for is exactly that ("bus to Kadapa" is one bus leg); only flights
        // add the ride to and from the airport. Hops without a mode are planned from the chosen modes.
        const hop = (a, b, mode) => (mode && mode !== 'flight' ? [{ mode, from: a, to: b, note: null }] : planLegs(a, b, mode ? [mode] : modes))
        const legs = points.slice(1).flatMap((p, i) => hop(points[i], p, keptEnds[i].mode).map((l) => ({ ...l, stop: i })))
        // Quick numbers first so the card can draw straight away; real routes refine them.
        const quick = legs.map((l) => ({ ...l, ...legNumbers(l), coords: null }))
        setState({ status: 'ready', from: fromNamed, to: toNamed, points, problems: checked.problems, legs: quick, summary: journeySummary(quick, quick), routed: false })
        const routed = await Promise.all(
          legs.map(async (l) => {
            const info = MODE_INFO[l.mode]
            if (!info?.profile) return { ...l, ...legNumbers(l), coords: null }
            const r = await roadRoute(l.from, l.to, info.profile)
            const n = legNumbers(l, r.source === 'osrm' ? r.km : undefined)
            // OSRM's car times are optimistic for buses and bikes in traffic; keep our per-mode speed.
            return { ...l, ...n, coords: r.coords, real: r.source === 'osrm' }
          }),
        )
        if (live) setState({ status: 'ready', from: fromNamed, to: toNamed, points, problems: checked.problems, legs: routed, summary: journeySummary(routed, routed), routed: routed.some((l) => l.real) })
      } catch (e) {
        if (live && e.name !== 'AbortError') setState({ status: 'missing' })
      }
    }, 450)
    return () => {
      live = false
      clearTimeout(t)
      ctl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fromText, toText, originKey, destKey, modesKey, stopsKey])

  return state
}
