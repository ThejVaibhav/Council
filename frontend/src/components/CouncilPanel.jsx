import { Check } from 'lucide-react'
import { AGENTS, SEATS } from '../agents'
import AgentAvatar from './AgentAvatar'
import Stage from './Stage'

const STEPS = ['Brief', 'Round 1', 'Round 2', 'Verdict']

// Left panel: the live council table, where the debate is, and what each seat is doing.
export default function CouncilPanel({ council, status }) {
  const { step, seats } = council
  return (
    <aside className={`panel council-panel ${status !== 'idle' ? 'in-session' : ''}`} aria-label="Council status">
      <div className="panel-head">
        <h2>Council table</h2>
        <span className={`live ${status === 'running' || status === 'moderating' ? 'is-live' : ''}`}>
          {status === 'idle' ? 'Waiting for a brief' : status === 'done' ? 'Finished' : status === 'error' ? 'Stopped' : 'Live'}
        </span>
      </div>
      <Stage council={council} />

      <ol className="stepper" aria-label="Debate progress">
        {STEPS.map((label, i) => {
          const state = step > i ? 'done' : step === i ? 'current' : 'todo'
          return (
            <li key={label} className={`step step-${state}`}>
              <span className="step-mark">{state === 'done' ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
              <span className="step-label">{label}</span>
            </li>
          )
        })}
      </ol>

      <ul className="roster">
        {SEATS.map((a) => (
          <li key={a} className={`roster-row pose-${seats[a].pose}`}>
            <AgentAvatar agent={a} />
            <div className="roster-text">
              <span className="roster-name">{AGENTS[a].name}</span>
              <span className="roster-role">{AGENTS[a].role}</span>
            </div>
            <span className="roster-status">{seats[a].status}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
