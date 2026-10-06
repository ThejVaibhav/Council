import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Pencil, Plus, SlidersHorizontal } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { cleanConstraints } from '../constraints'

const FIELDS = [
  { key: 'budget', label: 'Budget ₹', placeholder: '8000' },
  { key: 'headcount', label: 'People', placeholder: '3', inputMode: 'numeric' },
  { key: 'dates', label: 'When', placeholder: 'Sat–Sun' },
  { key: 'location', label: 'From', placeholder: 'Bengaluru' },
]

export default function ComposerBar({ draft, setDraft, onSend, status, onNew, onEdit }) {
  const ref = useRef(null)
  const live = status === 'running' || status === 'moderating'

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [draft.brief, status])

  if (status !== 'idle') {
    return (
      <div className="composer-bar">
        <div className="composer-inner composer-done">
          {live ? (
            <span className="composer-wait">The council is debating. The decision usually lands in under a minute.</span>
          ) : (
            <>
              <button type="button" className="ghost-btn" onClick={onEdit}>
                <Pencil size={14} /> Edit brief
              </button>
              <button type="button" className="send-pill" onClick={onNew}>
                <Plus size={16} /> New plan
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const ready = draft.brief.trim().length >= 10
  const send = (e) => {
    e?.preventDefault()
    if (ready) onSend({ brief: draft.brief.trim(), constraints: cleanConstraints(draft.constraints) })
  }
  const filled = Object.values(draft.constraints).filter((v) => String(v).trim()).length

  return (
    <form className="composer-bar" onSubmit={send}>
      <div className="composer-inner">
        <AnimatePresence initial={false}>
          {draft.open && (
            <motion.div
              className="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="details-grid">
                {FIELDS.map((f) => (
                  <label key={f.key} className="detail" htmlFor={`d-${f.key}`}>
                    <span>{f.label}</span>
                    <input
                      id={`d-${f.key}`}
                      value={draft.constraints[f.key]}
                      placeholder={f.placeholder}
                      inputMode={f.inputMode}
                      onChange={(e) => setDraft((d) => ({ ...d, constraints: { ...d.constraints, [f.key]: e.target.value } }))}
                    />
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="input-row">
          <button
            type="button"
            className={`icon-btn details-btn ${draft.open ? 'is-on' : ''}`}
            onClick={() => setDraft((d) => ({ ...d, open: !d.open }))}
            aria-expanded={draft.open}
            aria-label="Budget, people, dates and starting point"
          >
            <SlidersHorizontal size={18} />
            {filled > 0 && <span className="badge">{filled}</span>}
          </button>
          <label className="sr-only" htmlFor="brief">Your plan</label>
          <textarea
            id="brief"
            ref={ref}
            rows={1}
            value={draft.brief}
            placeholder="Describe your plan to the council…"
            onChange={(e) => setDraft((d) => ({ ...d, brief: e.target.value, active: null }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send(e)
            }}
          />
          <button type="submit" className="send-btn" disabled={!ready} aria-label="Send to the council">
            <ArrowUp size={18} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </form>
  )
}
