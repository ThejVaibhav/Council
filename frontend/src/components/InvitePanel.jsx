import { motion } from 'motion/react'
import { Check, Mail, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { Portrait } from './art/Crew'
import { emailInviteHref } from '../invite'
import { CopyField } from './Friends'

// Who is in this plan, and ways to bring more people in.
export default function InvitePanel({ plan, me, title, onMembers }) {
  const [friends, setFriends] = useState([])
  const [error, setError] = useState(null)
  useEffect(() => {
    api.friends().then((r) => setFriends(r.friends)).catch(() => {})
  }, [])
  const memberIds = new Set(plan.members.map((m) => m.id))
  const link = `${window.location.origin}${window.location.pathname}?join=${plan.invite_code}`

  const add = async (id) => {
    setError(null)
    try {
      const r = await api.addMember(plan.id, id)
      onMembers(r.members)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <motion.div className="invite-panel glass" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <span className="field-label">In this plan ({plan.members.length})</span>
      <ul className="member-chips">
        {plan.members.map((m) => (
          <li key={m.id}>
            <Portrait avatar={m.avatar} size={26} /> {m.id === me.id || m.username === me.username ? 'You' : m.display_name}
          </li>
        ))}
      </ul>
      {friends.filter((f) => !memberIds.has(f.id)).length > 0 && (
        <>
          <span className="field-label">Add a friend</span>
          <ul className="member-chips">
            {friends.filter((f) => !memberIds.has(f.id)).map((f) => (
              <li key={f.id}>
                <button type="button" className="chip-btn" onClick={() => add(f.id)}>
                  <Portrait avatar={f.avatar} size={26} /> {f.display_name} <UserPlus size={13} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="field-label">Or share the invite link</span>
      <CopyField value={link} label="Plan invite link" />
      <a className="btn btn-ghost btn-sm" href={emailInviteHref(link, me.display_name, title)}>
        <Mail size={14} /> Email it
      </a>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="hint small"><Check size={12} /> Everyone in the plan sees the same debate and decision, live.</p>
    </motion.div>
  )
}
