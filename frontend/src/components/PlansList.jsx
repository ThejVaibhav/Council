import { motion } from 'motion/react'
import { LogOut, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { SCENES, detectScene } from '../scenes'
import { Portrait } from './art/Crew'

const STATUS = { complete: 'Decided', in_progress: 'Debating', pending: 'Starting', failed: 'Stopped' }

export default function PlansList({ me, onOpen, onNew }) {
  const [plans, setPlans] = useState(null)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const remove = async (p) => {
    setBusy(true)
    try {
      await api.deletePlan(p.id)
      setPlans((list) => list.filter((x) => x.id !== p.id))
      setConfirm(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
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
          const owner = p.members.find((m) => m.role === 'owner')
          const mine = !owner || owner.username === me?.username
          const asking = confirm === p.id
          return (
            <li key={p.id} className="plan-item">
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
              <button type="button" className="icon-btn plan-remove" aria-label={mine ? 'Delete plan' : 'Leave plan'} title={mine ? 'Delete plan' : 'Leave plan'} onClick={() => setConfirm(asking ? null : p.id)}>
                {mine ? <Trash2 size={15} /> : <LogOut size={15} />}
              </button>
              {asking && (
                <motion.div className="plan-confirm glass" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alertdialog" aria-label="Confirm">
                  <span>{mine ? 'Delete this plan for everyone in it?' : 'Leave this plan? You can rejoin from an invite link.'}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
                  <button type="button" className="btn btn-accent btn-sm" disabled={busy} onClick={() => remove(p)}>{mine ? 'Delete' : 'Leave'}</button>
                </motion.div>
              )}
            </li>
          )
        })}
      </ul>
    </motion.main>
  )
}
