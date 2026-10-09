import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ExternalLink, Map as MapIcon, Route } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { MODE_INFO, fmtKm, fmtTime } from '../geo'
import ErrorBoundary from './ErrorBoundary'
import JourneyStrip from './art/JourneyStrip'
import { MODE_COLOR, vehicleSvg } from './art/vehicles'

const LiveMap = lazy(() => import('./art/LiveMap'))

function directionsUrl(from, to, legs) {
  const travel = legs.some((l) => l.mode === 'flight' || ['train', 'bus_state', 'bus_private'].includes(l.mode)) ? 'transit' : legs.every((l) => l.mode === 'walk') ? 'walking' : 'driving'
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=${travel}`
}

function Mini({ mode }) {
  return <span className="leg-glyph" aria-hidden="true" dangerouslySetInnerHTML={{ __html: vehicleSvg(mode, 34) }} />
}

/**
 * The trip from A to B: an animated zig-zag journey with a vehicle swap at every transfer,
 * or the real OpenStreetMap route. `journey` comes from useJourney in the parent, which also uses it for sharing.
 */
export default function Journey({ journey: j, fromText, toText, compact = false }) {
  const [view, setView] = useState('journey')
  const [mapFailed, setMapFailed] = useState(false)

  if (j.status === 'idle') return null
  if (j.status === 'loading' && !j.legs)
    return (
      <div className={`journey ${compact ? 'is-compact' : ''}`} aria-busy="true">
        <div className="journey-skeleton"><Route size={18} /> Finding the way from {fromText || 'your location'} to {toText}…</div>
      </div>
    )
  if (j.status === 'missing' || !j.legs)
    return (
      <div className={`journey ${compact ? 'is-compact' : ''}`}>
        <p className="journey-miss">
          Couldn't find <b>{j.missingText ?? (!j.from ? fromText : toText)}</b> on the map. Try a nearby town or city name.
        </p>
      </div>
    )

  const { from, to, legs, summary } = j
  const showMap = view === 'map' && !mapFailed

  return (
    <div className={`journey ${compact ? 'is-compact' : ''}`}>
      <div className="journey-head">
        <div className="journey-ends">
          {(j.points ?? [from, to]).map((p, i) => (
            <span key={`${p.label}-${i}`} className="journey-hop">
              {i > 0 && <ArrowRight size={14} />}
              <span className="journey-end">{p.label}</span>
            </span>
          ))}
        </div>
        <div className="journey-total">
          <b>{fmtKm(summary.km)}</b> · <b>~{summary.time}</b>
        </div>
        <div className="journey-toggle" role="tablist" aria-label="Route view">
          <button type="button" role="tab" aria-selected={view === 'journey'} className={view === 'journey' ? 'is-on' : ''} onClick={() => setView('journey')}>
            <Route size={14} /> Journey
          </button>
          <button type="button" role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'is-on' : ''} onClick={() => { setMapFailed(false); setView('map') }}>
            <MapIcon size={14} /> Map
          </button>
        </div>
      </div>

      <ErrorBoundary resetKey={legs.map((l) => l.mode).join('|') + view} fallback={<p className="journey-note">The route picture couldn't be drawn. The legs below are still right.</p>}>
      <div className="journey-stage">
        <AnimatePresence mode="wait" initial={false}>
          {showMap ? (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Suspense fallback={<div className="live-map is-loading">Loading the map…</div>}>
                <LiveMap from={from} to={to} legs={legs} onFail={() => setMapFailed(true)} />
              </Suspense>
            </motion.div>
          ) : (
            <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <JourneyStrip legs={legs} fromLabel={from.label} toLabel={to.label} stopLabels={legs.slice(0, -1).map((l, i) => (j.points && legs[i + 1].stop !== l.stop ? j.points[legs[i + 1].stop]?.label : null))} />
            </motion.div>
          )}
        </AnimatePresence>
        {view === 'map' && mapFailed && <p className="journey-note">The map couldn't load right now, so here's the journey view instead.</p>}
      </div>
      </ErrorBoundary>

      <ol className="journey-legs">
        {legs.map((l, i) => (
          <li key={`${l.mode}-${i}`} style={{ '--leg': MODE_COLOR[l.mode] }}>
            <Mini mode={l.mode} />
            <span className="leg-text">
              <b>{MODE_INFO[l.mode]?.label ?? l.mode}</b>
              <span>{l.note && l.note !== MODE_INFO[l.mode]?.label ? `${l.note} · ` : ''}{fmtKm(l.km)} · ~{fmtTime(l.hours)}</span>
            </span>
            {i < legs.length - 1 && <ArrowRight size={14} className="leg-arrow" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <div className="journey-foot">
        <span>{j.routed ? 'Road distances from OpenStreetMap, times are door to door estimates.' : 'Rough distances and door to door estimates.'}</span>
        <a className="btn btn-ghost btn-sm" href={directionsUrl(from, to, legs)} target="_blank" rel="noreferrer">
          Open directions <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}
