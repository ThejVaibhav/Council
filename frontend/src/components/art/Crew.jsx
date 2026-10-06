import { BOTTOM_COLORS, COMPANIONS, HAIR_COLORS, SHOE_COLORS, SKIN, TOP_COLORS, partnerFor, withDefaults } from '../../avatarOptions'
import { SCENES } from '../../scenes'
import { Icon } from './Icons'

const INK = '#2b2320'

// Rotations pivot on a joint: the invisible square is centred on the joint so CSS can rotate around its centre.
function Pivot({ x, y, className, children }) {
  return (
    <g className={className}>
      <rect className="pivot" x={x - 70} y={y - 70} width="140" height="140" fill="none" />
      {children}
    </g>
  )
}

function Arm({ from, to, sleeve, skin, full, className, children }) {
  const [sx, sy] = from
  const mid = [sx + (to[0] - sx) * 0.42, sy + (to[1] - sy) * 0.42]
  return (
    <Pivot x={sx} y={sy} className={className}>
      <path d={`M${sx} ${sy} L${to[0]} ${to[1]}`} stroke={full ? sleeve : skin} strokeWidth="10.5" strokeLinecap="round" />
      {!full && <path d={`M${sx} ${sy} L${mid[0]} ${mid[1]}`} stroke={sleeve} strokeWidth="12" strokeLinecap="round" />}
      <circle cx={to[0]} cy={to[1] + 2} r="5.5" fill={skin} />
      {children}
    </Pivot>
  )
}

function Leg({ x, bottom, pants, skin, shoe, className }) {
  const short = bottom === 'shorts'
  const bare = bottom === 'skirt' || bottom === 'dress'
  return (
    <Pivot x={x} y={124} className={className}>
      {bare ? (
        <rect x={x - 5} y={128} width="10" height="58" rx="4.5" fill={skin} />
      ) : short ? (
        <>
          <rect x={x - 5} y={146} width="10" height="40" rx="4.5" fill={skin} />
          <rect x={x - 7} y={124} width="14" height="28" rx="5" fill={pants} />
        </>
      ) : (
        <rect x={x - 6.5} y={124} width="13" height="62" rx="5" fill={pants} />
      )}
      <rect x={x - 8} y={184} width="17" height="9" rx="4.5" fill={shoe} />
    </Pivot>
  )
}

function HairBack({ style, color }) {
  switch (style) {
    case 'long':
      return <path d="M31 44C30 22 50 22 50 22s20 0 19 22l2 36c-10 6-31 6-42 0Z" fill={color} />
    case 'bob':
      return <path d="M31 44c-1-20 19-22 19-22s20 2 19 22l1 16c-6 4-34 4-40 0Z" fill={color} />
    case 'waves':
      return <path d="M31 44c-2-22 19-23 19-23s21 1 19 23c3 8 1 14 3 22-6 3-8-2-11 2-5-4-17-4-22 0-3-4-5 1-11-2 2-8 0-14 3-22Z" fill={color} />
    case 'afro':
      return <circle cx="50" cy="36" r="25" fill={color} />
    case 'ponytail':
      return <path d="M63 30c10 2 14 14 10 30-2 7-6 10-8 9 3-10 3-22-4-30Z" fill={color} />
    default:
      return null
  }
}

function HairFront({ style, color }) {
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
    case 'ponytail':
      return <path d="M33 40c1-14 8-18 17-18s16 4 17 18c-5-6-10-8-17-8s-12 2-17 8Z" fill={color} />
    case 'curly':
      return (
        <g fill={color}>
          {[[36, 32], [42, 25], [50, 23], [58, 25], [64, 32], [34, 40], [66, 40]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="7" />
          ))}
        </g>
      )
    case 'afro':
      return <path d="M33 40c2-11 9-15 17-15s15 4 17 15c-5-5-10-6-17-6s-12 1-17 6Z" fill={color} />
    case 'waves':
      return <path d="M32 42c0-14 8-20 18-20s19 5 18 18c-3-4-7-6-11-4-4-6-11-6-15-2-4-2-8 2-10 8Z" fill={color} />
    case 'buzz':
      return <path d="M33.5 40c1-13 7-17 16.5-17s15.5 4 16.5 17c-3-6-9-8-16.5-8s-13.5 2-16.5 8Z" fill={color} opacity="0.75" />
    case 'bald':
      return <path d="M40 27c4-2 9-2 13-1" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    default:
      return <path d="M33 41c2-13 9-16 17-16s15 3 17 16c-6-7-11-9-17-8-7 1-12 3-17 8Z" fill={color} />
  }
}

function Eyes({ type }) {
  switch (type) {
    case 'happy':
      return <path d="M41 45q3-4 6 0M53 45q3-4 6 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    case 'lashes':
      return (
        <g>
          <circle cx="44" cy="44" r="1.9" fill={INK} /><circle cx="56" cy="44" r="1.9" fill={INK} />
          <path d="M41 42l-2-2M42.5 41l-1-2.4M59 42l2-2M57.5 41l1-2.4" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )
    case 'sleepy':
      return <path d="M41 44h6M53 44h6" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
    default:
      return (
        <g>
          <circle cx="44" cy="44" r="1.8" fill={INK} />
          <circle cx="56" cy="44" r="1.8" fill={INK} />
        </g>
      )
  }
}

function Glasses({ type }) {
  if (type === 'round')
    return <g fill="none" stroke={INK} strokeWidth="1.6"><circle cx="44" cy="44" r="5" /><circle cx="56" cy="44" r="5" /><path d="M49 44h2" /></g>
  if (type === 'square')
    return <g fill="none" stroke={INK} strokeWidth="1.6"><rect x="38.5" y="40" width="10" height="8" rx="2" /><rect x="51.5" y="40" width="10" height="8" rx="2" /><path d="M48.5 43h3" /></g>
  if (type === 'shades')
    return <g><rect x="38" y="40" width="10" height="7" rx="3" fill={INK} /><rect x="52" y="40" width="10" height="7" rx="3" fill={INK} /><path d="M48 43h4" stroke={INK} strokeWidth="1.5" /></g>
  return null
}

function Headwear({ type, color }) {
  switch (type) {
    case 'cap':
      return (
        <g>
          <path d="M33 37c0-12 7-17 17-17s17 5 17 17Z" fill={color} />
          <path d="M50 35h27c0 4-3 5-8 5H50Z" fill={color} />
          <path d="M50 35h27c0 4-3 5-8 5H50Z" fill="#000" opacity="0.18" />
        </g>
      )
    case 'beanie':
      return (
        <g>
          <path d="M32 38c0-14 8-20 18-20s18 6 18 20Z" fill={color} />
          <rect x="31" y="34" width="38" height="7" rx="3.5" fill="#000" opacity="0.22" />
          <circle cx="50" cy="17" r="5" fill="#fff" />
        </g>
      )
    case 'bucket':
      return (
        <g>
          <path d="M36 34c0-10 6-14 14-14s14 4 14 14Z" fill={color} />
          <path d="M28 37c4-5 40-5 44 0-6 3-38 3-44 0Z" fill={color} />
          <path d="M28 37c4-5 40-5 44 0" stroke="#000" strokeOpacity="0.18" strokeWidth="2" fill="none" />
        </g>
      )
    case 'headband':
      return <path d="M33 34c6-6 28-6 34 0l-1 5c-6-5-26-5-32 0Z" fill={color} />
    case 'party':
      return (
        <g>
          <path d="M40 27 50 2l10 25Z" fill={color} />
          <circle cx="47" cy="17" r="1.8" fill="#fff" /><circle cx="53" cy="22" r="1.8" fill="#fff" />
          <circle cx="50" cy="3" r="3.5" fill="#ffbe0b" />
        </g>
      )
    default:
      return null
  }
}

function Torso({ top, color }) {
  const base = 'M30 84c0-9 6-14 14-14h12c8 0 14 5 14 14l-2 44H32Z'
  switch (top) {
    case 'dress':
      return <path d="M33 84c0-9 6-14 13-14h8c7 0 13 5 13 14l7 68H26Z" fill={color} />
    case 'hoodie':
      return (
        <g>
          <path d={base} fill={color} />
          <path d="M40 70c2 7 18 7 20 0" stroke="#000" strokeOpacity="0.2" strokeWidth="4" fill="none" />
          <path d="M46 76v10m8-10v10" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
          <rect x="39" y="104" width="22" height="12" rx="4" fill="#000" opacity="0.14" />
        </g>
      )
    case 'shirt':
      return (
        <g>
          <path d={base} fill={color} />
          <path d="M44 70l6 9 6-9M50 79v46" stroke="#fff" strokeOpacity="0.75" strokeWidth="2" fill="none" />
          {[88, 100, 112].map((y) => <circle key={y} cx="52.5" cy={y} r="1.2" fill="#fff" opacity="0.8" />)}
        </g>
      )
    case 'jacket':
      return (
        <g>
          <path d={base} fill={color} />
          <path d="M45 70h10l-1 58h-8Z" fill="#f4f1ea" />
          <path d="M45 70l-3 18 8 6M55 70l3 18-8 6" stroke="#000" strokeOpacity="0.25" strokeWidth="2" fill="none" />
        </g>
      )
    default:
      return (
        <g>
          <path d={base} fill={color} />
          <path d="M44 70q6 5 12 0" stroke="#000" strokeOpacity="0.15" strokeWidth="2" fill="none" />
        </g>
      )
  }
}

// Scene dressing: a stand-in companion wears the scene's palette; a real person keeps their own outfit
// and only gains what they are not already wearing (a cap at the beach, a beanie in the hills).
function dressFor(a, scene, i, own) {
  const o = scene.outfit
  const look = {
    shirt: own ? TOP_COLORS[a.topColor] : o.shirts[i % o.shirts.length],
    pants: own ? BOTTOM_COLORS[a.bottomColor] : o.pants[i % o.pants.length],
    shoe: SHOE_COLORS[a.shoeColor] ?? SHOE_COLORS[0],
    top: a.top,
    bottom: a.bottom,
    headwear: a.headwear,
    glasses: a.glasses,
    scarf: o.scarf,
    gear: o.gear,
  }
  if (!own && o.dress && a.body === 'female') look.top = 'dress'
  if (o.shorts && look.bottom === 'pants' && look.top !== 'dress') look.bottom = 'shorts'
  if (o.hat && look.headwear === 'none') look.headwear = o.hat
  if (o.shades && look.glasses === 'none' && i % 2 === 0) look.glasses = 'shades'
  if (look.top === 'dress') look.bottom = 'dress'
  return look
}

export function Person({ avatar, scene, index = 0, own = true, pose = 'stand', delay = 0, gearInHand }) {
  const a = withDefaults(avatar)
  const look = dressFor(a, scene, index, own)
  const skin = SKIN[a.skin] ?? SKIN[2]
  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0]
  const hatColor = TOP_COLORS[(a.topColor + 4) % TOP_COLORS.length]
  const armL = pose === 'holdL' ? [16, 112] : [27, 120]
  const armR = pose === 'holdR' ? [84, 112] : pose === 'wave' ? [84, 42] : [73, 120]
  const walking = pose === 'walk'
  const fullSleeves = ['hoodie', 'shirt', 'jacket'].includes(look.top)
  const rose = (side) => gearInHand === side && <g transform={`translate(${(side === 'left' ? armL : armR)[0] - 12} ${(side === 'left' ? armL : armR)[1] - 26})`}><Icon name="rose" size={24} /></g>

  return (
    <g className={`fig ${walking ? 'fig-walk' : ''}`} style={{ '--delay': `${delay}s` }}>
      {look.gear === 'backpack' && <rect x="27" y="74" width="46" height="50" rx="12" fill="#6b5a4a" />}
      <HairBack style={a.hair} color={hair} />
      <Leg x={42} bottom={look.bottom} pants={look.pants} skin={skin} shoe={look.shoe} className={walking ? 'leg leg-a' : 'leg'} />
      <Leg x={58} bottom={look.bottom} pants={look.pants} skin={skin} shoe={look.shoe} className={walking ? 'leg leg-b' : 'leg'} />
      {look.bottom === 'skirt' && <path d="M32 122h36l5 30H27Z" fill={look.pants} />}
      <Arm from={[34, 78]} to={armL} sleeve={look.shirt} skin={skin} full={fullSleeves} className={walking ? 'arm arm-swing-a' : 'arm'}>
        {rose('left')}
      </Arm>
      <rect x="45" y="55" width="10" height="18" rx="4" fill={skin} />
      <Torso top={look.top} color={look.shirt} />
      {look.gear === 'backpack' && <path d="M38 72l-2 34m26-34 2 34" stroke="#4a3c30" strokeWidth="4" strokeLinecap="round" />}
      {look.scarf && <path d="M38 66h24v9H38Zm16 6h8v20h-8Z" fill="#d64545" />}
      <circle cx="33.5" cy="45" r="4" fill={skin} />
      <circle cx="66.5" cy="45" r="4" fill={skin} />
      <circle cx="50" cy="42" r="17" fill={skin} />
      <HairFront style={a.hair} color={hair} />
      {a.brows !== 'none' && (
        <path d="M40.5 38.5q3.5-2 7 0M52.5 38.5q3.5-2 7 0" stroke={hair} strokeWidth={a.brows === 'bold' ? 2.6 : 1.4} fill="none" strokeLinecap="round" />
      )}
      <Eyes type={a.eyes} />
      {a.facialHair === 'beard' && <path d="M37 45c2 14 8 16 13 16s11-2 13-16c-4 7-8 8-13 8s-9-1-13-8Z" fill={hair} />}
      {a.facialHair === 'stubble' && <path d="M38 48c3 10 8 12 12 12s9-2 12-12c-3 5-7 6-12 6s-9-1-12-6Z" fill={hair} opacity="0.28" />}
      {a.facialHair === 'mustache' && <path d="M44 49.5c3-2 4.5-1 6 0 1.5-1 3-2 6 0-2 1.5-4 1.5-6 .5-2 1-4 1-6-.5Z" fill={hair} />}
      <circle cx="40" cy="50" r="3" fill="#ff8a80" opacity="0.3" />
      <circle cx="60" cy="50" r="3" fill="#ff8a80" opacity="0.3" />
      <path d="M46 52q4 3 8 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Glasses type={look.glasses} />
      <Headwear type={look.headwear} color={look.headwear === 'party' ? look.shirt : hatColor} />
      <Arm from={[66, 78]} to={armR} sleeve={look.shirt} skin={skin} full={fullSleeves} className={pose === 'wave' ? 'arm arm-wave' : walking ? 'arm arm-swing-b' : 'arm'}>
        {rose('right')}
      </Arm>
    </g>
  )
}

// ---------- pets ----------
const DOGS = {
  Indie: { size: 0.9, ears: 'pointy', coat: '#c98b4e', light: '#f1d2a8', tail: 'curl' },
  Labrador: { size: 1, ears: 'floppy', coat: '#e2b866', tail: 'straight' },
  'Golden Retriever': { size: 1, ears: 'floppy', coat: '#d99a3d', light: '#f0c27a', tail: 'plume', fluffy: true },
  Beagle: { size: 0.85, ears: 'floppy', coat: '#f4efe6', patch: '#c8803a', saddle: '#2b2320', tail: 'straight' },
  Pug: { size: 0.7, ears: 'button', coat: '#e8cfa4', mask: '#2b2320', tail: 'curl', flat: true },
  'German Shepherd': { size: 1.05, ears: 'pointy', coat: '#c98b4e', saddle: '#2b2320', tail: 'plume' },
  Husky: { size: 1, ears: 'pointy', coat: '#8e98a3', light: '#ffffff', tail: 'curl', cap: true },
  'Shih Tzu': { size: 0.7, ears: 'floppy', coat: '#f4efe6', patch: '#b88452', tail: 'plume', fluffy: true, flat: true },
  Dachshund: { size: 0.8, ears: 'floppy', coat: '#8a4b2a', tail: 'straight', long: true },
  Pomeranian: { size: 0.62, ears: 'pointy', coat: '#f0a050', tail: 'plume', fluffy: true },
}
const CATS = {
  Indie: { coat: '#a8a29a', stripe: '#6e6760' },
  Persian: { coat: '#f2ece2', fluffy: true, flat: true },
  Siamese: { coat: '#efe3cf', point: '#5a4334' },
  'Maine Coon': { coat: '#8a5a3a', stripe: '#5a3a24', fluffy: true, size: 1.1 },
  Bengal: { coat: '#d9a35a', spot: '#5a3a20' },
  'British Shorthair': { coat: '#9aa3ad', round: true },
}
const RABBITS = {
  Lop: { coat: '#d9c2a3', lop: true },
  Lionhead: { coat: '#f4efe6', mane: true },
  Dutch: { coat: '#ffffff', patch: '#5a4334' },
}

function Dog({ breed }) {
  const d = DOGS[breed] ?? DOGS.Indie
  const bodyRx = d.long ? 34 : 24
  const legTop = d.long ? -14 : -24
  const headX = d.long ? 80 : 70
  return (
    <g className="pet-art">
      <Pivot x={16} y={d.long ? -28 : -40} className="pet-tail">
        <g transform={d.long ? 'translate(0 12)' : undefined}>
        {d.tail === 'curl' && <path d="M17 -40c-10-4-10-18 2-18 6 0 6 8 0 8" stroke={d.coat} strokeWidth="6" fill="none" strokeLinecap="round" />}
        {d.tail === 'straight' && <path d="M17 -38 4 -52" stroke={d.coat} strokeWidth="6" strokeLinecap="round" />}
        {d.tail === 'plume' && <path d="M18 -38c-10-2-18-10-16-20 4 6 10 8 18 12Z" fill={d.light ?? d.coat} />}
        </g>
      </Pivot>
      {[22, 30, 50, 58].map((x, i) => (
        <rect key={x} className={`pet-leg ${i % 2 ? 'pl-b' : 'pl-a'}`} x={d.long ? x - 4 + (i > 1 ? 16 : 0) : x} y={legTop} width="7" height={-legTop} rx="3" fill={d.coat} />
      ))}
      <g transform={d.long ? 'translate(0 12)' : undefined}>
      <ellipse cx={d.long ? 46 : 40} cy="-34" rx={bodyRx} ry="14" fill={d.coat} />
      {d.fluffy && [[20, -38], [30, -46], [44, -48], [58, -44], [62, -32]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill={d.coat} />)}
      {d.saddle && <ellipse cx={d.long ? 44 : 38} cy="-42" rx={bodyRx * 0.7} ry="7" fill={d.saddle} />}
      {d.light && <ellipse cx={d.long ? 70 : 58} cy="-30" rx="9" ry="8" fill={d.light} />}
      <circle cx={headX} cy="-50" r="13" fill={d.coat} />
      {d.cap && <path d={`M${headX - 13} -52a13 13 0 0 1 26 0c-6-4-20-4-26 0Z`} fill="#5c6670" />}
      {d.patch && <circle cx={headX - 3} cy="-54" r="7" fill={d.patch} />}
      {d.mask && <ellipse cx={headX + 7} cy="-47" rx="8" ry="7" fill={d.mask} />}
      <ellipse cx={headX + (d.flat ? 9 : 12)} cy="-45" rx={d.flat ? 4.5 : 8} ry="6" fill={d.mask ?? d.light ?? d.coat} />
      <circle cx={headX + (d.flat ? 13 : 19)} cy="-47" r="2.5" fill={INK} />
      <circle cx={headX + 4} cy="-53" r="1.8" fill={d.mask ? '#fff' : INK} />
      {d.ears === 'pointy' && <path d={`M${headX - 7} -58 l2 -14 l8 10Z`} fill={d.saddle ?? d.coat} />}
      {d.ears === 'floppy' && <path d={`M${headX - 8} -60c-6 2-7 14-3 20 4 0 6-8 7-18Z`} fill={d.patch ?? d.saddle ?? '#000'} opacity={d.patch || d.saddle ? 1 : 0.25} />}
      {d.ears === 'button' && <path d={`M${headX - 9} -60l4-6 6 6Z`} fill={d.mask ?? INK} />}
      <path d={`M${headX + 8} -39q3 2 6 0`} stroke={INK} strokeWidth="1.2" fill="none" />
      <path d={`M${headX - 10} -40h18`} stroke="#d64545" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </g>
  )
}

function Cat({ breed }) {
  const c = CATS[breed] ?? CATS.Indie
  return (
    <g className="pet-art" transform={`scale(${c.size ?? 0.9})`}>
      <Pivot x={14} y={-30} className="pet-tail">
        <path d="M16 -30c-14-4-16-26-4-34" stroke={c.point ?? c.coat} strokeWidth={c.fluffy ? 9 : 5} fill="none" strokeLinecap="round" />
      </Pivot>
      {[22, 30, 46, 54].map((x, i) => <rect key={x} className={`pet-leg ${i % 2 ? 'pl-b' : 'pl-a'}`} x={x} y="-22" width="6" height="22" rx="3" fill={c.point ?? c.coat} />)}
      <ellipse cx="38" cy="-30" rx={c.round ? 22 : 20} ry={c.round ? 13 : 11} fill={c.coat} />
      {c.fluffy && [[22, -34], [34, -40], [48, -38], [56, -30]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill={c.coat} />)}
      {c.stripe && [28, 36, 44].map((x) => <path key={x} d={`M${x} -40v8`} stroke={c.stripe} strokeWidth="3" strokeLinecap="round" />)}
      {c.spot && [[28, -34], [38, -38], [46, -30], [34, -27]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill={c.spot} />)}
      <circle cx="62" cy="-44" r={c.round ? 12 : 11} fill={c.coat} />
      <path d="M53 -50l1 -13 8 8ZM71 -50l-1 -13 -8 8Z" fill={c.point ?? c.coat} />
      {c.point && <ellipse cx="65" cy="-41" rx="7" ry="6" fill={c.point} />}
      <circle cx="59" cy="-46" r="1.7" fill={c.point ? '#5bc0eb' : INK} />
      <circle cx="67" cy="-46" r="1.7" fill={c.point ? '#5bc0eb' : INK} />
      <path d={c.flat ? 'M62 -41l2 1.5 2-1.5' : 'M62 -40l2 2 2-2'} stroke={INK} strokeWidth="1.2" fill="none" />
      <path d="M68 -40h9M68 -38l8 3M56 -40h-9M56 -38l-8 3" stroke={INK} strokeWidth="0.8" opacity="0.6" />
    </g>
  )
}

function Rabbit({ breed }) {
  const r = RABBITS[breed] ?? RABBITS.Lop
  return (
    <g className="pet-hop pet-art">
      <circle cx="18" cy="-24" r="5" fill="#fff" />
      <ellipse cx="34" cy="-18" rx="18" ry="15" fill={r.coat} />
      {r.patch && <path d="M30 -32a14 14 0 0 1 20 10H30Z" fill={r.patch} />}
      <ellipse cx="44" cy="-4" rx="9" ry="4" fill={r.coat} />
      {r.mane && <circle cx="50" cy="-34" r="13" fill="#efe6d6" />}
      <circle cx="52" cy="-32" r="10" fill={r.patch ?? r.coat} />
      {r.lop ? (
        <path d="M46 -40c-6 0-10 10-8 20 4 0 8-8 8-20Z" fill="#c4a988" />
      ) : (
        <g fill={r.patch ?? r.coat}>
          <ellipse cx="48" cy="-50" rx="4" ry="12" transform="rotate(-10 48 -50)" />
          <ellipse cx="55" cy="-50" rx="4" ry="12" transform="rotate(10 55 -50)" />
        </g>
      )}
      <circle cx="55" cy="-34" r="1.7" fill={INK} />
      <circle cx="61" cy="-30" r="1.6" fill="#ff8fab" />
    </g>
  )
}

export function Pet({ pet, walking }) {
  if (!pet || pet.kind === 'none') return null
  return (
    <g className={`pet ${walking ? 'pet-walk' : ''}`}>
      {pet.kind === 'dog' && <Dog breed={pet.breed} />}
      {pet.kind === 'cat' && <Cat breed={pet.breed} />}
      {pet.kind === 'rabbit' && <Rabbit breed={pet.breed} />}
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

/**
 * The people going on the plan. `me` is the viewer's avatar; `friends` are the avatars of other members
 * who are real users; anyone else up to `count` is drawn as a stand-in companion.
 */
export default function Crew({ count = 1, me, friends = [], sceneId = 'everyday', size = 'lg', label }) {
  const scene = SCENES[sceneId] ?? SCENES.everyday
  const mine = withDefaults(me)
  const n = Math.max(1, count, 1 + friends.length)
  const pet = mine.pet?.kind !== 'none' ? mine.pet : null
  const petSpace = pet ? (n >= 3 ? 92 : 74) : 0

  let people
  let width
  if (n === 1) {
    people = [{ a: mine, own: true, x: 30 + petSpace, pose: 'wave' }]
    width = 160 + petSpace
  } else if (n === 2) {
    const partner = friends[0] ? { a: withDefaults(friends[0]), own: true } : { a: partnerFor(mine), own: false }
    people = [
      { a: mine, own: true, x: 20 + petSpace, pose: 'holdR' },
      { ...partner, x: 88 + petSpace, pose: 'holdL' },
    ]
    width = 208 + petSpace
  } else {
    const visible = Math.min(n, 5)
    const crew = [{ a: mine, own: true }, ...friends.slice(0, visible - 1).map((f) => ({ a: withDefaults(f), own: true }))]
    let c = 0
    while (crew.length < visible) crew.push({ a: COMPANIONS[c++ % COMPANIONS.length], own: false })
    people = crew.map((p, i) => ({ ...p, x: 40 + petSpace + i * 70, pose: 'walk' }))
    width = 40 + petSpace + visible * 70 + 40
  }
  const extra = n > 5 ? n - 5 : 0
  const rose = scene.outfit.gear === 'rose'

  return (
    <div className={`crew crew-${size}`} role="img" aria-label={label ?? (n === 1 ? 'You' : n === 2 ? 'You and one other person' : `A group of ${n} travellers`)}>
      <svg viewBox={`0 0 ${width} 212`} className="crew-svg">
        <ellipse cx={width / 2} cy="198" rx={width / 2 - 14} ry="9" fill="#000" opacity="0.12" />
        {n >= 3 && <Suitcase x={8 + petSpace} color={scene.outfit.shirts[3 % scene.outfit.shirts.length]} />}
        {people.map(({ a, own, x, pose }, i) => (
          <g key={i} transform={`translate(${x} 0)`}>
            <Person avatar={a} scene={scene} index={i} own={own} pose={pose} delay={i * -0.35} gearInHand={rose && n === 2 ? (i === 0 ? 'left' : 'right') : null} />
          </g>
        ))}
        {n >= 3 && <Suitcase x={width - 38} color={scene.outfit.shirts[1 % scene.outfit.shirts.length]} />}
        {pet && (
          <g transform={`translate(${n >= 3 ? 2 : 6} 194) scale(0.95)`}>
            <Pet pet={pet} walking={n >= 3} />
          </g>
        )}
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

// A head-and-shoulders portrait for chips, lists and the editor's option tiles.
export function Portrait({ avatar, size = 32, sceneId = 'everyday', className = '' }) {
  return (
    <svg viewBox="18 4 64 74" width={size} height={size} className={`portrait ${className}`} aria-hidden="true">
      <Person avatar={avatar} scene={SCENES[sceneId] ?? SCENES.everyday} own pose="stand" />
    </svg>
  )
}
