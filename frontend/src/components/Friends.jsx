import { motion } from 'motion/react'
import { Check, Copy, Mail, Search, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api'
import { emailInviteHref } from '../invite'
import { Portrait } from './art/Crew'

export function CopyField({ value, label }) {
  const [copied, setCopied] = useState(false)
  const copy = async (e) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      e.currentTarget.parentElement.querySelector('input')?.select()
    }
  }
  return (
    <div className="copy-field">
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function PersonRow({ user, children }) {
  return (
    <li className="person-row">
      <Portrait avatar={user.avatar} size={40} />
      <div className="person-text">
        <span className="person-name">{user.display_name}</span>
        <span className="person-handle">@{user.username}</span>
      </div>
      <div className="person-actions">{children}</div>
    </li>
  )
}

export default function Friends({ me, onChanged }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [lists, setLists] = useState({ friends: [], incoming: [], outgoing: [] })
  const [error, setError] = useState(null)

  const refresh = async () => {
    try {
      setLists(await api.friends())
      onChanged?.()
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(() => api.search(q).then(setResults).catch((e) => setError(e.message)), 250)
    return () => clearTimeout(t)
  }, [q])

  const act = async (fn) => {
    setError(null)
    try {
      await fn()
      await refresh()
      if (q.trim().length >= 2) setResults(await api.search(q))
    } catch (e) {
      setError(e.message)
    }
  }
  const appLink = `${window.location.origin}${window.location.pathname}`

  return (
    <motion.main className="page friends" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <header className="page-head">
        <p className="eyebrow">Your people</p>
        <h1 className="display page-title">Friends</h1>
      </header>

      <div className="friends-grid">
        <section className="panel glass">
          <label className="field-label" htmlFor="find">Find someone</label>
          <div className="search-input">
            <Search size={16} />
            <input id="find" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Username, name or exact email" autoComplete="off" />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {q.trim().length >= 2 && (
            <ul className="people-list">
              {results.length === 0 && <li className="empty-line">No one found. Invite them with a link instead.</li>}
              {results.map((u) => (
                <PersonRow key={u.id} user={u}>
                  {u.relation === 'friends' && <span className="tag-soft"><Check size={13} /> Friends</span>}
                  {u.relation === 'outgoing' && <span className="tag-soft">Request sent</span>}
                  {u.relation === 'incoming' && <button type="button" className="btn btn-accent btn-sm" onClick={() => act(() => api.accept(u.id))}>Accept</button>}
                  {u.relation === 'none' && (
                    <button type="button" className="btn btn-accent btn-sm" onClick={() => act(() => api.requestFriend(u.username))}>
                      <UserPlus size={14} /> Add
                    </button>
                  )}
                </PersonRow>
              ))}
            </ul>
          )}

          <div className="invite-box">
            <span className="field-label">Invite someone new</span>
            <p className="hint">Send them this link. Once they join, search for their username.</p>
            <CopyField value={appLink} label="Invite link" />
            <a className="btn btn-ghost btn-sm" href={emailInviteHref(appLink, me.display_name, 'a trip')}>
              <Mail size={14} /> Invite by email
            </a>
          </div>
        </section>

        <section className="panel glass">
          {lists.incoming.length > 0 && (
            <>
              <span className="field-label">Requests ({lists.incoming.length})</span>
              <ul className="people-list">
                {lists.incoming.map((u) => (
                  <PersonRow key={u.id} user={u}>
                    <button type="button" className="btn btn-accent btn-sm" onClick={() => act(() => api.accept(u.id))}>Accept</button>
                    <button type="button" className="icon-btn" aria-label={`Decline ${u.display_name}`} onClick={() => act(() => api.removeFriend(u.id))}><X size={16} /></button>
                  </PersonRow>
                ))}
              </ul>
            </>
          )}
          <span className="field-label">Friends ({lists.friends.length})</span>
          {lists.friends.length === 0 ? (
            <p className="hint">No friends yet. Find someone by username or email, or send an invite link.</p>
          ) : (
            <ul className="people-list">
              {lists.friends.map((u) => (
                <PersonRow key={u.id} user={u}>
                  <button type="button" className="icon-btn" aria-label={`Remove ${u.display_name}`} onClick={() => act(() => api.removeFriend(u.id))}><X size={16} /></button>
                </PersonRow>
              ))}
            </ul>
          )}
          {lists.outgoing.length > 0 && (
            <>
              <span className="field-label">Waiting on them</span>
              <ul className="people-list">
                {lists.outgoing.map((u) => (
                  <PersonRow key={u.id} user={u}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.removeFriend(u.id))}>Cancel</button>
                  </PersonRow>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </motion.main>
  )
}
