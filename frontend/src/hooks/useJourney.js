import { useEffect, useState } from 'react'
import { MODE_INFO, geocode, journeySummary, legNumbers, planLegs, roadRoute } from '../geo'

/**
 * Resolves both ends of a trip (exact coordinates when known, otherwise by name), splits it into legs
 * for the chosen travel modes, and fetches real road geometry for each road or rail leg.
 * status: idle | loading | ready | missing
 */
export function useJourney({ fromText, toText, origin, dest, modes = [], enabled = true }) {
  const [state, setState] = useState({ status: 'idle' })
  const modesKey = modes.join(',')
  const originKey = origin ? `${origin.lat},${origin.lon}` : ''
  const destKey = dest ? `${dest.lat},${dest.lon}` : ''

  useEffect(() => {
    if (!enabled || !(fromText?.trim() || origin) || !(toText?.trim() || dest)) {
      setState({ status: 'idle' })
      return
    }
    const ctl = new AbortController()
    let live = true
    setState((s) => ({ ...s, status: 'loading' }))
    const t = setTimeout(async () => {
      try {
        const [from, to] = await Promise.all([
          origin ? { ...origin, name: origin.label ?? fromText, label: origin.label ?? fromText, source: 'device' } : geocode(fromText, ctl.signal),
          dest ? { ...dest, name: dest.label ?? toText, label: dest.label ?? toText, source: 'pinned' } : geocode(toText, ctl.signal),
        ])
        if (!live) return
        if (!from || !to) {
          setState({ status: 'missing', from, to })
          return
        }
        const fromNamed = { ...from, name: from.label ?? from.name }
        const toNamed = { ...to, name: to.label ?? to.name }
        const legs = planLegs(fromNamed, toNamed, modes)
        // Quick numbers first so the card can draw straight away; real routes refine them.
        const quick = legs.map((l) => ({ ...l, ...legNumbers(l), coords: null }))
        setState({ status: 'ready', from: fromNamed, to: toNamed, legs: quick, summary: journeySummary(quick, quick), routed: false })
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
        if (live) setState({ status: 'ready', from: fromNamed, to: toNamed, legs: routed, summary: journeySummary(routed, routed), routed: routed.some((l) => l.real) })
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
  }, [enabled, fromText, toText, originKey, destKey, modesKey])

  return state
}
