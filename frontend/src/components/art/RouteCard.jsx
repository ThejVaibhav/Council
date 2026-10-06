import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useMemo } from 'react'
import { estimate, formatHours } from '../../places'

const W = 640
const H = 220

// Vehicle glyphs drawn facing right, centred on 0,0.
function Vehicle({ mode }) {
  if (mode === 'flight')
    return <path d="M-14 0 12 -2 16 0 12 2Z M-2 -1 -8 -11 -4 -11 5 -1Z M-2 1 -8 11 -4 11 5 1Z M-13 -1 -16 -6 -13 -6 -9 -1Z" fill="var(--accent)" stroke="#fff" strokeWidth="1" />
  if (mode === 'bike')
    return (
      <g stroke="var(--accent)" strokeWidth="2.2" fill="none">
        <circle cx="-8" cy="4" r="5" /><circle cx="9" cy="4" r="5" /><path d="M-8 4 0 -4h7l2 8M0 -4l-3-4" strokeLinecap="round" />
      </g>
    )
  if (mode === 'train')
    return (
      <g>
        <rect x="-16" y="-8" width="32" height="13" rx="4" fill="var(--accent)" />
        <rect x="-11" y="-5" width="7" height="5" rx="1" fill="#fff" /><rect x="-1" y="-5" width="7" height="5" rx="1" fill="#fff" />
        <circle cx="-9" cy="7" r="2.6" fill="#2b2320" /><circle cx="9" cy="7" r="2.6" fill="#2b2320" />
      </g>
    )
  if (mode === 'bus_state' || mode === 'bus_private')
    return (
      <g>
        <rect x="-17" y="-10" width="34" height="16" rx="4" fill="var(--accent)" />
        {[-12, -4, 4].map((x) => <rect key={x} x={x} y="-7" width="6" height="5" rx="1" fill="#fff" />)}
        <circle cx="-10" cy="7" r="3" fill="#2b2320" /><circle cx="10" cy="7" r="3" fill="#2b2320" />
      </g>
    )
  return (
    <g>
      <path d="M-15 4c0-4 2-6 6-6l5-6h11l6 6h3c3 0 5 2 5 4v3h-36Z" fill="var(--accent)" />
      <path d="M-3 -6h6v5h-9Zm8 0h4l4 5H5Z" fill="#fff" opacity="0.9" />
      <circle cx="-7" cy="6" r="3.4" fill="#2b2320" /><circle cx="12" cy="6" r="3.4" fill="#2b2320" />
    </g>
  )
}

function Pin({ x, y, delay, label, sub, align }) {
  return (
    <motion.g initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 380, damping: 18 }}>
      <ellipse cx={x} cy={y + 2} rx="9" ry="3" fill="#000" opacity="0.15" />
      <path d={`M${x} ${y}c-7-9-12-14-12-20a12 12 0 0 1 24 0c0 6-5 11-12 20Z`} fill="var(--accent)" stroke="#fff" strokeWidth="2" />
      <circle cx={x} cy={y - 20} r="4.5" fill="#fff" />
      <text x={x} y={y + 22} textAnchor={align} className="route-label">{label}</text>
      {sub && <text x={x} y={y + 38} textAnchor={align} className="route-sub">{sub}</text>}
    </motion.g>
  )
}

/**
 * An illustrated map of the trip: start and end pins, a route that draws itself,
 * and the chosen vehicle travelling along it. Positions follow real bearings when both places are known.
 */
export default function RouteCard({ from, to, fromPlace, toPlace, mode = 'own_car', compact = false }) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const geo = Boolean(fromPlace && toPlace)

  const { a, b, d, est } = useMemo(() => {
    let a = [110, 150]
    let b = [W - 110, 70]
    if (geo) {
      const dx = toPlace.lon - fromPlace.lon
      const dy = -(toPlace.lat - fromPlace.lat)
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len
      const uy = dy / len
      const cx = W / 2
      const cy = H / 2 - 4
      const span = 210
      const spanY = 62
      a = [cx - ux * span, cy - uy * spanY]
      b = [cx + ux * span, cy + uy * spanY]
    }
    // A gentle curve for roads, a high arc for flights.
    const mx = (a[0] + b[0]) / 2
    const my = (a[1] + b[1]) / 2
    const lift = mode === 'flight' ? 70 : 34
    const c1 = [a[0] + (mx - a[0]) * 0.6, my - lift]
    const c2 = [b[0] - (b[0] - mx) * 0.6, my + (mode === 'flight' ? -lift : lift)]
    const d = `M${a[0]} ${a[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`
    return { a, b, d, est: geo ? estimate(fromPlace, toPlace, mode) : null }
  }, [geo, fromPlace, toPlace, mode])

  const key = `${from}|${to}|${mode}`
  const fromLabel = fromPlace?.name ?? from
  const toLabel = toPlace?.name ?? to ?? 'Destination'
  const leftAlign = (x) => (x < 120 ? 'start' : x > W - 120 ? 'end' : 'middle')

  return (
    <div className={`route-card ${compact ? 'route-compact' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="route-svg" role="img" aria-label={`Route from ${fromLabel} to ${toLabel}${est ? `, about ${est.km} kilometres` : ''}`}>
        <defs>
          <pattern id={`grid-${id}`} width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="var(--line)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} rx="18" className="map-land" />
        <rect width={W} height={H} rx="18" fill={`url(#grid-${id})`} opacity="0.6" />
        <path d="M-10 190 C120 150 160 210 280 180 S470 120 650 170" className="map-river" />
        <ellipse cx="520" cy="190" rx="70" ry="26" className="map-park" />
        <ellipse cx="90" cy="40" rx="60" ry="22" className="map-park" />
        <path d="M0 96 H640 M220 0 V220 M450 0 V220" className="map-road" />
        <path d="M0 40 C200 60 300 20 640 50" className="map-road thin" />
        <AnimatePresence mode="wait">
          <motion.g key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <path d={d} className="route-casing" />
            {mode === 'flight' ? (
              <motion.path d={d} className="route-line is-flight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 1 }} />
            ) : (
              <motion.path d={d} className="route-line" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.4, ease: [0.65, 0, 0.35, 1] }} />
            )}
            <path id={`route-${id}`} d={d} fill="none" stroke="none" />
            <Pin x={a[0]} y={a[1]} delay={0.1} label={fromLabel} sub="Start" align={leftAlign(a[0])} />
            <Pin x={b[0]} y={b[1]} delay={0.9} label={toLabel} sub={est ? `≈ ${est.km} km` : null} align={leftAlign(b[0])} />
            {!reduce && (
              <g className="route-vehicle">
                {/* rotate="auto" turns a leftward vehicle upside down; flipping it vertically keeps it upright */}
                <g transform={b[0] < a[0] ? 'scale(1 -1)' : undefined}>
                  <Vehicle mode={mode} />
                </g>
                <animateMotion dur={mode === 'flight' ? '5s' : '7s'} repeatCount="indefinite" rotate="auto" begin="1.4s" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                  <mpath href={`#route-${id}`} />
                </animateMotion>
              </g>
            )}
          </motion.g>
        </AnimatePresence>
      </svg>
      {est && (
        <div className="route-facts">
          <span><b>{est.km} km</b> {mode === 'flight' ? 'flight distance' : mode === 'train' ? 'by rail, roughly' : 'by road, roughly'}</span>
          <span><b>~{formatHours(est.hours)}</b> {est.label}{mode === 'flight' ? ', airport time included' : ''}</span>
        </div>
      )}
      {!est && to && <div className="route-facts"><span>Add a well-known starting point and destination to see rough distance and time.</span></div>}
    </div>
  )
}
