import { AnimatePresence, MotionConfig } from 'motion/react'
import { useState } from 'react'
import ChatHeader from './components/ChatHeader'
import ComposerBar from './components/ComposerBar'
import EmptyState from './components/EmptyState'
import Thread from './components/Thread'
import { EMPTY_CONSTRAINTS } from './constraints'
import { useDebate } from './hooks/useDebate'
import { SCENARIOS } from './scenarios'

const EMPTY_DRAFT = { brief: '', constraints: EMPTY_CONSTRAINTS, active: null, open: false }

function titleFor(debate, draft) {
  if (debate.status === 'idle') return 'New council'
  const match = SCENARIOS.find((s) => s.brief === debate.request?.brief)
  if (match) return match.label
  const words = debate.request?.brief.split(/\s+/).slice(0, 5).join(' ')
  return words ? `${words}…` : draft.active || 'Your plan'
}

export default function App() {
  const debate = useDebate()
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  const send = (request) => {
    window.scrollTo({ top: 0 })
    debate.start(request)
  }
  const newPlan = () => {
    debate.reset()
    setDraft(EMPTY_DRAFT)
  }
  const editBrief = () => {
    // keep the draft as it was sent, so it can be tweaked and resent
    debate.reset()
    setDraft((d) => ({ ...d, open: true }))
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <ChatHeader debate={debate} title={titleFor(debate, draft)} onBack={newPlan} />
        <main className="main">
          <AnimatePresence mode="wait">
            {debate.status === 'idle' ? <EmptyState key="empty" setDraft={setDraft} /> : <Thread key="thread" debate={debate} />}
          </AnimatePresence>
        </main>
        <ComposerBar draft={draft} setDraft={setDraft} onSend={send} status={debate.status} onNew={newPlan} onEdit={editBrief} />
      </div>
    </MotionConfig>
  )
}
