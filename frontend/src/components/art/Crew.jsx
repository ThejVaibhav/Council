import { SCENES } from '../../scenes'
import { HAIR, SKIN, partnerFor, userPerson, COMPANIONS } from './people'
import { Icon } from './Icons'

const INK = '#2b2320'
const SHOE = '#2b2320'

// An arm drawn from the shoulder; the invisible square keeps the rotation centred on the shoulder.
function Arm({ from, to, color, skin, className, children }) {
  const [sx, sy] = from
  return (
    <g className={className}>
      <rect x={sx - 70} y={sy - 70} width="140" height="140" fill="none" />
      <path d={`M${sx} ${sy} L${to[0]} ${to[1]}`} stroke={color} strokeWidth="11" strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1] + 2} r="5.5" fill={skin} />
      {children}
    </g>
  )
}

function Leg({ x, top, bottom, pants, skin, shortsTo, className }) {
  return (
    <g className={className}>
      <rect x={x - 70} y={top - 70} width="140" height="140" fill="none" />
      {shortsTo ? (
        <>
          <rect x={x - 6.5} y={top} width="13" height={shortsTo - top} rx="5" fill={pants} />
          <rect x={x - 5} y={shortsTo - 2} width="10" height={bottom - shortsTo + 2} rx="4" fill={skin} />
        </>
      ) : (
        <rect x={x - 6.5} y={top} width="13" height={bottom - top} rx="5" fill={pants} />
      )}
      <rect x={x - 8} y={bottom - 2} width="17" height="9" rx="4.5" fill={SHOE} />
    </g>
  )
}

function Hair({ style, color, part }) {
  if (part === 'back') {
    if (style === 'long') return <path d="M31 44C30 22 50 22 50 22s20 0 19 22l2 36c-10 6-31 6-42 0Z" fill={color} />
    if (style === 'bob') return <path d="M31 44c-1-20 19-22 19-22s20 2 19 22l1 16c-6 4-34 4-40 0Z" fill={color} />
    return null
  }
  switch (style) {
    case 'short':
      return <path d="M33 42c-1-19 7-21 17-21s18 3 17 21c-1-8-6-11-13-11-6 3-14 3-19 0-1 4-2 7-2 11Z" fill={color} />
    case 'bun':
      return (
        <g fill={color}>
          <circle cx="50" cy="19" r="8" />
          <path d="M33 42c-1-17 7-20 17-20s18 3 17 20c-3-7-9-10-17-10s-14 3-17 10Z" />
        </g>
      )
    case 'curly':
      return (
        <g fill={color}>
          {[[36, 32], [42, 25], [50, 23], [58, 25], [64, 32], [34, 40], [66, 40]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="7" />
          ))}
        </g>
      )
    default:
      return <path d="M33 41c2-13 9-16 17-16s15 3 17 16c-6-7-11-9-17-8-7 1-12 3-17 8Z" fill={color} />
  }
}

export function Person({ person, outfit, pose = 'stand', delay = 0, gearInHand }) {
  const skin = SKIN[person.skin] ?? SKIN[1]
  const hairColor = HAIR[person.hairColor] ?? HAIR[0]
  const { shirt, pants, shorts, hat, shades, scarf, gear, dress } = outfit
  const wearsDress = dress && person.look === 'female'

  const armL = pose === 'holdL' ? [16, 112] : [27, 120]
  const armR = pose === 'holdR' ? [84, 112] : pose === 'wave' ? [84, 42] : [73, 120]
  const walking = pose === 'walk'

  return (
    <g className={`fig ${walking ? 'fig-walk' : ''}`} style={{ '--delay': `${delay}s` }}>
      {gear === 'backpack' && <rect x="27" y="74" width="46" height="50" rx="12" fill="#6b5a4a" />}
      <Hair style={person.hair} color={hairColor} part="back" />
      <Leg x={42} top={124} bottom={186} pants={pants} skin={skin} shortsTo={shorts || wearsDress ? 150 : 0} className={walking ? 'leg leg-a' : 'leg'} />
      <Leg x={58} top={124} bottom={186} pants={pants} skin={skin} shortsTo={shorts || wearsDress ? 150 : 0} className={walking ? 'leg leg-b' : 'leg'} />
      <Arm from={[34, 78]} to={armL} color={shirt} skin={skin} className={walking ? 'arm arm-swing-a' : 'arm'}>
        {gearInHand === 'left' && <g transform={`translate(${armL[0] - 12} ${armL[1] - 26})`}><Icon name="rose" size={24} /></g>}
      </Arm>
      <rect x="45" y="55" width="10" height="18" rx="4" fill={skin} />
      {wearsDress ? (
        <path d="M33 84c0-9 6-14 13-14h8c7 0 13 5 13 14l7 68H26Z" fill={shirt} />
      ) : (
        <path d="M30 84c0-9 6-14 14-14h12c8 0 14 5 14 14l-2 44H32Z" fill={shirt} />
      )}
      {gear === 'backpack' && <path d="M38 72l-2 34m26-34 2 34" stroke="#4a3c30" strokeWidth="4" strokeLinecap="round" />}
      {scarf && <path d="M38 66h24v9H38Zm16 6h8v20h-8Z" fill="#d64545" />}
      <circle cx="50" cy="42" r="17" fill={skin} />
      <Hair style={person.hair} color={hairColor} />
      {person.beard && <path d="M37 45c2 14 8 16 13 16s11-2 13-16c-4 7-8 8-13 8s-9-1-13-8Z" fill={hairColor} />}
      <circle cx="44" cy="44" r="1.8" fill={INK} />
      <circle cx="56" cy="44" r="1.8" fill={INK} />
      <circle cx="40" cy="50" r="3" fill="#ff8a80" opacity="0.3" />
      <circle cx="60" cy="50" r="3" fill="#ff8a80" opacity="0.3" />
      <path d="M46 51q4 3 8 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {shades && (
        <g>
          <rect x="38" y="40" width="10" height="7" rx="3" fill={INK} />
          <rect x="52" y="40" width="10" height="7" rx="3" fill={INK} />
          <path d="M48 43h4" stroke={INK} strokeWidth="1.5" />
        </g>
      )}
      {hat === 'cap' && (
        <g>
          <path d="M33 37c0-12 7-17 17-17s17 5 17 17Z" fill={shirt} />
          <path d="M50 35h27c0 4-3 5-8 5H50Z" fill={shirt} />
          <path d="M50 35h27c0 4-3 5-8 5H50Z" fill="#000" opacity="0.18" />
        </g>
      )}
      {hat === 'beanie' && (
        <g>
          <path d="M32 38c0-14 8-20 18-20s18 6 18 20Z" fill={shirt} />
          <rect x="31" y="34" width="38" height="7" rx="3.5" fill="#000" opacity="0.22" />
          <circle cx="50" cy="17" r="5" fill="#fff" />
        </g>
      )}
      {hat === 'party' && (
        <g>
          <path d="M40 27 50 2l10 25Z" fill={shirt} />
          <circle cx="47" cy="17" r="1.8" fill="#fff" /><circle cx="53" cy="22" r="1.8" fill="#fff" />
          <circle cx="50" cy="3" r="3.5" fill="#ffbe0b" />
        </g>
      )}
      <Arm from={[66, 78]} to={armR} color={shirt} skin={skin} className={pose === 'wave' ? 'arm arm-wave' : walking ? 'arm arm-swing-b' : 'arm'}>
        {gearInHand === 'right' && <g transform={`translate(${armR[0] - 10} ${armR[1] - 26})`}><Icon name="rose" size={24} /></g>}
      </Arm>
    </g>
  )
}

function Suitcase({ x, color }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="suitcase">
      <path d="M14 118v-14" stroke="#4a4a4a" strokeWidth="3" strokeLinecap="round" />
      <rect x="0" y="118" width="28" height="44" rx="6" fill={color} />
      <path d="M8 124v32m12-32v32" stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
      <circle cx="6" cy="166" r="4" fill={INK} /><circle cx="22" cy="166" r="4" fill={INK} />
      </g>
    </g>
  )
}

export default function Crew({ count = 1, profile, sceneId = 'everyday', size = 'lg' }) {
  const scene = SCENES[sceneId] ?? SCENES.everyday
  const o = scene.outfit
  const user = userPerson(profile)
  const n = Math.max(1, count)
  const outfitFor = (i) => ({
    shirt: o.shirts[i % o.shirts.length],
    pants: o.pants[i % o.pants.length],
    shorts: o.shorts,
    hat: o.hat,
    shades: o.shades && i % 2 === 0,
    scarf: o.scarf,
    gear: o.gear,
    dress: o.dress,
  })

  let people
  let width
  if (n === 1) {
    people = [{ p: user, x: 30, pose: 'wave' }]
    width = 160
  } else if (n === 2) {
    people = [
      { p: user, x: 20, pose: 'holdR' },
      { p: partnerFor(user), x: 88, pose: 'holdL' },
    ]
    width = 208
  } else {
    const visible = Math.min(n, 5)
    people = [user, ...COMPANIONS.slice(0, visible - 1)].map((p, i) => ({ p, x: 40 + i * 70, pose: 'walk' }))
    width = 40 + visible * 70 + 40
  }
  const extra = n > 5 ? n - 5 : 0
  const rose = o.gear === 'rose'

  return (
    <div className={`crew crew-${size}`} role="img" aria-label={n === 1 ? 'You' : n === 2 ? 'You and one other person' : `A group of ${n} travellers`}>
      <svg viewBox={`0 0 ${width} 212`} className="crew-svg">
        <ellipse cx={width / 2} cy="198" rx={width / 2 - 14} ry="9" fill="#000" opacity="0.12" />
        {n >= 3 && <Suitcase x={8} color={o.shirts[3 % o.shirts.length]} />}
        {people.map(({ p, x, pose }, i) => (
          <g key={i} transform={`translate(${x} 0)`}>
            <Person
              person={p}
              outfit={outfitFor(i)}
              pose={pose}
              delay={i * -0.35}
              gearInHand={rose && n === 2 ? (i === 0 ? 'left' : 'right') : null}
            />
          </g>
        ))}
        {n >= 3 && <Suitcase x={width - 38} color={o.shirts[1 % o.shirts.length]} />}
      </svg>
      {n === 2 && sceneId === 'romance' && (
        <div className="couple-hearts">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ '--i': i }}>
              <Icon name="heart" size={14 + i * 3} color="#ff8fb1" />
            </span>
          ))}
        </div>
      )}
      {extra > 0 && <span className="crew-more">+{extra}</span>}
    </div>
  )
}
