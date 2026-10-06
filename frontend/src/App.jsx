import { AnimatePresence, MotionConfig } from 'motion/react'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import Composer from './components/Composer'
import CouncilPanel from './components/CouncilPanel'
import Session from './components/Session'
import { EMPTY_CONSTRAINTS } from './constraints'
import { deriveCouncil } from './councilState'
import { useDebate } from './hooks/useDebate'

function Logo() {
  // Four studs: the three specialists and the moderator.
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="logo-mark">
      <rect x="1" y="1" width="20" height="20" rx="5" className="logo-plate" />
      <circle cx="7.5" cy="7.5" r="3" fill="var(--budget)" />
      <circle cx="14.5" cy="7.5" r="3" fill="var(--logistics)" />
      <circle cx="7.5" cy="14.5" r="3" fill="var(--vibe)" />
      <circle cx="14.5" cy="14.5" r="3" fill="var(--moderator)" />
    </svg>
  )
}

export default function App() {
  const debate = useDebate()
  const [draft, setDraft] = useState({ brief: '', constraints: EMPTY_CONSTRAINTS, active: null })
  const council = useMemo(() => deriveCouncil(debate), [debate])
  const inSession = debate.status !== 'idle'
  const live = debate.status === 'running' || debate.status === 'moderating'

  const start = (request) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    debate.start(request)
  }
  const backToBrief = () => debate.reset()
  const newPlan = () => {
    debate.reset()
    setDraft({ brief: '', constraints: EMPTY_CONSTRAINTS, active: null })
  }

  return (
    <MotionConfig reducedMotion="user">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="brand" onClick={newPlan}>
            <Logo /> Council
          </button>
          {inSession && !live && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={newPlan}>
              <Plus size={14} /> New plan
            </button>
          )}
        </div>
      </header>
      <main className="layout">
        <CouncilPanel council={council} status={debate.status} />
        <div className="workspace">
          <AnimatePresence mode="wait">
            {inSession ? (
              <Session key="session" debate={debate} onEdit={backToBrief} />
            ) : (
              <Composer key="composer" draft={draft} setDraft={setDraft} onSubmit={start} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </MotionConfig>
  )
}
