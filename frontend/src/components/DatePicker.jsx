import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDates, sameDay, startOfDay } from '../dates'

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const fmt = (d, opts) => d.toLocaleDateString('en-GB', opts)

function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // Monday first
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))]
}

/**
 * A text field for "when" with a mini calendar. Click one day for a date, a second later day for a range.
 * Days before today can't be picked. Typing free text ("Friday evening") still works.
 */
export default function DatePicker({ id, value, onChange, placeholder = 'When' }) {
  const [today] = useState(() => startOfDay(new Date()))
  const [open, setOpen] = useState(false)
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [range, setRange] = useState({ start: null, end: null })
  const [hover, setHover] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const pick = (d) => {
    const { start, end } = range
    if (!start || end || d < start) {
      setRange({ start: d, end: null })
      onChange(formatDates(d))
    } else {
      setRange({ start, end: d })
      onChange(formatDates(start, d))
      setOpen(false)
    }
  }
  const quick = (label, s, e) => (
    <button type="button" className="dp-quick" onClick={() => { setRange({ start: s, end: e }); onChange(formatDates(s, e)); setOpen(false) }}>
      {label}
    </button>
  )
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  const satOffset = (6 - today.getDay() + 7) % 7
  const thisSat = addDays(today, satOffset)
  const weekendStart = today.getDay() === 0 ? today : thisSat
  const weekendEnd = today.getDay() === 0 ? today : addDays(thisSat, 1)

  const canGoBack = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m > today.getMonth())
  const move = (n) => setView(({ y, m }) => {
    const d = new Date(y, m + n, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const cells = monthGrid(view.y, view.m)
  const rangeEnd = range.end ?? (range.start && hover && hover > range.start ? hover : null)

  return (
    <div className="dp" ref={ref}>
      <label className={`detail ${open ? 'is-open' : ''}`} htmlFor={id}>
        <button type="button" className="dp-icon" onClick={() => setOpen((o) => !o)} aria-label="Open calendar" aria-expanded={open}>
          <CalendarDays size={15} />
        </button>
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setOpen(true)} placeholder={placeholder} autoComplete="off" />
        {value && (
          <button type="button" className="dp-clear" onClick={() => { onChange(''); setRange({ start: null, end: null }) }} aria-label="Clear date">
            <X size={14} />
          </button>
        )}
      </label>
      <AnimatePresence>
        {open && (
          <motion.div className="dp-pop glass" role="dialog" aria-label="Choose dates" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}>
            <div className="dp-head">
              <button type="button" className="dp-nav" onClick={() => move(-1)} disabled={!canGoBack} aria-label="Previous month"><ChevronLeft size={16} /></button>
              <b>{fmt(new Date(view.y, view.m, 1), { month: 'long', year: 'numeric' })}</b>
              <button type="button" className="dp-nav" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={16} /></button>
            </div>
            <div className="dp-grid" role="grid" onPointerLeave={() => setHover(null)}>
              {DAYS.map((d) => <span key={d} className="dp-dow">{d}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />
                const past = d < today
                const isStart = sameDay(d, range.start)
                const isEnd = sameDay(d, rangeEnd)
                const inRange = range.start && rangeEnd && d > range.start && d < rangeEnd
                return (
                  <button
                    type="button"
                    key={d.getDate()}
                    className={['dp-day', past && 'is-past', sameDay(d, today) && 'is-today', (isStart || isEnd) && 'is-picked', inRange && 'is-in', d.getDay() % 6 === 0 && 'is-weekend'].filter(Boolean).join(' ')}
                    disabled={past}
                    aria-label={fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    aria-pressed={isStart || isEnd}
                    onClick={() => pick(d)}
                    onPointerEnter={() => setHover(d)}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
            <div className="dp-foot">
              {quick('Today', today, null)}
              {quick('Tomorrow', addDays(today, 1), null)}
              {quick('This weekend', weekendStart, weekendEnd)}
              {quick('Next weekend', addDays(thisSat, 7), addDays(thisSat, 8))}
            </div>
            <p className="dp-hint">{range.start && !range.end ? 'Tap a later day to make it a trip, or close to keep one day.' : 'Tap a day, or two days for a trip.'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
