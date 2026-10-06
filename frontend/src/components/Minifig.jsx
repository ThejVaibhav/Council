import { motion } from 'motion/react'

// A doodled LEGO-style figure. Its pose is driven by what the agent is doing in the debate.
const POSES = {
  idle: { rise: 0, L: 10, R: -10, breathe: true },
  listening: { rise: 0, L: 10, R: -10, breathe: true },
  thinking: { rise: 0, L: 10, R: -158, breathe: true },
  speaking: { rise: -16, L: 38, R: -80, gesture: true },
  flag: { rise: -16, L: 12, R: -172, prop: 'flag' },
  support: { rise: -10, L: 12, R: -150, prop: 'thumb' },
  offline: { rise: 5, L: 3, R: -3 },
  notes: { rise: 0, L: -38, R: 32, prop: 'clipboard', write: true, breathe: true },
  synthesizing: { rise: -14, L: -38, R: 32, prop: 'clipboard', write: true, fast: true },
  cheer: { rise: -12, L: 158, R: -158, jump: true },
}

const spring = { type: 'spring', stiffness: 170, damping: 16 }

function Mouth({ pose }) {
  if (pose === 'speaking' || pose === 'synthesizing') return <ellipse cx="0" cy="29.5" rx="4" ry="3.2" className="ink-fill" />
  if (pose === 'cheer') return <path d="M-8 26 Q0 37 8 26 Z" className="ink-fill" />
  if (pose === 'thinking' || pose === 'offline') return <path d="M-5 29 L5 29" className="ink-line" />
  if (pose === 'flag') return <path d="M-6 31 Q0 26 6 31" className="ink-line" />
  return <path d="M-7 27 Q0 33 7 27" className="ink-line" />
}

function Emblem({ agent }) {
  switch (agent) {
    case 'budget':
      return (
        <g>
          <circle cx="0" cy="63" r="8" className="emblem" />
          <path d="M-3 59 H3 M-3 62 H3 M-2 59 Q4 60 -1 66 L3 68" className="emblem-line" />
        </g>
      )
    case 'logistics':
      return (
        <g>
          <circle cx="0" cy="63" r="8" className="emblem" />
          <path d="M0 56 L2.5 63 L0 70 L-2.5 63 Z" className="emblem-needle" />
        </g>
      )
    case 'vibe':
      return <path d="M0 70 C-10 63 -8 55 -3 56 C-1 56.5 0 58 0 59 C0 58 1 56.5 3 56 C8 55 10 63 0 70 Z" className="emblem" />
    default:
      return <path d="M-3 44 L3 44 L5 49 L0 66 L-5 49 Z" className="tie" />
  }
}

function Prop({ kind }) {
  if (kind === 'flag')
    return (
      <g>
        <path d="M0 36 L0 -2" className="ink-line" />
        <path d="M0 -2 L20 4 L0 11 Z" className="flag" />
      </g>
    )
  if (kind === 'clipboard')
    return (
      <g transform="translate(0 30) rotate(20)">
        <rect x="-11" y="-2" width="22" height="28" rx="3" className="clipboard" />
        <rect x="-5" y="-5" width="10" height="5" rx="1.5" className="ink-fill" />
        <path d="M-6 7 H6 M-6 12 H6 M-6 17 H2" className="ink-line thin" />
      </g>
    )
  return null
}

function Arm({ side, angle, pose, color, delay }) {
  const p = POSES[pose]
  const x = side === 'L' ? -22 : 22
  let rotate = angle
  let transition = spring
  if (p.gesture && side === 'R') {
    rotate = [angle, angle - 28, angle + 6, angle]
    transition = { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay }
  } else if (p.write && side === 'R') {
    rotate = [angle, angle + 12, angle - 4, angle]
    transition = { duration: p.fast ? 0.45 : 1.2, repeat: Infinity, ease: 'easeInOut' }
  } else if (p.jump) {
    rotate = [angle, angle + (side === 'L' ? -14 : 14), angle]
    transition = { duration: 0.5, repeat: 3, ease: 'easeInOut', delay }
  }
  const prop = (side === 'R' && (p.prop === 'flag' || p.prop === 'thumb')) || (side === 'L' && p.prop === 'clipboard') ? p.prop : null
  return (
    <g transform={`translate(${x} 48)`}>
      <motion.g initial={false} animate={{ rotate }} transition={transition} style={{ originX: 0.5, originY: 0.5 }}>
        <rect x="-60" y="-60" width="120" height="120" fill="none" stroke="none" />
        <rect x="-5.5" y="-3" width="11" height="31" rx="5.5" fill={color} className="ink-stroke" />
        {prop === 'thumb' ? (
          <g>
            <circle cx="0" cy="34" r="6" className="skin" />
            <rect x="-2.6" y="38" width="5.2" height="9" rx="2.6" className="skin" />
          </g>
        ) : (
          <g>
            <circle cx="0" cy="34" r="6" className="skin" />
            <path d="M-2.5 38 L2.5 38" className="ink-line thin" />
          </g>
        )}
        {prop && prop !== 'thumb' && <Prop kind={prop} />}
      </motion.g>
    </g>
  )
}

export default function Minifig({ agent, pose = 'idle', x, y, scale = 1, look = 0, delay = 0 }) {
  const p = POSES[pose] ?? POSES.idle
  const color = `var(--${agent})`
  let animate = { y: p.rise, opacity: pose === 'offline' ? 0.45 : 1 }
  let transition = spring
  if (p.breathe) {
    animate = { ...animate, y: [p.rise, p.rise - 1.6, p.rise] }
    transition = { y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay }, opacity: { duration: 0.3 } }
  } else if (p.jump) {
    animate = { ...animate, y: [0, p.rise - 10, p.rise, p.rise - 10, 0] }
    transition = { y: { duration: 1.4, ease: 'easeInOut', delay } }
  }

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <motion.g initial={false} animate={animate} transition={transition}>
        {/* legs and hips sit behind the table edge when seated */}
        <rect x="-27" y="94" width="25" height="30" rx="3" className="legs" />
        <rect x="2" y="94" width="25" height="30" rx="3" className="legs" />
        <rect x="-28" y="86" width="56" height="9" rx="2" className="hips" />
        <Arm side="L" angle={p.L} pose={pose} color={color} delay={delay} />
        <path d="M-22 43 L22 43 L28 87 L-28 87 Z" fill={color} className="ink-stroke" />
        <Emblem agent={agent} />
        <rect x="-8" y="37" width="16" height="7" className="skin" />
        <rect x="-9" y="0" width="18" height="8" rx="2" className="skin" />
        <rect x="-20" y="6" width="40" height="33" rx="10" className="skin" />
        <motion.g initial={false} animate={{ x: look }} transition={{ duration: 0.4 }}>
          {pose === 'offline' ? (
            <path d="M-10 20 H-4 M4 20 H10" className="ink-line" />
          ) : (
            <>
              <circle cx="-7" cy="20" r="2.5" className="ink-fill" />
              <circle cx="7" cy="20" r="2.5" className="ink-fill" />
            </>
          )}
          {pose === 'flag' && <path d="M-11 13 L-4 15 M11 13 L4 15" className="ink-line thin" />}
          <Mouth pose={pose} />
        </motion.g>
        <Arm side="R" angle={p.R} pose={pose} color={color} delay={delay} />
      </motion.g>
    </g>
  )
}
