import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { COMPANIONS } from '../avatarOptions'
import Crew from './art/Crew'

export default function Auth({ onSignup, onLogin, busy, error, demo, joining }) {
  const [mode, setMode] = useState('signup')
  const [f, setF] = useState({ display_name: '', username: '', email: '', password: '', login: '' })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    if (mode === 'signup') onSignup({ display_name: f.display_name, username: f.username, email: f.email || null, password: f.password })
    else onLogin({ login: f.login, password: f.password })
  }

  return (
    <motion.main className="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="auth-card glass">
        <div className="auth-art">
          <Crew count={4} me={COMPANIONS[4]} friends={COMPANIONS.slice(0, 3)} sceneId="everyday" label="Friends heading out together" />
          <h1 className="display auth-title">Plan it together.</h1>
          <p className="hint">Three AI agents argue out your plan, a fourth decides, and everyone in your group watches it happen.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {joining && <p className="join-note">Sign in or create an account to join the plan you were invited to.</p>}
          <div className="segmented auth-switch" role="tablist">
            {[['signup', 'Create account'], ['login', 'Sign in']].map(([id, label]) => (
              <button type="button" key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'is-on' : ''} onClick={() => setMode(id)}>
                {mode === id && <motion.span layoutId="auth-seg" className="seg-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="seg-label">{label}</span>
              </button>
            ))}
          </div>

          {mode === 'signup' ? (
            <>
              <label className="field-label" htmlFor="a-name">Your name</label>
              <input id="a-name" className="text-input" value={f.display_name} onChange={set('display_name')} placeholder="Thej" required maxLength={40} autoComplete="given-name" />
              <label className="field-label" htmlFor="a-user">Username</label>
              <div className="at-input">
                <span>@</span>
                <input id="a-user" value={f.username} onChange={set('username')} placeholder="thej.v" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" autoComplete="username" />
              </div>
              <label className="field-label" htmlFor="a-email">Email <span className="optional">optional, lets friends find you</span></label>
              <input id="a-email" className="text-input" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
            </>
          ) : (
            <>
              <label className="field-label" htmlFor="a-login">Username or email</label>
              <input id="a-login" className="text-input" value={f.login} onChange={set('login')} required autoComplete="username" />
            </>
          )}
          <label className="field-label" htmlFor="a-pass">Password</label>
          <input id="a-pass" className="text-input" type="password" value={f.password} onChange={set('password')} required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'At least 8 characters' : ''} />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-accent btn-lg auth-submit" disabled={busy}>
            {mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16} />
          </button>
          {demo && <p className="hint auth-demo">This preview keeps everything in your browser. Any password works.</p>}
        </form>
      </div>
    </motion.main>
  )
}
