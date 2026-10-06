import { AnimatePresence, MotionConfig } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import DebateView from './components/DebateView'
import Onboarding from './components/Onboarding'
import Planner from './components/Planner'
import TopBar from './components/TopBar'
import Scene from './components/art/Scene'
import { DEMO, useDebate } from './hooks/useDebate'
import { loadProfile, saveProfile } from './profile'
import { SCENARIOS } from './scenarios'
import { SCENES, detectScene } from './scenes'

const EMPTY_DRAFT = { brief: '', constraints: { budget: '', dates: '', location: '' }, people: 1, active: null }

function useDebounced(value, ms) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function titleFor(request) {
  const match = SCENARIOS.find((s) => s.brief === request?.brief)
  if (match) return match.label
  const words = request?.brief.split(/\s+/).slice(0, 6).join(' ')
  return words ? `${words}…` : 'Your plan'
}

export default function App() {
  const debate = useDebate()
  const [profile, setProfile] = useState(loadProfile)
  const [editingProfile, setEditingProfile] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [override, setOverride] = useState(null)

  const briefForScene = useDebounced(debate.status === 'idle' ? draft.brief : (debate.request?.brief ?? ''), 220)
  const detected = useMemo(() => detectScene(briefForScene), [briefForScene])
  const showOnboarding = !profile || editingProfile
  const page = showOnboarding ? 'onboarding' : debate.status === 'idle' ? 'planner' : 'debate'
  const sceneId = page === 'onboarding' ? 'everyday' : (override ?? detected)
  const palette = SCENES[sceneId].palette

  useEffect(() => {
    document.body.style.background = palette.bottom
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.top)
  }, [palette])

  const finishProfile = (p) => {
    saveProfile(p)
    setProfile(p)
    setEditingProfile(false)
  }
  const send = (request) => {
    window.scrollTo({ top: 0 })
    debate.start(request)
  }
  const newPlan = () => {
    debate.reset()
    setDraft(EMPTY_DRAFT)
    setOverride(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const editPlan = () => {
    debate.reset()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const style = {
    '--ink': palette.ink,
    '--soft': palette.soft,
    '--accent': palette.accent,
    '--accent-ink': palette.accentInk,
    '--card': palette.card,
    '--line': palette.line,
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${palette.dark ? 'is-dark' : 'is-light'}`} style={style}>
        <Scene sceneId={sceneId} dimmed={page === 'debate'} />
        <TopBar profile={showOnboarding ? null : profile} onHome={newPlan} onProfile={() => setEditingProfile(true)} demo={DEMO} />
        <AnimatePresence mode="wait">
          {page === 'onboarding' && (
            <Onboarding key="onboarding" initial={editingProfile ? profile : null} onDone={finishProfile} onCancel={() => setEditingProfile(false)} />
          )}
          {page === 'planner' && (
            <Planner key="planner" profile={profile} draft={draft} setDraft={setDraft} sceneId={sceneId} sceneAuto={!override} onPickScene={setOverride} onSend={send} />
          )}
          {page === 'debate' && (
            <DebateView key="debate" debate={debate} profile={profile} sceneId={sceneId} title={titleFor(debate.request)} onNew={newPlan} onEdit={editPlan} />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
