import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarDays, Check, ChevronDown, IndianRupee, MapPin, Minus, Plus, Wand2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cleanConstraints } from '../constraints'
import { SCENARIOS } from '../scenarios'
import { SCENES, SCENE_IDS, detectPeople } from '../scenes'
import Crew from './art/Crew'

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

export default function Planner({ profile, draft, setDraft, sceneId, sceneAuto, onPickScene, onSend }) {
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

  const setPeople = (n) => setDraft((d) => ({ ...d, people: Math.min(20, Math.max(1, n)) }))
  const setField = (k) => (e) => setDraft((d) => ({ ...d, constraints: { ...d.constraints, [k]: e.target.value } }))
  const ready = draft.brief.trim().length >= 10

  const send = (e) => {
    e?.preventDefault()
    if (!ready) return
    onSend({ brief: draft.brief.trim(), constraints: cleanConstraints({ ...draft.constraints, headcount: String(people) }) })
  }

  return (
    <motion.main className="planner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{greeting(profile.name)}</p>
          <AnimatePresence mode="wait">
            <motion.h1 key={sceneId} className="display hero-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              {scene.tagline}
            </motion.h1>
          </AnimatePresence>
          <p className="hero-sub">Tell the council what you have in mind. Budget, Logistics and Vibe argue it out, and the Moderator hands you one plan.</p>
          <ScenePicker sceneId={sceneId} auto={sceneAuto} onPick={onPickScene} />
        </div>
        <div className="hero-art">
          <Crew count={people} profile={profile} sceneId={sceneId} />
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
                >
                  {group === g.id && <motion.span layoutId="seg" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className="seg-label">{g.label}</span>
                </button>
              ))}
            </div>
            <AnimatePresence>
              {people >= 3 && (
                <motion.div className="stepper" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                  <button type="button" aria-label="One fewer person" onClick={() => setPeople(people - 1)} disabled={people <= 3}>
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
          <label className="detail" htmlFor="c-budget">
            <IndianRupee size={15} />
            <input id="c-budget" value={draft.constraints.budget} onChange={setField('budget')} placeholder="Budget" />
          </label>
          <label className="detail" htmlFor="c-dates">
            <CalendarDays size={15} />
            <input id="c-dates" value={draft.constraints.dates} onChange={setField('dates')} placeholder="When" />
          </label>
          <label className="detail" htmlFor="c-location">
            <MapPin size={15} />
            <input id="c-location" value={draft.constraints.location} onChange={setField('location')} placeholder="Starting from" />
          </label>
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
                    constraints: { budget: s.constraints.budget, dates: s.constraints.dates, location: s.constraints.location },
                    people: Number(s.constraints.headcount),
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
