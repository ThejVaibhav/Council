import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { SCENES, detectScene } from '../scenes'
import { Portrait } from './art/Crew'

const STATUS = { complete: 'Decided', in_progress: 'Debating', pending: 'Starting', failed: 'Stopped' }

export default function PlansList({ onOpen, onNew }) {
  const [plans, setPlans] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    api.listPlans().then(setPlans).catch((e) => setError(e.message))
  }, [])

  return (
    <motion.main className="page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <header className="page-head page-head-row">
        <div>
          <p className="eyebrow">Yours and shared with you</p>
          <h1 className="display page-title">Plans</h1>
        </div>
        <button type="button" className="btn btn-accent" onClick={onNew}><Plus size={16} /> New plan</button>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {plans && plans.length === 0 && (
        <div className="panel glass empty-plans">
          <p>No plans yet. Start one, or ask a friend to add you to theirs.</p>
        </div>
      )}
      <ul className="plan-list">
        {(plans ?? []).map((p) => {
          const scene = SCENES[p.scene] ?? SCENES[detectScene(p.brief)]
          return (
            <li key={p.id}>
              <button type="button" className="plan-row glass" onClick={() => onOpen(p)}>
                <span className="plan-swatch" style={{ background: `linear-gradient(135deg, ${scene.palette.top}, ${scene.palette.bottom})` }} />
                <span className="plan-main">
                  <span className="plan-title">{p.title ?? p.brief.split(/\s+/).slice(0, 8).join(' ') + '…'}</span>
                  <span className="plan-meta">
                    {scene.label} · {new Date(p.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {STATUS[p.status] ?? p.status}
                  </span>
                </span>
                <span className="plan-people">
                  {p.members.slice(0, 4).map((m) => <Portrait key={m.id} avatar={m.avatar} size={30} />)}
                  {p.members.length > 4 && <span className="more-count">+{p.members.length - 4}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </motion.main>
  )
}
