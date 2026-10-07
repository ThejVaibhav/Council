import { memo } from 'react'
import { COMPANIONS, partnerFor, withDefaults } from '../../avatarOptions'
import { SCENES } from '../../scenes'
import { DEFS, figureMarkup } from './figure'
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

// Patterns and the paper-grain filter the figures reference. Rendered once at the app root.
export function ArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
    </svg>
  )
}

// One person, in the shared 200 x 520 figure box.
export const Figure = memo(function Figure({ avatar, sceneId = 'everyday', index = 0, bust = false }) {
  return <g dangerouslySetInnerHTML={{ __html: figureMarkup(avatar, sceneId, index, bust) }} />
})

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
        <path d="M22 410V384H48V410" stroke="#3a3540" strokeWidth="6" fill="none" strokeLinejoin="round" />
        <rect x="0" y="408" width="70" height="96" rx="12" fill={color} />
        <rect x="0" y="408" width="70" height="96" rx="12" fill="url(#cx-dots)" opacity="0.18" />
        <path d="M20 418v76M50 418v76" stroke="#000" strokeOpacity="0.18" strokeWidth="5" />
        <rect x="10" y="440" width="50" height="14" rx="3" fill="#efe3c8" opacity="0.85" />
        <circle cx="14" cy="508" r="7" fill="#2a1d18" /><circle cx="56" cy="508" r="7" fill="#2a1d18" />
      </g>
    </g>
  )
}

const TOP = -26
const H = 552

/**
 * The people going on the plan. `me` is the viewer's avatar; `friends` are the avatars of other members
 * who are real users; anyone else up to `count` is drawn as a stand-in companion.
 * In any scene but everyday, everyone changes into that scene's look.
 */
export default function Crew({ count = 1, me, friends = [], sceneId = 'everyday', size = 'lg', label }) {
  const scene = SCENES[sceneId] ?? SCENES.everyday
  const mine = withDefaults(me)
  const n = Math.max(1, count, 1 + friends.length)
  const pet = mine.pet?.kind !== 'none' ? mine.pet : null
  const petSpace = pet ? 150 : 0

  let people
  let width
  if (n === 1) {
    people = [{ a: mine, x: petSpace }]
    width = 200 + petSpace
  } else if (n === 2) {
    const partner = friends[0] ? withDefaults(friends[0]) : partnerFor(mine)
    people = [{ a: mine, x: petSpace }, { a: partner, x: petSpace + 132 }]
    width = 332 + petSpace
  } else {
    const visible = Math.min(n, 5)
    const crew = [mine, ...friends.slice(0, visible - 1).map((f) => withDefaults(f))]
    let c = 0
    while (crew.length < visible) crew.push(COMPANIONS[c++ % COMPANIONS.length])
    people = crew.map((a, i) => ({ a, x: 60 + petSpace + i * 118 }))
    width = 60 + petSpace + (visible - 1) * 118 + 200 + 60
  }
  const extra = n > 5 ? n - 5 : 0
  const accent = scene.palette.accent

  return (
    <div className={`crew crew-${size}`} role="img" aria-label={label ?? (n === 1 ? 'You' : n === 2 ? 'You and one other person' : `A group of ${n} travellers`)}>
      <svg viewBox={`0 ${TOP} ${width} ${H}`} className="crew-svg">
        <ellipse cx={width / 2} cy="514" rx={width / 2 - 20} ry="12" fill="#000" opacity="0.12" />
        {n >= 3 && <Suitcase x={petSpace} color={accent} />}
        {people.map(({ a, x }, i) => (
          <g key={i} transform={`translate(${x} 0)`}>
            <g className={`fig ${n >= 3 ? 'fig-walk' : ''}`} style={{ '--delay': `${i * -0.35}s` }}>
              <Figure avatar={a} sceneId={sceneId} index={i} />
            </g>
          </g>
        ))}
        {n >= 3 && <Suitcase x={width - 62} color="#3e6b5a" />}
        {pet && (
          <g transform={`translate(${n >= 3 ? 0 : 4} 512) scale(2.2)`} filter="url(#cx-grain)">
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
    <svg viewBox="46 4 108 108" width={size} height={size} className={`portrait ${className}`} aria-hidden="true">
      <Figure avatar={avatar} sceneId={sceneId} bust />
    </svg>
  )
}

// A whole person, for tiles that show an outfit.
export function FullBody({ avatar, size = 84, sceneId = 'everyday' }) {
  return (
    <svg viewBox={`20 ${TOP} 160 ${H}`} width={size * 0.3} height={size} aria-hidden="true">
      <Figure avatar={avatar} sceneId={sceneId} />
    </svg>
  )
}
