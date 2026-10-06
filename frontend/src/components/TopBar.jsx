import { AnimatePresence, motion } from 'motion/react'
import { LogOut, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Portrait } from './art/Crew'

const NAV = [
  { id: 'plan', label: 'Plan' },
  { id: 'plans', label: 'Plans' },
  { id: 'friends', label: 'Friends' },
]

export default function TopBar({ user, view, onNav, onEdit, onLogout, requests = 0, demo }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <header className="topbar">
      <button type="button" className="wordmark" onClick={() => user && onNav('plan')} aria-label="Council home">
        Council
        {demo && <span className="demo-tag">preview</span>}
      </button>
      {user && (
        <nav className="nav glass" aria-label="Main">
          {NAV.map((n) => (
            <button type="button" key={n.id} className={view === n.id || (n.id === 'plan' && view === 'debate') ? 'is-on' : ''} onClick={() => onNav(n.id)}>
              {(view === n.id || (n.id === 'plan' && view === 'debate')) && <motion.span layoutId="nav-bg" className="seg-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="seg-label">
                {n.label}
                {n.id === 'friends' && requests > 0 && <span className="badge">{requests}</span>}
              </span>
            </button>
          ))}
        </nav>
      )}
      {user && (
        <div className="me-menu" ref={ref}>
          <button type="button" className="me-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
            <Portrait avatar={user.avatar} size={30} />
            <span className="me-name">{user.display_name}</span>
          </button>
          <AnimatePresence>
            {open && (
              <motion.div className="menu" role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                <div className="menu-who">
                  <span>{user.display_name}</span>
                  <span className="person-handle">@{user.username}</span>
                </div>
                <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }}><Pencil size={15} /> Edit character</button>
                <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout() }}><LogOut size={15} /> Sign out</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </header>
  )
}
