import { AnimatePresence, MotionConfig } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEMO, api } from './api'
import Auth from './components/Auth'
import CharacterEditor from './components/CharacterEditor'
import DebateView from './components/DebateView'
import Friends from './components/Friends'
import Planner from './components/Planner'
import PlansList from './components/PlansList'
import RecapView from './components/RecapView'
import TopBar from './components/TopBar'
import { ArtDefs } from './components/art/Crew'
import Scene from './components/art/Scene'
import { useDebate } from './hooks/useDebate'
import { SCENARIOS } from './scenarios'
import { SCENES, detectScene } from './scenes'

const EMPTY_DRAFT = { brief: '', constraints: { budget: '', dates: '', location: '', destination: '' }, people: 1, friendIds: [], travel: [], origin: null, active: null }

function useDebounced(value, ms) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function titleFor(brief) {
  const match = SCENARIOS.find((s) => s.brief === brief)
  if (match) return match.label
  const words = brief?.split(/\s+/).slice(0, 6).join(' ')
  return words ? `${words}…` : 'Your plan'
}

function readLink() {
  if (DEMO) return {}
  const p = new URLSearchParams(window.location.search)
  return { join: p.get('join'), plan: p.get('plan'), recap: p.get('recap') }
}

function setLink(params) {
  if (DEMO) return
  const url = new URL(window.location.href)
  url.search = ''
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v)
  window.history.replaceState(null, '', url)
}

export default function App() {
  const debate = useDebate()
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(api.hasSession())
  const [view, setView] = useState('plan') // plan | plans | friends | editor | create | debate
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [override, setOverride] = useState(null)
  const [friendLists, setFriendLists] = useState({ friends: [], incoming: [], outgoing: [] })
  const [link] = useState(readLink)
  const [recapCode, setRecapCode] = useState(link.recap)
  const [recapScene, setRecapScene] = useState('everyday')

  const refreshFriends = useCallback(() => {
    api.friends().then(setFriendLists).catch(() => {})
  }, [])

  const openPlan = useCallback(
    (plan) => {
      setView('debate')
      setLink({ plan: plan.id })
      window.scrollTo({ top: 0 })
      debate.open(plan)
    },
    [debate],
  )

  // After sign-in: follow an invite or a shared plan link if the page was opened from one.
  const afterAuth = useCallback(
    async (u, isNew) => {
      setUser(u)
      refreshFriends()
      try {
        if (link.join) {
          const { id } = await api.join(link.join)
          openPlan(await api.getPlan(id))
          return
        }
        if (link.plan) {
          openPlan(await api.getPlan(link.plan))
          return
        }
      } catch (e) {
        setAuthError(e.message)
      }
      setView(isNew ? 'create' : 'plan')
    },
    [link, openPlan, refreshFriends],
  )

  useEffect(() => {
    if (!api.hasSession()) return
    api.me().then((u) => afterAuth(u, false)).catch(() => api.logout()).finally(() => setBooting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    const t = setInterval(refreshFriends, 15000)
    return () => clearInterval(t)
  }, [user, refreshFriends])

  const auth = (fn) => async (body) => {
    setAuthBusy(true)
    setAuthError(null)
    try {
      const u = await fn(body)
      await afterAuth(u, fn === api.signup || Boolean(u.is_new))
    } catch (e) {
      setAuthError(e.message)
    } finally {
      setAuthBusy(false)
    }
  }

  const saveCharacter = async (body) => {
    setAuthBusy(true)
    try {
      setUser(await api.updateMe(body))
      setView(debate.status !== 'idle' ? 'debate' : 'plan')
    } catch (e) {
      setAuthError(e.message)
    } finally {
      setAuthBusy(false)
    }
  }

  const send = async (request) => {
    setView('debate')
    window.scrollTo({ top: 0 })
    const plan = await debate.start(request)
    if (plan) setLink({ plan: plan.id })
  }
  const newPlan = () => {
    debate.reset()
    setDraft(EMPTY_DRAFT)
    setOverride(null)
    setLink({})
    setView('plan')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const editPlan = () => {
    const c = debate.request?.constraints ?? {}
    setDraft({
      brief: debate.request?.brief ?? '',
      constraints: { budget: c.budget ? String(c.budget).replace(/\s*INR$/i, '') : '', dates: c.dates ?? '', location: c.location ?? '', destination: c.destination ?? '' },
      people: c.headcount ?? 1,
      friendIds: (debate.plan?.members ?? []).filter((m) => m.username !== user.username).map((m) => m.id),
      travel: c.travel ?? [],
      origin: c.origin && c.origin.label === c.location ? c.origin : null,
      active: null,
    })
    debate.reset()
    setLink({})
    setView('plan')
  }
  const nav = (id) => {
    if (id === 'plan' && debate.status !== 'idle') setView('debate')
    else setView(id)
    window.scrollTo({ top: 0 })
  }
  const logout = async () => {
    debate.reset()
    await api.logout()
    setUser(null)
    setDraft(EMPTY_DRAFT)
    setLink({})
  }

  const briefForScene = useDebounced(view === 'debate' ? (debate.request?.brief ?? '') : draft.brief, 220)
  const detected = useMemo(() => detectScene(briefForScene), [briefForScene])
  let page = !user ? 'auth' : view
  if (booting) page = 'boot'
  if (recapCode) page = 'recap'
  const sceneId = page === 'recap' ? recapScene : ['plan', 'debate'].includes(page) ? (page === 'debate' ? (debate.plan?.scene ?? override ?? detected) : (override ?? detected)) : 'everyday'
  const palette = SCENES[sceneId]?.palette ?? SCENES.everyday.palette

  useEffect(() => {
    document.body.style.background = palette.bottom
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.top)
  }, [palette])

  const style = { '--ink': palette.ink, '--soft': palette.soft, '--accent': palette.accent, '--accent-ink': palette.accentInk, '--card': palette.card, '--line': palette.line }

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${palette.dark ? 'is-dark' : 'is-light'}`} style={style}>
        <ArtDefs />
        <Scene sceneId={sceneId} dimmed={['debate', 'friends', 'plans', 'recap'].includes(page)} />
        <TopBar
          user={page === 'create' ? null : user}
          view={view}
          onNav={nav}
          onEdit={() => setView('editor')}
          onLogout={logout}
          requests={friendLists.incoming.length}
          demo={DEMO}
        />
        <AnimatePresence mode="wait">
          {page === 'recap' && (
            <RecapView
              key="recap"
              code={recapCode}
              onScene={setRecapScene}
              signedIn={Boolean(user)}
              onStart={() => {
                setRecapCode(null)
                setLink({})
                window.scrollTo({ top: 0 })
              }}
            />
          )}
          {page === 'auth' && <Auth key="auth" onSignup={auth(api.signup)} onLogin={auth(api.login)} onGoogle={auth(api.google)} busy={authBusy} error={authError} demo={DEMO} joining={Boolean(link.join)} />}
          {(page === 'create' || page === 'editor') && (
            <CharacterEditor key={page} user={user} mode={page === 'create' ? 'create' : 'edit'} onSave={saveCharacter} onCancel={page === 'editor' ? () => setView(debate.status !== 'idle' ? 'debate' : 'plan') : null} busy={authBusy} error={authError} />
          )}
          {page === 'plan' && (
            <Planner key="planner" me={user} friends={friendLists.friends} draft={draft} setDraft={setDraft} sceneId={sceneId} sceneAuto={!override} onPickScene={setOverride} onSend={send} />
          )}
          {page === 'plans' && <PlansList key="plans" me={user} onOpen={openPlan} onNew={newPlan} />}
          {page === 'friends' && <Friends key="friends" me={user} onChanged={refreshFriends} />}
          {page === 'debate' && (
            <DebateView
              key="debate"
              debate={debate}
              me={user}
              sceneId={sceneId}
              title={debate.result?.title ?? titleFor(debate.request?.brief)}
              onNew={newPlan}
              onEdit={editPlan}
              onMembers={(members) => debate.patchPlan({ members })}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
