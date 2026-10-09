import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Eye, EyeOff, MessagesSquare, Scale, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { COMPANIONS } from '../avatarOptions'
import Crew from './art/Crew'

const GIS = 'https://accounts.google.com/gsi/client'

function loadGis() {
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = GIS
    el.async = true
    el.onload = resolve
    el.onerror = reject
    document.head.appendChild(el)
  })
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

// Our own Google button: opens Google's account picker in a popup, and offers One Tap to returning users.
function useGoogle(onGoogle, enabled) {
  const [state, setState] = useState(enabled ? 'loading' : 'off') // loading | ready | off | unreachable
  const [reason, setReason] = useState('')
  const tokenClient = useRef(null)
  const cb = useRef(onGoogle)
  useEffect(() => {
    cb.current = onGoogle
  }, [onGoogle])

  useEffect(() => {
    if (!enabled) return
    let live = true
    api.config().then(async ({ google_client_id: id }) => {
      if (!live) return
      if (!id) return setState('off')
      try {
        await loadGis()
      } catch {
        return live && setState('off')
      }
      if (!live) return
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: id,
        scope: 'openid email profile',
        callback: (r) => r.access_token && cb.current({ access_token: r.access_token }),
      })
      window.google.accounts.id.initialize({ client_id: id, callback: (r) => cb.current({ credential: r.credential }), auto_select: true, cancel_on_tap_outside: true })
      window.google.accounts.id.prompt()
      setState('ready')
    }, (e) => {
      if (!live) return
      setReason(e.message)
      setState('unreachable')
    })
    return () => {
      live = false
    }
  }, [enabled])

  const start = () => tokenClient.current?.requestAccessToken({ prompt: 'select_account' })
  return { state, start, reason }
}

const PERKS = [
  { icon: MessagesSquare, text: 'Budget, Logistics and Vibe argue it out in two rounds' },
  { icon: Scale, text: 'A Moderator makes the call and shows every trade-off' },
  { icon: Users, text: 'Invite friends and watch the debate live together' },
]

export default function Auth({ onSignup, onLogin, onGoogle, busy, error, demo, joining }) {
  const [mode, setMode] = useState('login')
  const [show, setShow] = useState(false)
  const [note, setNote] = useState(null)
  const [f, setF] = useState({ display_name: '', username: '', email: '', password: '', login: '' })
  const google = useGoogle(onGoogle, Boolean(onGoogle) && !demo)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const signup = mode === 'signup'
  const switchTo = (m) => {
    setMode(m)
    setShow(false)
    setNote(null)
  }
  const submit = (e) => {
    e.preventDefault()
    if (signup) onSignup({ display_name: f.display_name, username: f.username, email: f.email || null, password: f.password })
    else onLogin({ login: f.login, password: f.password })
  }
  const googleClick = () => {
    setNote(null)
    if (google.state === 'ready') google.start()
    else if (demo) setNote('Google sign-in works in the full app. In this preview, use a username instead.')
    else if (google.state === 'loading') setNote('Connecting to Google, try again in a second.')
    else if (google.state === 'unreachable') setNote(google.reason)
    else setNote('Google sign-in is not switched on for this server yet. Use a username and password for now.')
  }

  return (
    <motion.main className="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="auth-card glass">
        <section className="auth-art">
          <h1 className="display auth-title">Plans your whole group will actually agree on.</h1>
          <div className="auth-crew">
            <Crew count={4} me={COMPANIONS[4]} friends={COMPANIONS.slice(0, 3)} sceneId="everyday" label="Friends heading out together" />
          </div>
          <ul className="auth-perks">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text}><span className="perk-icon"><Icon size={15} /></span>{text}</li>
            ))}
          </ul>
        </section>

        <section className="auth-panel">
          <header className="auth-head">
            <h2 className="auth-h2">{signup ? 'Create your account' : 'Welcome back'}</h2>
            <p className="hint">{signup ? 'Free to use. Takes under a minute.' : 'Sign in to see your plans and friends.'}</p>
          </header>
          {joining && <p className="join-note">Sign in or create an account to join the plan you were invited to.</p>}

          <button type="button" className="google-cta" onClick={googleClick} disabled={busy}>
            <GoogleLogo /> {signup ? 'Sign up with Google' : 'Continue with Google'}
          </button>
          {note && <p className="auth-note" role="status">{note}</p>}

          <p className="auth-or"><span>or with a username</span></p>

          <form className="auth-form" onSubmit={submit}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode} className="auth-fields" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {signup ? (
                  <>
                    <div className="auth-row">
                      <div>
                        <label className="field-label" htmlFor="a-name">Your name</label>
                        <input id="a-name" className="text-input" value={f.display_name} onChange={set('display_name')} placeholder="Alex" required maxLength={40} autoComplete="given-name" />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="a-user">Username</label>
                        <div className="at-input">
                          <span>@</span>
                          <input id="a-user" value={f.username} onChange={set('username')} placeholder="alex.travels" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" title="3 to 20 letters, numbers, dots or underscores" autoComplete="username" />
                        </div>
                      </div>
                    </div>
                    <label className="field-label" htmlFor="a-email">Email <span className="optional">optional, lets friends find you</span></label>
                    <input id="a-email" className="text-input" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
                  </>
                ) : (
                  <>
                    <label className="field-label" htmlFor="a-login">Username or email</label>
                    <input id="a-login" className="text-input" value={f.login} onChange={set('login')} placeholder="alex.travels" required autoComplete="username" />
                  </>
                )}
                <label className="field-label" htmlFor="a-pass">Password</label>
                <div className="pass-input">
                  <input id="a-pass" className="text-input" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} required minLength={signup ? 8 : 1} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'At least 8 characters' : 'Your password'} />
                  <button type="button" className="pass-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-accent btn-lg auth-submit" disabled={busy}>
              {busy ? 'One moment…' : signup ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="auth-swap">
            {signup ? 'Already have an account?' : 'New to Council?'}{' '}
            <button type="button" className="link-btn" onClick={() => switchTo(signup ? 'login' : 'signup')}>
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <p className="hint auth-fine">
            {demo ? 'This preview keeps everything in your browser. Any password works.' : 'You stay signed in on this device for 30 days.'}
          </p>
        </section>
      </div>
    </motion.main>
  )
}
