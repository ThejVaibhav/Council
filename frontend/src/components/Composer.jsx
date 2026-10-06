import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChevronDown, IndianRupee, Map as MapIcon, MapPin, SlidersHorizontal, Sparkle, ArrowRight, Users } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { EMPTY_CONSTRAINTS, cleanConstraints } from '../constraints'
import { SCENARIOS } from '../scenarios'

const FIELDS = [
  { key: 'budget', label: 'Budget', Icon: IndianRupee, placeholder: '8000', inputMode: 'text' },
  { key: 'headcount', label: 'People', Icon: Users, placeholder: '3', inputMode: 'numeric' },
  { key: 'dates', label: 'Dates', Icon: CalendarDays, placeholder: 'Sat and Sun' },
  { key: 'location', label: 'Location', Icon: MapPin, placeholder: 'Bengaluru' },
]

export default function Composer({ onSubmit }) {
  const [brief, setBrief] = useState('')
  const [constraints, setConstraints] = useState(EMPTY_CONSTRAINTS)
  const [active, setActive] = useState(null)
  const [showConstraints, setShowConstraints] = useState(false)
  const textRef = useRef(null)

  // Grow the brief box with its content so the whole brief is always visible.
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [brief])

  const pick = (s) => {
    setActive(s.label)
    setBrief(s.brief)
    setConstraints({ ...EMPTY_CONSTRAINTS, ...s.constraints })
    setShowConstraints(true)
  }

  const ready = brief.trim().length >= 10
  const submit = (e) => {
    e.preventDefault()
    if (ready) onSubmit({ brief: brief.trim(), constraints: cleanConstraints(constraints) })
  }

  return (
    <form className="composer glass" onSubmit={submit}>
      <div className="chips" role="group" aria-label="Example plans">
        {SCENARIOS.map((s) => (
          <motion.button
            type="button"
            key={s.label}
            className={`chip ${active === s.label ? 'is-active' : ''}`}
            onClick={() => pick(s)}
            whileTap={{ scale: 0.96 }}
          >
            <s.Icon size={18} strokeWidth={1.8} />
            {s.label}
          </motion.button>
        ))}
      </div>

      <label className="brief-field">
        <span className="brief-icon"><MapIcon size={20} strokeWidth={1.7} /></span>
        <textarea
          ref={textRef}
          value={brief}
          onChange={(e) => {
            setBrief(e.target.value)
            setActive(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
          }}
          placeholder="What are you planning? Who's coming, the budget, and the vibe you're after."
          rows={3}
          aria-label="Your plan"
        />
      </label>

      <button
        type="button"
        className="constraints-toggle"
        onClick={() => setShowConstraints((v) => !v)}
        aria-expanded={showConstraints}
      >
        <SlidersHorizontal size={18} strokeWidth={1.8} />
        Constraints <span className="muted">(optional)</span>
        <ChevronDown size={16} className={`toggle-caret ${showConstraints ? 'is-open' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {showConstraints && (
          <motion.div
            className="fields"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="fields-grid">
              {FIELDS.map(({ key, label, Icon, placeholder, inputMode }) => (
                <label key={key} className={`field field-${key}`}>
                  <span className="field-icon"><Icon size={18} strokeWidth={1.7} /></span>
                  <span className="field-body">
                    <span className="field-label">{label}</span>
                    <input
                      value={constraints[key]}
                      onChange={(e) => setConstraints((c) => ({ ...c, [key]: e.target.value }))}
                      placeholder={placeholder}
                      inputMode={inputMode}
                    />
                  </span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        className="cta"
        disabled={!ready}
        whileHover={ready ? { y: -2 } : undefined}
        whileTap={ready ? { scale: 0.97 } : undefined}
      >
        <Sparkle size={18} fill="currentColor" strokeWidth={0} className="cta-spark" />
        Convene the council
        <ArrowRight size={18} />
      </motion.button>
    </form>
  )
}
