import { AnimatePresence, MotionConfig } from 'motion/react'
import Council from './components/Council'
import Header from './components/Header'
import Landing from './components/Landing'
import Landscape from './components/Landscape'
import { useDebate } from './hooks/useDebate'

export default function App() {
  const debate = useDebate()
  const inCouncil = debate.status !== 'idle'

  const goHome = () => {
    debate.reset()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const begin = (request) => {
    window.scrollTo({ top: 0 })
    debate.start(request)
  }

  return (
    <MotionConfig reducedMotion="user">
      <Landscape dimmed={inCouncil} />
      <div className="shell">
        <Header onHome={goHome} compact={inCouncil} />
        <AnimatePresence mode="wait">
          {inCouncil ? <Council key="council" debate={debate} onNew={goHome} /> : <Landing key="landing" onSubmit={begin} />}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
