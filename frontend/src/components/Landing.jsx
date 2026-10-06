import { motion } from 'motion/react'
import { Sparkle } from 'lucide-react'
import { AGENTS } from '../agents'
import Composer from './Composer'
import Scribble from './Scribble'
import AgentAvatar from './AgentAvatar'
import { DEMO } from '../hooks/useDebate'

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
})

const STEPS = [
  { n: '01', title: 'Drop the brief', text: 'Who, where, how much, and the vibe. One message.' },
  { n: '02', title: 'Watch them argue', text: 'Three agents pitch, then push back on each other, live.' },
  { n: '03', title: 'Get the verdict', text: 'One plan, plus exactly whose concern won and why.' },
]

export default function Landing({ onSubmit }) {
  return (
    <motion.main className="landing" exit={{ opacity: 0, y: -30, transition: { duration: 0.4 } }}>
      <section className="hero">
        <motion.div className="eyebrow" {...rise(0.05)}>
          <Sparkle size={14} fill="currentColor" strokeWidth={0} /> AI-powered group planning
        </motion.div>
        <motion.h1 {...rise(0.12)}>
          Three perspectives.
          <br />
          One <em>perfect</em> plan.
        </motion.h1>
        <motion.p className="lede" {...rise(0.2)}>
          Three AI agents debate the options. A moderator makes the call, and tells you why.
        </motion.p>
        <Scribble className="scribble-left">
          Less overthinking.
          <br />
          More trips.
        </Scribble>
        <Scribble className="scribble-right" arrow="down-left">
          Plan with
          <br />
          your crew
        </Scribble>
      </section>

      <motion.div className="composer-wrap" {...rise(0.3)}>
        <Composer onSubmit={onSubmit} />
        <Scribble className="scribble-cta" arrow="left">
          Let the agents
          <br />
          debate and decide
        </Scribble>
        {DEMO && (
          <p className="demo-note">
            Preview build: the council plays a scripted sample debate for each example. A custom brief replays the weekend trip.
          </p>
        )}
      </motion.div>

      <section id="how" className="how">
        <h2>
          Meet the <em>council</em>
        </h2>
        <div className="council-cards">
          {Object.entries(AGENTS).map(([key, a], i) => (
            <motion.div
              key={key}
              className={`council-card glass agent-${key}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <AgentAvatar agent={key} size="lg" />
              <h3>{a.name}</h3>
              <p>{a.role}</p>
            </motion.div>
          ))}
        </div>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="step-n">{s.n}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </motion.main>
  )
}
