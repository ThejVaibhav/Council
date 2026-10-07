import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MODE_COLOR, VEHICLES } from './vehicles'

const W = 640
const H = 290
// A switchback road that climbs the card: start bottom-left, finish top-right.
const ROAD = [[58, 246], [210, 238], [400, 230], [560, 214], [596, 186], [560, 160], [380, 150], [200, 142], [74, 126], [44, 98], [84, 72], [260, 62], [440, 54], [584, 44]]

function smoothPath(q) {
  let d = `M${q[0][0]} ${q[0][1]}`
  for (let i = 0; i < q.length - 1; i++) {
    const p0 = q[i - 1] || q[i]
    const p1 = q[i]
    const p2 = q[i + 1]
    const p3 = q[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
  }
  return d
}
const D = smoothPath(ROAD)

// Share of the road for each leg: proportional to distance, but never so short you cannot see it.
function shares(legs) {
  const total = legs.reduce((s, l) => s + l.km, 0) || 1
  const raw = legs.map((l) => Math.max(0.14, l.km / total))
  const sum = raw.reduce((a, b) => a + b, 0)
  let acc = 0
  return raw.map((r) => {
    const s = acc
    acc += r / sum
    return [s, acc]
  })
}

function Glyph({ mode, flip }) {
  return <g transform={flip ? 'scale(-1 1)' : undefined} dangerouslySetInnerHTML={{ __html: VEHICLES[mode] ?? VEHICLES.own_car }} />
}

/**
 * The illustrated journey: a zig-zag road from start to finish, coloured per leg, with the vehicle
 * driving each leg in turn and swapping (bike → car, cab → plane) with a puff at every transfer.
 */
export default function JourneyStrip({ legs, fromLabel, toLabel }) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const pathRef = useRef(null)
  const moverRef = useRef(null)
  const [geom, setGeom] = useState(null)
  const [leg, setLeg] = useState(0)
  const [puff, setPuff] = useState(null)
  const [flip, setFlip] = useState(false)
  const spans = useMemo(() => shares(legs), [legs])
  const key = legs.map((l) => `${l.mode}${Math.round(l.km)}`).join('|')

  useLayoutEffect(() => {
    const p = pathRef.current
    if (!p) return
    const L = p.getTotalLength()
    const at = (f) => {
      const pt = p.getPointAtLength(Math.max(0, Math.min(1, f)) * L)
      return [pt.x, pt.y]
    }
    setGeom({ L, at, stops: spans.slice(0, -1).map(([, e]) => at(e)), mids: spans.map(([s, e]) => at((s + e) / 2)) })
  }, [spans])

  useEffect(() => {
    if (!geom || reduce) return
    let raf
    let start = null
    let lastLeg = -1
    let lastFlip = null
    // Timeline: each leg drives for a time that grows with its share, then a short pause to swap vehicles.
    const plan = spans.map(([s, e]) => ({ s, e, drive: 1300 + 2600 * (e - s), pause: 750 }))
    const total = plan.reduce((t, p) => t + p.drive + p.pause, 0) + 1200
    const frame = (now) => {
      if (start == null) start = now
      let t = (now - start) % total
      let f = 1
      let i = plan.length - 1
      let swapping = false
      for (let k = 0; k < plan.length; k++) {
        const p = plan[k]
        if (t < p.drive) {
          const x = t / p.drive
          const ease = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
          f = p.s + (p.e - p.s) * ease
          i = k
          break
        }
        t -= p.drive
        if (t < p.pause) {
          f = p.e
          i = k
          swapping = k < plan.length - 1 && t > p.pause * 0.35
          if (swapping) i = k + 1
          break
        }
        t -= p.pause
      }
      const [x, y] = geom.at(f)
      const [x2, y2] = geom.at(Math.min(1, f + 0.004))
      const goingLeft = x2 < x - 0.05
      const tilt = Math.max(-18, Math.min(18, (Math.atan2(y2 - y, Math.abs(x2 - x) || 0.01) * 180) / Math.PI))
      moverRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - 12).toFixed(1)}) rotate(${(goingLeft ? -tilt : tilt).toFixed(1)})`)
      if (i !== lastLeg) {
        if (lastLeg !== -1 && i > lastLeg) setPuff({ x, y: y - 12, n: Date.now() })
        lastLeg = i
        setLeg(i)
      }
      if (goingLeft !== lastFlip && Math.abs(x2 - x) > 0.05) {
        lastFlip = goingLeft
        setFlip(goingLeft)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [geom, spans, reduce])

  const end = geom ? geom.at(1) : ROAD[ROAD.length - 1]
  const begin = ROAD[0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="journey-svg" role="img" aria-label={`Journey from ${fromLabel} to ${toLabel}: ${legs.map((l) => l.mode).join(', then ')}`}>
      <defs>
        <pattern id={`dots-${id}`} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="var(--line-strong, rgba(60,40,20,.18))" />
        </pattern>
      </defs>
      <rect width={W} height={H} rx="20" className="map-land" />
      <rect width={W} height={H} rx="20" fill={`url(#dots-${id})`} />
      <path d="M-10 270C90 250 150 286 260 272S470 236 650 262" className="map-river" />
      <path d="M470 120C500 96 540 92 570 112C600 132 640 120 650 116V140H460Z" className="map-park" />
      <path d="M110 200C130 186 160 186 180 198L200 210H96Z" className="map-park" />
      {[[150, 92], [520, 238], [330, 100], [600, 92]].map(([x, y]) => (
        <g key={`${x}${y}`} transform={`translate(${x} ${y})`} className="map-tree">
          <path d="M0-14L9 2H-9Z" /><rect x="-1.5" y="2" width="3" height="5" />
        </g>
      ))}

      <path ref={pathRef} d={D} fill="none" stroke="none" />
      <path d={D} className="journey-road" />
      <path d={D} className="journey-road-centre" />
      {spans.map(([s, e], i) => (
        <motion.path
          key={`${key}-${i}`}
          d={D}
          pathLength="1000"
          fill="none"
          stroke={MODE_COLOR[legs[i].mode] ?? 'var(--accent)'}
          strokeWidth={legs[i].mode === 'flight' ? 5 : 7}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${s * 1000} 0 1000` }}
          animate={{ strokeDasharray: `0 ${s * 1000} ${(e - s) * 1000} 1000` }}
          transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.25 + i * 0.55, ease: [0.65, 0, 0.35, 1] }}
          opacity={legs[i].mode === 'flight' ? 0.75 : 1}
        />
      ))}

      {/* transfer points */}
      {geom?.stops.map(([x, y], i) => (
        <motion.g key={`stop-${key}-${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.55, type: 'spring', stiffness: 380, damping: 16 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx={x} cy={y} r="9" fill="var(--paper, #fffaf2)" stroke={MODE_COLOR[legs[i + 1].mode]} strokeWidth="3" />
          <circle cx={x} cy={y} r="3.4" fill={MODE_COLOR[legs[i + 1].mode]} />
        </motion.g>
      ))}

      {/* static glyphs when motion is reduced */}
      {reduce && geom?.mids.map(([x, y], i) => (
        <g key={`mid-${i}`} transform={`translate(${x} ${y - 14}) scale(0.8)`}>
          <Glyph mode={legs[i].mode} />
        </g>
      ))}

      {/* start and finish */}
      <g transform={`translate(${begin[0]} ${begin[1]})`}>
        <circle r="10" fill="var(--accent)" stroke="#fff" strokeWidth="3" />
        <circle r="3.5" fill="#fff" />
      </g>
      <g transform={`translate(${end[0]} ${end[1]})`}>
        <path d="M0 4V-28" stroke="#2a1d18" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M0-28H20L15-21.5L20-15H0Z" fill="var(--accent)" />
        <circle cy="4" r="5" fill="#2a1d18" opacity="0.18" />
      </g>
      <foreignObject x="10" y={H - 34} width="300" height="30">
        <div className="journey-tag">{fromLabel}</div>
      </foreignObject>
      <foreignObject x={W - 310} y="6" width="300" height="30">
        <div className="journey-tag is-end">{toLabel}</div>
      </foreignObject>

      {!reduce && (
        <>
          <g ref={moverRef} transform={`translate(${begin[0]} ${begin[1] - 12})`}>
            <ellipse cx="0" cy="13" rx="16" ry="3.4" fill="#000" opacity="0.15" />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.g
                key={leg}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <Glyph mode={legs[leg]?.mode} flip={flip} />
              </motion.g>
            </AnimatePresence>
          </g>
          <AnimatePresence>
            {puff && (
              <motion.g key={puff.n} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} onAnimationComplete={() => setPuff(null)}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
                  const a = (k / 8) * Math.PI * 2
                  return (
                    <motion.circle
                      key={k}
                      cx={puff.x}
                      cy={puff.y}
                      r="4"
                      fill={k % 2 ? 'var(--accent)' : '#efe3c8'}
                      initial={{ cx: puff.x, cy: puff.y, r: 2 }}
                      animate={{ cx: puff.x + Math.cos(a) * 26, cy: puff.y + Math.sin(a) * 20, r: 5 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  )
                })}
              </motion.g>
            )}
          </AnimatePresence>
        </>
      )}
    </svg>
  )
}
