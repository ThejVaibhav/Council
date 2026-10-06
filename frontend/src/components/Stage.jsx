import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { SEATS } from '../agents'
import Minifig from './Minifig'

const W = 520
const VIEW = '0 18 520 230'
const SEAT_X = { budget: 82, logistics: 202, vibe: 322, moderator: 442 }
const FIG_Y = 87
const SCALE = 1.2
const TABLE_Y = 186

// Each agent's tool sits on the table in front of them and lifts when that agent has the floor.
function TableItem({ agent, active }) {
  const x = SEAT_X[agent]
  const lift = active ? -5 : 0
  return (
    <motion.g initial={false} animate={{ y: lift }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}>
      <g transform={`translate(${x} ${TABLE_Y - 2})`}>
        {agent === 'budget' && (
          <g>
            <ellipse cx="-4" cy="0" rx="13" ry="4.5" className="coin" />
            <ellipse cx="-4" cy="-5" rx="13" ry="4.5" className="coin" />
            <ellipse cx="-4" cy="-10" rx="13" ry="4.5" className="coin" />
            <ellipse cx="18" cy="0" rx="9" ry="3.5" className="coin" />
          </g>
        )}
        {agent === 'logistics' && (
          <g>
            <path d="M-26 2 L-18 -14 L22 -14 L28 2 Z" className="paper" />
            <path d="M-14 -3 C-6 -12 4 -2 14 -10" className="route" />
            <circle cx="14" cy="-10" r="2.6" className="pin" />
          </g>
        )}
        {agent === 'vibe' && (
          <g transform="rotate(-6)">
            <rect x="-14" y="-17" width="26" height="18" rx="2" className="note" />
            <path d="M-1 -3 C-8 -8 -6 -14 -2.5 -13 C-1.5 -12.8 -1 -12 -1 -11 C-1 -12 -0.5 -12.8 0.5 -13 C4 -14 6 -8 -1 -3 Z" className="heart" />
          </g>
        )}
        {agent === 'moderator' && (
          <g>
            <rect x="-6" y="-6" width="30" height="7" rx="3.5" className="gavel" transform="rotate(-12)" />
            <rect x="-20" y="-3" width="12" height="5" rx="2" className="ink-fill" />
          </g>
        )}
      </g>
    </motion.g>
  )
}

function Bubble({ agent, children, kind = 'say' }) {
  return (
    <motion.div
      className={`bubble bubble-${kind} seat-${agent}`}
      style={{ left: `${(SEAT_X[agent] / W) * 100}%` }}
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      {children}
    </motion.div>
  )
}

export default function Stage({ council }) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const { seats, speaker } = council

  return (
    <div className="stage" role="img" aria-label="The council table, showing what each agent is doing">
      <div className="stage-inner">
      <svg viewBox={VIEW} className="stage-svg">
        <defs>
          <filter id={`doodle-${id}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="2">
              {!reduce && <animate attributeName="seed" values="2;5;8" dur="0.75s" calcMode="discrete" repeatCount="indefinite" />}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
        </defs>
        <g filter={`url(#doodle-${id})`}>
          <path d={`M10 ${TABLE_Y + 46} H${W - 10}`} className="floor" />
          {SEATS.map((a) => (
            <rect key={`chair-${a}`} x={SEAT_X[a] - 40} y={FIG_Y + 30} width="80" height={TABLE_Y - FIG_Y - 24} rx="14" className="chair" />
          ))}
          {SEATS.map((a, i) => {
            const look = speaker && speaker !== a ? Math.sign(SEAT_X[speaker] - SEAT_X[a]) * 2.4 : 0
            return <Minifig key={a} agent={a} pose={seats[a].pose} x={SEAT_X[a]} y={FIG_Y} scale={SCALE} look={look} delay={i * 0.35} />
          })}
          <rect x="18" y={TABLE_Y} width={W - 36} height="18" rx="7" className="table-top" />
          <path d={`M44 ${TABLE_Y + 18} L40 ${TABLE_Y + 46} M${W - 44} ${TABLE_Y + 18} L${W - 40} ${TABLE_Y + 46}`} className="table-leg" />
          {SEATS.map((a) => (
            <TableItem key={`item-${a}`} agent={a} active={speaker === a} />
          ))}
        </g>
      </svg>
      <div className="bubbles">
        <AnimatePresence>
          {SEATS.map((a) => {
            const s = seats[a]
            if (s.pose === 'thinking' || s.pose === 'synthesizing')
              return (
                <Bubble key={`${a}-think`} agent={a} kind="think">
                  <span className="dots"><i /><i /><i /></span>
                </Bubble>
              )
            if (s.bubble)
              return (
                <Bubble key={`${a}-say-${s.bubble}`} agent={a}>
                  {s.bubble}
                </Bubble>
              )
            if (s.pose === 'offline')
              return (
                <Bubble key={`${a}-off`} agent={a} kind="off">
                  offline
                </Bubble>
              )
            return null
          })}
        </AnimatePresence>
      </div>
      </div>
    </div>
  )
}
