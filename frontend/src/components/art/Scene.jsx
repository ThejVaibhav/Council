import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { SCENES } from '../../scenes'
import { Icon } from './Icons'

// Deterministic randomness so a scene looks the same every time it appears.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COLORS = {
  confetti: ['#ffbe0b', '#ff5d8f', '#7c4dff', '#06d6a0', '#3a86ff'],
  balloon: ['#ff5d8f', '#7c4dff', '#ffbe0b', '#3a86ff', '#06d6a0'],
  heart: ['#ff6b9a', '#ff8fb1', '#e0457b', '#ffc2d4'],
  note: ['#00e0c6', '#e0479e', '#ffd166'],
  leaf: ['#7fb069', '#e9a23b', '#c8553d'],
  fish: ['#ffb703', '#fb8500', '#ff6b6b', '#4cc9f0'],
}

function wavePath(y, amp, len, width = 2880, h = 300) {
  let d = `M0 ${y} Q${len / 4} ${y - amp} ${len / 2} ${y}`
  for (let x = len / 2; x < width; x += len / 2) d += ` T${x + len / 2} ${y}`
  return `${d} V${h} H0Z`
}

function Ground({ kind }) {
  switch (kind) {
    case 'waves':
      return (
        <div className="ground ground-sea">
          <svg viewBox="0 0 1440 300" preserveAspectRatio="none" className="sea-svg">
            <g className="wave wave-1"><path d={wavePath(70, 18, 360)} fill="#7fd3e6" /></g>
            <g className="wave wave-2"><path d={wavePath(110, 14, 480)} fill="#3fb0cc" /></g>
            <g className="wave wave-3"><path d={wavePath(160, 12, 360)} fill="#1f8fb0" /></g>
          </svg>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`fish fish-${i}`}>
              <Icon name="fish" size={i % 2 ? 30 : 40} color={COLORS.fish[i % 4]} />
            </div>
          ))}
        </div>
      )
    case 'hills':
      return (
        <div className="ground">
          <div className="mist" />
          <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className="ground-svg">
            <path d="M0 170 C200 90 360 120 520 150 C700 60 900 80 1080 140 C1220 90 1340 100 1440 130 V320 H0Z" fill="#b9d4b5" />
            <path d="M0 220 C180 170 340 200 520 210 C700 150 880 170 1060 210 C1240 170 1360 190 1440 200 V320 H0Z" fill="#8fb98c" />
            {[90, 150, 1210, 1290, 1350].map((x, i) => (
              <path key={x} d={`M${x} ${250 - (i % 2) * 14} l22 ${-56 - (i % 3) * 10} l22 ${56 + (i % 3) * 10}Z`} fill="#4f7d55" />
            ))}
            <path d="M0 270 C200 240 420 255 720 262 C1000 268 1240 245 1440 255 V320 H0Z" fill="#6b9a6a" />
          </svg>
        </div>
      )
    case 'camp':
      return (
        <>
          <div className="moon" />
          <div className="ground">
            <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className="ground-svg">
              <path d="M0 190 C220 120 420 150 620 180 C820 110 1040 130 1220 170 C1320 150 1400 160 1440 165 V320 H0Z" fill="#231d44" />
              <path d="M0 250 C260 215 520 235 760 245 C1000 255 1240 230 1440 240 V320 H0Z" fill="#17132f" />
              <path d="M1300 252 l62 -84 l62 84Z" fill="#c2553a" />
              <path d="M1362 168 l-16 84 h32Z" fill="#7a2f22" />
            </svg>
            <div className="campfire">
              <span className="flame f1" /><span className="flame f2" /><span className="flame f3" />
              <span className="logs" />
            </div>
          </div>
        </>
      )
    case 'snow':
      return (
        <div className="ground">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className="ground-svg">
            <path d="M0 180 C240 120 420 150 640 170 C860 110 1080 130 1260 160 C1360 145 1410 150 1440 152 V320 H0Z" fill="#dbe8f5" />
            {[110, 170, 1220, 1300].map((x, i) => (
              <g key={x}>
                <path d={`M${x} ${240 - i * 6} l26 -70 l26 70Z`} fill="#3d6b5a" />
                <path d={`M${x + 14} ${200 - i * 6} l12 -30 l12 30 q-12 6 -24 0Z`} fill="#ffffff" />
              </g>
            ))}
            <path d="M0 250 C260 225 520 240 760 248 C1000 256 1240 236 1440 244 V320 H0Z" fill="#ffffff" />
          </svg>
        </div>
      )
    case 'road':
      return (
        <div className="ground">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className="ground-svg">
            <path d="M0 180 C240 130 460 150 700 170 C940 120 1180 140 1440 160 V320 H0Z" fill="#e9a86a" />
            <path d="M0 230 C300 205 600 215 900 222 C1150 228 1300 215 1440 220 V320 H0Z" fill="#c98a52" />
          </svg>
          <div className="road">
            <div className="road-line" />
            <div className="car">
              <svg viewBox="0 0 120 56" width="120" height="56" aria-hidden="true">
                <path d="M10 36c0-8 6-12 14-12l14-12h40l16 12h12c6 0 10 4 10 10v8H10Z" fill="#1f6f78" />
                <path d="M42 15h18v10H32Zm22 0h12l12 10H64Z" fill="#cfeef0" />
                <circle cx="32" cy="44" r="9" fill="#2b2320" /><circle cx="32" cy="44" r="3.5" fill="#ddd" />
                <circle cx="96" cy="44" r="9" fill="#2b2320" /><circle cx="96" cy="44" r="3.5" fill="#ddd" />
              </svg>
            </div>
          </div>
        </div>
      )
    case 'bunting':
      return (
        <svg className="bunting" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 20 Q720 110 1440 20" stroke="#6a5680" strokeWidth="2" fill="none" />
          {Array.from({ length: 18 }, (_, i) => {
            const x = 40 + i * 80
            const t = x / 1440
            const y = 20 + 180 * t * (1 - t)
            return <path key={i} className="flag" d={`M${x - 18} ${y} L${x + 18} ${y} L${x} ${y + 34}Z`} fill={COLORS.confetti[i % 5]} />
          })}
        </svg>
      )
    case 'lights':
      return (
        <svg className="bunting" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 16 Q720 90 1440 16" stroke="#3a1f14" strokeWidth="2" fill="none" opacity="0.6" />
          {Array.from({ length: 16 }, (_, i) => {
            const x = 45 + i * 90
            const t = x / 1440
            const y = 16 + 148 * t * (1 - t)
            return <circle key={i} className="bulb" style={{ animationDelay: `${(i % 5) * 0.4}s` }} cx={x} cy={y + 10} r="7" fill="#ffd27a" />
          })}
        </svg>
      )
    case 'skyline':
      return (
        <div className="ground">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className="ground-svg">
            {[[0, 160, 90], [100, 110, 70], [180, 190, 110], [300, 140, 80], [390, 210, 60], [1000, 180, 90], [1100, 120, 70], [1180, 220, 100], [1290, 150, 80], [1370, 190, 70]].map(([x, h, w]) => (
              <rect key={x} x={x} y={320 - h} width={w} height={h} fill="#151030" />
            ))}
            {Array.from({ length: 40 }, (_, i) => {
              const bx = [0, 100, 180, 300, 1000, 1100, 1180, 1290][i % 8]
              return <rect key={i} className="window" style={{ animationDelay: `${(i * 0.37) % 4}s` }} x={bx + 12 + (i % 3) * 18} y={190 + (i % 5) * 22} width="8" height="10" fill="#ffd166" />
            })}
          </svg>
          <div className="neon-line" />
        </div>
      )
    case 'bokeh':
      return (
        <div className="bokeh">
          {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={`orb orb-${i}`} />)}
        </div>
      )
    default:
      return (
        <div className="ground">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className="ground-svg">
            <path d="M0 220 C300 180 540 200 760 215 C980 230 1200 195 1440 205 V320 H0Z" fill="#ead8bf" />
            <path d="M0 265 C320 245 640 255 900 262 C1160 268 1300 255 1440 258 V320 H0Z" fill="#e2c9a6" />
          </svg>
        </div>
      )
  }
}

function Particles({ scene, sceneId }) {
  const items = useMemo(() => {
    const rand = rng([...sceneId].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7))
    const out = []
    scene.particles.forEach((p) => {
      for (let i = 0; i < p.count; i++) {
        const size = p.size[0] + rand() * (p.size[1] - p.size[0])
        const side = rand() < 0.5
        const x = p.motion === 'bob' ? (side ? 1 + rand() * 8 : 91 + rand() * 6) : rand() * 96
        out.push({
          key: `${p.icon}-${i}`,
          icon: p.icon,
          motion: p.motion,
          size,
          x,
          y: p.motion === 'bob' ? 18 + rand() * 60 : p.motion === 'drift' ? 2 + rand() * 11 : rand() * 90,
          dur: { rise: 12, fall: 11, drift: 40, bob: 6, twinkle: 3.5 }[p.motion] * (0.7 + rand() * 0.7),
          delay: -rand() * 20,
          rot: rand() * 40 - 20,
          color: COLORS[p.icon] ? COLORS[p.icon][i % COLORS[p.icon].length] : undefined,
        })
      }
    })
    return out
  }, [scene, sceneId])

  return (
    <div className="particles" aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.key}
          className={`p p-${p.motion}`}
          style={{ left: `${p.x}%`, '--y': `${p.y}%`, '--dur': `${p.dur}s`, '--delay': `${p.delay}s`, '--rot': `${p.rot}deg` }}
        >
          <Icon name={p.icon} size={p.size} color={p.color} />
        </span>
      ))}
    </div>
  )
}

export default function Scene({ sceneId, dimmed = false }) {
  const scene = SCENES[sceneId] ?? SCENES.everyday
  const { top, bottom } = scene.palette
  return (
    <div className={`scene ${dimmed ? 'scene-dimmed' : ''}`} aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.div
          key={sceneId}
          className={`scene-layer scene-${sceneId}`}
          style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          {!scene.palette.dark && scene.ground !== 'bunting' && scene.ground !== 'lights' && <div className="sun" />}
          <Ground kind={scene.ground} />
          <Particles scene={scene} sceneId={sceneId} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
