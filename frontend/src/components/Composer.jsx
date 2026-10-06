import { ArrowRight } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { EMPTY_CONSTRAINTS, cleanConstraints } from '../constraints'
import { SCENARIOS } from '../scenarios'

const FIELDS = [
  { key: 'budget', label: 'Budget (₹)', placeholder: '8000', inputMode: 'text' },
  { key: 'headcount', label: 'People', placeholder: '3', inputMode: 'numeric' },
  { key: 'dates', label: 'When', placeholder: 'Sat and Sun' },
  { key: 'location', label: 'Starting from', placeholder: 'Bengaluru' },
]

export default function Composer({ draft, setDraft, onSubmit }) {
  const textRef = useRef(null)
  const { brief, constraints, active } = draft

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`
  }, [brief])

  const ready = brief.trim().length >= 10
  const submit = (e) => {
    e.preventDefault()
    if (ready) onSubmit({ brief: brief.trim(), constraints: cleanConstraints(constraints) })
  }

  return (
    <form className="panel composer" onSubmit={submit}>
      <div className="composer-head">
        <h1>What are you planning?</h1>
        <p>Describe the plan the way you would to a friend. Include who is going, the budget, and what kind of time you want.</p>
      </div>

      <label className="sr-only" htmlFor="brief">Plan brief</label>
      <textarea
        id="brief"
        ref={textRef}
        className="brief-input"
        value={brief}
        onChange={(e) => setDraft((d) => ({ ...d, brief: e.target.value, active: null }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
        }}
        placeholder="A relaxed two-day trip for three friends from Bengaluru, around ₹8,000 total, nothing too packed."
      />

      <fieldset className="constraints">
        <legend>Constraints <span>optional</span></legend>
        <div className="constraint-grid">
          {FIELDS.map(({ key, label, placeholder, inputMode }) => (
            <label key={key} className="field" htmlFor={`c-${key}`}>
              <span>{label}</span>
              <input
                id={`c-${key}`}
                value={constraints[key]}
                inputMode={inputMode}
                placeholder={placeholder}
                onChange={(e) => setDraft((d) => ({ ...d, constraints: { ...d.constraints, [key]: e.target.value } }))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="examples">
        <span className="examples-label">Or start from an example</span>
        <div className="example-list">
          {SCENARIOS.map((s) => (
            <button
              type="button"
              key={s.label}
              className={`example ${active === s.label ? 'is-active' : ''}`}
              aria-pressed={active === s.label}
              onClick={() => setDraft({ brief: s.brief, constraints: { ...EMPTY_CONSTRAINTS, ...s.constraints }, active: s.label })}
            >
              <span className="example-title">{s.label}</span>
              <span className="example-meta">{s.meta}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="composer-foot">
        <span className="hint">Two rounds of debate, then a verdict. Usually under a minute.</span>
        <button type="submit" className="btn btn-primary" disabled={!ready}>
          Start the debate <ArrowRight size={16} strokeWidth={2.2} />
          <kbd>⌘↵</kbd>
        </button>
      </div>
    </form>
  )
}
