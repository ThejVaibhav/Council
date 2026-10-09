import { ArrowRight, ExternalLink, Route } from 'lucide-react'
import { MODE_INFO, fmtKm, fmtTime } from '../geo'
import { googleMapsUrl } from '../mapsLink'
import ErrorBoundary from './ErrorBoundary'
import JourneyStrip from './art/JourneyStrip'
import { MODE_COLOR, vehicleSvg } from './art/vehicles'

function Mini({ mode }) {
  return <span className="leg-glyph" aria-hidden="true" dangerouslySetInnerHTML={{ __html: vehicleSvg(mode, 34) }} />
}

/**
 * The trip from A to B: an animated zig-zag journey with a vehicle swap at every transfer, the legs,
 * and a link that opens the same route in Google Maps. `journey` comes from useJourney in the parent.
 */
export default function Journey({ journey: j, fromText, toText, compact = false }) {
  if (j.status === 'idle') return null
  if (j.status === 'loading' && !j.legs)
    return (
      <div className={`journey ${compact ? 'is-compact' : ''}`} aria-busy="true">
        <div className="journey-skeleton"><Route size={18} /> Finding the way from {fromText || 'your location'} to {toText}…</div>
      </div>
    )
  if (j.status === 'invalid')
    return (
      <div className={`journey ${compact ? 'is-compact' : ''}`}>
        <div className="journey-problems" role="alert">
          <b>This route doesn't add up, so it isn't drawn.</b>
          <ul>{j.problems.map((p) => <li key={p.text}><b>{p.text}</b> {p.reason}.</li>)}</ul>
          <span>Check the place names, or type the stops into Starting from and Going to.</span>
        </div>
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
  const mapsUrl = googleMapsUrl(j.points ?? [from, to], legs)

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
      </div>

      {j.problems?.length > 0 && (
        <div className="journey-problems is-soft" role="status">
          <ul>{j.problems.map((p) => <li key={p.text}><b>{p.text}</b> {p.reason}.</li>)}</ul>
        </div>
      )}
      <ErrorBoundary resetKey={legs.map((l) => l.mode).join('|')} fallback={<p className="journey-note">The route picture couldn't be drawn. The legs below are still right.</p>}>
        <div className="journey-stage">
          <JourneyStrip legs={legs} fromLabel={from.label} toLabel={to.label} stopLabels={legs.slice(0, -1).map((l, i) => (j.points && legs[i + 1].stop !== l.stop ? j.points[legs[i + 1].stop]?.label : null))} />
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
        {mapsUrl && (
          <a className="btn btn-ghost btn-sm maps-link" href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open the route from ${from.label} to ${to.label} in Google Maps (new tab)`}>
            Open in Google Maps <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  )
}
