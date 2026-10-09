import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Bike, Bus, Car, CarTaxiFront, Check, ChevronDown, Footprints, IndianRupee, KeyRound, LoaderCircle, LocateFixed, MapPin, Minus, Plane, Plus, TrainFront, Wand2 } from 'lucide-react'
import { TRAVEL } from '../avatarOptions'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { budgetInfo } from '../agents'
import { cleanConstraints } from '../constraints'

const fmtINR = (n) => Math.round(n).toLocaleString('en-IN')
import { SCENARIOS } from '../scenarios'
import { SCENES, SCENE_IDS, detectPeople } from '../scenes'
import Crew, { Portrait } from './art/Crew'
import DatePicker from './DatePicker'
import Journey from './Journey'
import { currentPosition, reverseGeocode } from '../geo'
import { useJourney } from '../hooks/useJourney'
import { findPlace, placeInText } from '../places'
import { parseTrip } from '../trip'
import { Flag } from 'lucide-react'

function greeting(name) {
  const h = new Date().getHours()
  const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name}`
}

const GROUPS = [
  { id: 1, label: 'Just me' },
  { id: 2, label: 'Two of us' },
  { id: 3, label: 'Group' },
]

function ScenePicker({ sceneId, auto, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="scene-picker" ref={ref}>
      <button type="button" className="scene-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
        <Wand2 size={14} />
        <span>
          Scene: <b>{SCENES[sceneId].label}</b>
        </span>
        <span className="scene-mode">{auto ? 'auto' : 'set by you'}</span>
        <ChevronDown size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="scene-menu glass"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <li>
              <button type="button" role="option" aria-selected={auto} onClick={() => { onPick(null); setOpen(false) }}>
                <span>Match my plan</span>
                {auto && <Check size={14} />}
              </button>
            </li>
            {SCENE_IDS.map((id) => (
              <li key={id}>
                <button type="button" role="option" aria-selected={!auto && sceneId === id} onClick={() => { onPick(id); setOpen(false) }}>
                  <span className="swatch-dot" style={{ background: `linear-gradient(135deg, ${SCENES[id].palette.top}, ${SCENES[id].palette.bottom})` }} />
                  <span>{SCENES[id].label}</span>
                  {!auto && sceneId === id && <Check size={14} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function TravelIcon({ kind }) {
  const I = { car: Car, key: KeyRound, bike: Bike, cab: CarTaxiFront, bus: Bus, train: TrainFront, plane: Plane, walk: Footprints }[kind]
  return I ? <I size={15} /> : null
}

export default function Planner({ me, friends = [], draft, setDraft, sceneId, sceneAuto, onPickScene, onSend }) {
  const textRef = useRef(null)
  const scene = SCENES[sceneId]
  const people = draft.people
  const group = people >= 3 ? 3 : people

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 112)}px`
  }, [draft.brief])

  // When the brief mentions how many people ("six friends", "a date"), follow it; the selector can still override.
  const lastAuto = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => {
      const n = detectPeople(draft.brief)
      if (n && n !== lastAuto.current) {
        lastAuto.current = n
        setDraft((d) => (d.people === n ? d : { ...d, people: n }))
      }
    }, 350)
    return () => clearTimeout(t)
  }, [draft.brief, setDraft])

  // The message is the source of truth for the route: places in order, and how each leg is travelled.
  const trip = useMemo(() => parseTrip(draft.brief), [draft.brief])
  const auto = draft.travelAuto !== false
  const modesKey = trip.modes.join(',')
  useEffect(() => {
    if (!auto) return
    setDraft((d) => (d.travel.join(',') === modesKey ? d : { ...d, travel: modesKey ? modesKey.split(',') : [] }))
  }, [auto, modesKey, setDraft])

  const typedFrom = draft.constraints.location.trim()
  const typedTo = (draft.constraints.destination ?? '').trim()
  // Start: what the user typed or located, else "from X" in the message, else the first place mentioned.
  let tripStops = trip.stops.map((name, i) => ({ text: name, mode: auto ? trip.legModes[i] : null }))
  let fromText = typedFrom || trip.start || ''
  if (!fromText && !draft.origin && tripStops.length >= 2) {
    fromText = tripStops[0].text
    tripStops = tripStops.slice(1)
  }
  tripStops = tripStops.filter((st) => st.text.toLowerCase() !== fromText.toLowerCase())
  if (typedTo && !tripStops.some((st) => st.text.toLowerCase().startsWith(typedTo.toLowerCase()) || typedTo.toLowerCase().startsWith(st.text.toLowerCase().split(' ')[0])))
    tripStops.push({ text: typedTo, mode: null })
  const fromPlace = findPlace(fromText)
  const guessedTo = typedTo || tripStops.length ? null : placeInText(draft.brief, fromPlace)
  const toText = tripStops[tripStops.length - 1]?.text || guessedTo?.name || ''
  const journey = useJourney({
    fromText,
    toText,
    origin: draft.origin,
    stops: tripStops.length ? tripStops : null,
    modes: draft.travel,
    enabled: fromText.length >= 2 || Boolean(draft.origin),
  })
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState(null)
  const useMyLocation = async () => {
    setLocating(true)
    setLocError(null)
    try {
      const pos = await currentPosition()
      const label = await reverseGeocode(pos.lat, pos.lon)
      setDraft((d) => ({ ...d, origin: { ...pos, label }, constraints: { ...d.constraints, location: label } }))
    } catch (e) {
      setLocError(e.message)
    } finally {
      setLocating(false)
    }
  }

  const chosen = friends.filter((f) => draft.friendIds.includes(f.id))
  const minPeople = 1 + chosen.length
  const setPeople = (n) => setDraft((d) => ({ ...d, people: Math.min(20, Math.max(1 + d.friendIds.length, n)) }))
  const toggleFriend = (id) =>
    setDraft((d) => {
      const friendIds = d.friendIds.includes(id) ? d.friendIds.filter((x) => x !== id) : [...d.friendIds, id]
      return { ...d, friendIds, people: Math.max(d.people, 1 + friendIds.length) }
    })
  // Picking a chip by hand takes over from the message; the route then uses these modes for every leg.
  const toggleTravel = (id) =>
    setDraft((d) => ({ ...d, travelAuto: false, travel: id === 'any' ? [] : d.travel.includes(id) ? d.travel.filter((x) => x !== id) : [...d.travel, id] }))
  const followMessage = () => setDraft((d) => ({ ...d, travelAuto: true }))
  // Typing a new starting point drops the exact location from the device.
  const setField = (k) => (e) => setDraft((d) => ({ ...d, ...(k === 'location' ? { origin: null } : {}), constraints: { ...d.constraints, [k]: e.target.value } }))
  const ready = draft.brief.trim().length >= 10
  const basis = draft.budgetBasis ?? 'total'
  const budget = budgetInfo({ budget: draft.constraints.budget, headcount: people, budget_basis: basis })

  const send = (e) => {
    e?.preventDefault()
    if (!ready) return
    const constraints = cleanConstraints({ ...draft.constraints, headcount: String(people) }) ?? {}
    if (constraints.budget) constraints.budget_basis = basis
    if (draft.travel.length) constraints.travel = draft.travel
    // Pin both ends so everyone in the plan sees exactly this route.
    if (journey.status === 'ready') {
      const pinOf = (p) => ({ lat: Number(p.lat.toFixed(5)), lon: Number(p.lon.toFixed(5)), label: String(p.label ?? p.name).slice(0, 200) })
      constraints.origin = pinOf(journey.from)
      constraints.dest = pinOf(journey.to)
      if (!constraints.location) constraints.location = constraints.origin.label
      // Only the stops that passed the route check travel with the plan.
      if (tripStops.length && journey.points?.length > 1)
        constraints.stops = journey.points.slice(1).map((p, i) => {
          // The route card's numbers for this hop, so the server checks exactly what the user saw.
          const hop = journey.legs.filter((l) => l.stop === i)
          const km = hop.reduce((n, l) => n + l.km, 0)
          const hours = hop.reduce((n, l) => n + l.hours, 0)
          return { ...pinOf(p), ...(p.mode ? { mode: p.mode } : {}), ...(hop.length ? { km: Math.round(km * 10) / 10, hours: Math.round(hours * 100) / 100 } : {}) }
        })
      if (!constraints.destination) constraints.destination = toText
    } else if (draft.origin) constraints.origin = draft.origin
    onSend({ brief: draft.brief.trim(), constraints, scene: sceneId, member_ids: draft.friendIds })
  }

  return (
    <motion.main className="planner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{greeting(me.display_name)}</p>
          <AnimatePresence mode="wait">
            <motion.h1 key={sceneId} className="display hero-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              {scene.tagline}
            </motion.h1>
          </AnimatePresence>
          <p className="hero-sub">Tell the council what you have in mind. Budget, Logistics and Vibe argue it out, and the Moderator hands you one plan.</p>
          <ScenePicker sceneId={sceneId} auto={sceneAuto} onPick={onPickScene} />
        </div>
        <div className="hero-art">
          <Crew count={people} me={me.avatar} friends={chosen.map((f) => f.avatar)} sceneId={sceneId} />
        </div>
      </section>

      <form className="plan-card glass" onSubmit={send}>
        <div className="who">
          <span className="field-label">Who's going?</span>
          <div className="who-row">
            <div className="segmented" role="radiogroup" aria-label="Group size">
              {GROUPS.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  role="radio"
                  aria-checked={group === g.id}
                  className={group === g.id ? 'is-on' : ''}
                  onClick={() => setPeople(g.id === 3 ? Math.max(3, people) : g.id)}
                  disabled={g.id < 3 && g.id < minPeople}
                >
                  {group === g.id && <motion.span layoutId="seg" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className="seg-label">{g.label}</span>
                </button>
              ))}
            </div>
            <AnimatePresence>
              {people >= 3 && (
                <motion.div className="stepper" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                  <button type="button" aria-label="One fewer person" onClick={() => setPeople(people - 1)} disabled={people <= Math.max(3, minPeople)}>
                    <Minus size={14} />
                  </button>
                  <span aria-live="polite">{people} people</span>
                  <button type="button" aria-label="One more person" onClick={() => setPeople(people + 1)} disabled={people >= 20}>
                    <Plus size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="with-friends">
          <span className="field-label">Plan with friends <span className="optional">they see the debate live</span></span>
          {friends.length === 0 ? (
            <p className="hint small">Add friends from the Friends tab to plan together, or share the invite link once the debate starts.</p>
          ) : (
            <div className="friend-picks">
              {friends.map((f) => {
                const on = draft.friendIds.includes(f.id)
                return (
                  <button type="button" key={f.id} className={`friend-pick ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggleFriend(f.id)}>
                    <Portrait avatar={f.avatar} size={28} />
                    <span>{f.display_name}</span>
                    {on && <Check size={14} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <label className="field-label" htmlFor="brief">What's the plan?</label>
        <textarea
          id="brief"
          ref={textRef}
          className="brief"
          value={draft.brief}
          onChange={(e) => setDraft((d) => ({ ...d, brief: e.target.value, active: null }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e)
          }}
          placeholder="A beach weekend with friends, a quiet dinner date, a birthday for eight… say what you want it to feel like."
        />

        <div className="details">
          <div className="detail detail-budget">
            <label htmlFor="c-budget" className="detail-budget-field">
              <IndianRupee size={15} />
              <input id="c-budget" inputMode="numeric" value={draft.constraints.budget} onChange={setField('budget')} placeholder="Budget" />
            </label>
            <div className="basis" role="radiogroup" aria-label="Budget is">
              {[['total', 'Total'], ['per_person', 'Per person']].map(([id, label]) => (
                <button type="button" key={id} role="radio" aria-checked={basis === id} className={basis === id ? 'is-on' : ''} onClick={() => setDraft((d) => ({ ...d, budgetBasis: id }))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <DatePicker id="c-dates" value={draft.constraints.dates} onChange={(v) => setDraft((d) => ({ ...d, constraints: { ...d.constraints, dates: v } }))} />
          <label className={`detail detail-locate ${draft.origin ? 'is-pinned' : ''}`} htmlFor="c-location">
            <MapPin size={15} />
            <input id="c-location" value={draft.constraints.location} onChange={setField('location')} placeholder={!typedFrom && fromText ? `Starting from: ${fromText}` : 'Starting from'} />
            <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating} aria-label="Use my current location" title="Use my current location">
              {locating ? <LoaderCircle size={15} className="spin" /> : <LocateFixed size={15} />}
            </button>
          </label>
          <label className="detail" htmlFor="c-destination">
            <Flag size={15} />
            <input id="c-destination" value={draft.constraints.destination ?? ''} onChange={setField('destination')} placeholder={!typedTo && toText ? `Going to: ${toText}` : 'Going to (optional)'} />
          </label>
        </div>
        {budget && (
          <p className="budget-line" aria-live="polite">
            {budget.basis === 'per_person'
              ? <>₹{fmtINR(budget.perPerson)} each × {budget.people} {budget.people === 1 ? 'person' : 'people'} = <b>₹{fmtINR(budget.total)} for the group</b></>
              : <><b>₹{fmtINR(budget.total)} for the group</b>{budget.people > 1 ? <> · about ₹{fmtINR(budget.perPerson)} each for {budget.people} people</> : null}</>}
          </p>
        )}

        {locError && <p className="hint small loc-error" role="status">{locError}</p>}
        <AnimatePresence initial={false}>
          {(fromText.length >= 2 || draft.origin || tripStops.length > 0) && (
            <motion.div className="route-wrap" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {!(fromText.length >= 2 || draft.origin) ? (
                <p className="journey-prompt"><MapPin size={14} /> Going to {toText}. Add where you're starting from and the route draws itself.</p>
              ) : toText ? (
                <Journey journey={journey} fromText={fromText || 'your location'} toText={toText} />
              ) : (
                <p className="journey-prompt"><Flag size={14} /> Add where you're going and the route draws itself, with every change of vehicle on the way.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="travel">
          <span className="field-label">
            Getting there{' '}
            {auto && trip.modes.length ? (
              <span className="optional">picked from your message, tap to change</span>
            ) : !auto && trip.modes.length ? (
              <button type="button" className="link-btn optional-link" onClick={followMessage}>use what my message says</button>
            ) : (
              <span className="optional">pick any that work for you</span>
            )}
          </span>
          <div className="travel-chips" role="group" aria-label="Travel modes">
            <button type="button" className={`travel-chip ${draft.travel.length === 0 ? 'is-on' : ''}`} aria-pressed={draft.travel.length === 0} onClick={() => toggleTravel('any')}>
              <Wand2 size={15} /> Council decides
            </button>
            {TRAVEL.map((t) => {
              const on = draft.travel.includes(t.id)
              return (
                <button type="button" key={t.id} className={`travel-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggleTravel(t.id)}>
                  <TravelIcon kind={t.icon} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="examples">
          <span className="field-label">Or try</span>
          <div className="example-row">
            {SCENARIOS.map((s) => (
              <button
                type="button"
                key={s.label}
                className={`example ${draft.active === s.label ? 'is-on' : ''}`}
                onClick={() =>
                  setDraft({
                    brief: s.brief,
                    constraints: { budget: s.constraints.budget, dates: s.constraints.dates, location: s.constraints.location, destination: s.constraints.destination ?? '' },
                    origin: null,
                    people: Math.max(Number(s.constraints.headcount), 1 + draft.friendIds.length),
                    friendIds: draft.friendIds,
                    travel: s.travel ?? [],
                    travelAuto: !s.travel?.length,
                    active: s.label,
                  })
                }
              >
                <span className="example-title">{s.label}</span>
                <span className="example-meta">{s.meta}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="plan-foot">
          <span className="hint">Two rounds of debate, then one decision. Usually under a minute.</span>
          <button type="submit" className="btn btn-accent btn-lg" disabled={!ready}>
            Ask the council <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </motion.main>
  )
}
