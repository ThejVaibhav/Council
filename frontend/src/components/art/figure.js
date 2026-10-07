// Retro textured characters, drawn as SVG strings in a 200 x 520 box (centre line x = 100, soles on y = 513).
// Two body frames share one head space: 'A' (slimmer, hand on hip, phone) and 'R' (broader, cup in hand).
// Everything is flat colour with halftone shadows and a paper grain filter; see ArtDefs for the patterns.

import { BOTTOM_COLORS, HAIR_COLORS, SHOE_COLORS, SKIN, TOP_COLORS, withDefaults } from '../../avatarOptions'

// ---------- geometry helpers ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const mul = (a, k) => [a[0] * k, a[1] * k]
const norm = (a) => {
  const l = Math.hypot(a[0], a[1]) || 1
  return [a[0] / l, a[1] / l]
}
const f1 = (n) => Math.round(n * 10) / 10
const pt = (p) => `${f1(p[0])} ${f1(p[1])}`

function smooth(q) {
  let d = ''
  for (let i = 0; i < q.length - 1; i++) {
    const p0 = q[i - 1] || q[i]
    const p1 = q[i]
    const p2 = q[i + 1]
    const p3 = q[i + 2] || q[i + 1]
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6))
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6))
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d
}

// A tapered limb along a joint chain, rounded at the far end.
export function limb(pts, ws) {
  const n = pts.length
  const L = []
  const R = []
  for (let i = 0; i < n; i++) {
    const dir = norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]))
    const nrm = [-dir[1], dir[0]]
    L.push(add(pts[i], mul(nrm, ws[i] / 2)))
    R.push(sub(pts[i], mul(nrm, ws[i] / 2)))
  }
  const end = norm(sub(pts[n - 1], pts[n - 2]))
  const w = ws[n - 1]
  const st = norm(sub(pts[0], pts[1]))
  const w0 = ws[0]
  return `M${pt(L[0])}${smooth(L)}C${pt(add(L[n - 1], mul(end, w * 0.6)))} ${pt(add(R[n - 1], mul(end, w * 0.6)))} ${pt(R[n - 1])}${smooth(R.slice().reverse())}C${pt(add(R[0], mul(st, w0 * 0.5)))} ${pt(add(L[0], mul(st, w0 * 0.5)))} ${pt(L[0])}Z`
}

function curlyOutline(q, k = 0.62) {
  let d = `M${pt(q[0])}`
  for (let i = 0; i < q.length; i++) {
    const a = q[i]
    const b = q[(i + 1) % q.length]
    const r = Math.hypot(b[0] - a[0], b[1] - a[1]) * k
    d += `A${f1(r)} ${f1(r)} 0 0 1 ${pt(b)}`
  }
  return `${d}Z`
}

function inside(p, poly) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function ringlets(poly, count, seed, skip, size = 1) {
  const r = rng(seed)
  const out = []
  const xs = poly.map((p) => p[0])
  const ys = poly.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  let guard = 0
  while (out.length < count && guard++ < 4000) {
    const p = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)]
    if (!inside(p, poly) || (skip && skip(p))) continue
    const s = (0.8 + r() * 0.5) * size
    const flip = r() > 0.5 ? 1 : -1
    out.push(`M${pt(p)}c${f1(-3 * s * flip)} ${f1(1.5 * s)} ${f1(-3.4 * s * flip)} ${f1(5.5 * s)} 0 ${f1(6.5 * s)}s${f1(3.6 * s * flip)} ${f1(5 * s)} 0 ${f1(7 * s)}`)
  }
  return out.join('')
}

const at = (x, y, deg, inner, flip) => `<g transform="translate(${x} ${y}) rotate(${deg})${flip ? ' scale(-1 1)' : ''}">${inner}</g>`
const shift = (dx, dy, inner) => (dx || dy ? `<g transform="translate(${dx} ${dy})">${inner}</g>` : inner)
const pick = (arr, i) => arr[i % arr.length]

// ---------- colour ----------
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
export const mix = (h, t, k) => `#${hex(h).map((c, i) => Math.round(c + (hex(t)[i] - c) * k).toString(16).padStart(2, '0')).join('')}`
export const dark = (h, k = 0.2) => mix(h, '#000000', k)
export const light = (h, k = 0.2) => mix(h, '#ffffff', k)

function painter(P) {
  const col = (c) => (c.startsWith('#') ? c : P[c])
  return {
    col,
    base: (d, c, o = {}) => `<path d="${d}" fill="${o.pat ? `url(#cx-${o.pat})` : col(c)}"${o.op ? ` opacity="${o.op}"` : ''}/>`,
    shade: (d, c) => `<path d="${d}" fill="${dark(col(c), 0.24)}" opacity="0.5"/>${c === 'skin' ? '' : `<path d="${d}" fill="url(#cx-dots)" opacity="0.42"/>`}`,
    hi: (d, c) => `<path d="${d}" fill="${light(col(c), 0.6)}" opacity="0.22"/>`,
    line: (d, c, w = 1.2, o = {}) => `<path d="${d}" stroke="${o.raw ? col(c) : dark(col(c), 0.32)}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}/>`,
    dot: (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col(c)}"/>`,
  }
}

// ---------- body frames ----------
const HAND = {
  relaxed: 'M-5.5 -1C-7.5 5-7.8 12-6 17C-4.5 21-1 22.5 2 21.5C3.8 21 4.6 19 4.4 17C5.8 16.6 6.6 15 6.3 13.2C7.6 12.5 8 10.8 7.4 9.2L8.6 5.6C9.2 3.6 8 2.2 6.2 2.6L5.5-1Z',
  relaxedLines: 'M4.4 17C3 16.4 2 15.6 1.4 14.4M6.3 13.2C5 12.8 4 12 3.4 10.8',
  hip: 'M-6-1C-8 5-7 11-4 15C-2 18 2 19.5 5 19C7 18.6 7.6 16.6 6.4 15.2C8.4 14.8 9 12.6 7.6 11.2C9 10.4 9 8.4 7.4 7.4L6-1Z',
  hipLines: 'M6.4 15.2C4.6 14.8 3.4 14 2.6 12.8M7.6 11.2C5.8 10.8 4.6 10 4 8.8',
  grip: 'M-6-1C-8 4-8.4 10-7 15C-6 18.5-2.5 19.5 0 18L0 6C0 3 2 1 5 0.5L5-1Z',
  palm: 'M-6-1C-8 4-8.6 10-8 14C-7.4 17-5 18.4-2 18L-2 6C-2 4 0 2 3 1.6L3-1Z',
  fingers: ['M-4 6C0 5.2 6 5.6 10.6 6.8C12 7.2 12 9.4 10.4 9.6C6 10 0 9.8-4 9.4Z', 'M-4 10.4C0 9.8 6 10 10.2 11.2C11.6 11.6 11.4 13.6 10 13.8C6 14.2 0 14-4 13.6Z', 'M-4 14.6C0 14 5 14.2 8.6 15.2C10 15.6 9.8 17.4 8.4 17.6C5 18 0 17.8-4 17.4Z'],
}

const FRAMES = {
  A: {
    dy: 5, // head offset relative to the shared head space
    eyes: [[89, 111], 60],
    face: 'M75 54C75 34 86 27 100 27C114 27 125 34 125 54C125 68 123 79 117.5 87C112 93.5 106 97 100 97C94 97 88 93.5 82.5 87C77 79 75 68 75 54Z',
    faceShade: 'M76 52C76 67 78 78 83.5 86C88.5 92.5 94 96 100 96C94 93 88 87 84 78C80 70 79 60 80 50Z',
    ears: 'M76 56C71 54 69 58 70 64C71 70 74 73 77 72Z M124 56C129 54 131 58 130 64C129 70 126 73 123 72Z',
    torso: 'M91 88L91 108C84 114 72 115 66 122C61 128 62 140 66 151C69 161 72 170 74.5 178C77.5 188 79.5 196 79.5 203C78.5 211 76.5 219 76 229H124C123.5 219 121.5 211 120.5 203C120.5 196 122.5 188 125.5 178C128 170 131 161 134 151C138 140 139 128 134 122C128 115 116 114 109 108V88Z',
    torsoShade: 'M91 92C95 100 105 100 109 92V104C104 108 96 108 91 104Z M66 151C70 160 73 168 75 178C77.5 188 79.5 196 79.5 203L84 203C84 194 82 184 79 174C76 164 72 156 66 151Z',
    torsoLines: 'M83 123C89 127 94 127 97.5 125M102.5 125C106 127 111 127 117 123M100 199.5c-1 1.6-1 3 0 4',
    armL: [[[69, 128], [62, 165], [59, 205], [57, 236], [57, 262]], [18.5, 14.5, 11.5, 11, 8.6]],
    armR: [[[131, 128], [145, 158], [157, 188], [143, 205], [128, 217]], [18.5, 15, 12, 11, 9]],
    armShade: [[[66, 132], [59, 168], [56, 206], [54, 236]], [6, 5, 4, 3.5]],
    anchor: [57, 260], // left hand, where props are held
    legs: [[[86, 250], [84, 410], [83, 492]], [[114, 250], [117, 410], [120, 492]]],
    legW: [20, 13, 9],
    waist: 213,
  },
  R: {
    dy: 0,
    eyes: [[88, 112], 58],
    face: 'M74 50C74 30 86 21 100 21C114 21 126 30 126 50C126 65 125 76 120 84C114.5 91.5 107.5 95.5 100 95.5C92.5 95.5 85.5 91.5 80 84C75 76 74 65 74 50Z',
    faceShade: 'M74 50C74 65 75 76 80 84C85.5 91.5 92.5 95.5 100 95.5C93 92 87 86 83 78C79 70 78 60 78.5 50Z',
    ears: 'M75 52C70 50 68 54 69 60C70 66 73 69 76 68Z M125 52C130 50 132 54 131 60C130 66 127 69 124 68Z',
    torso: 'M88 84V108C80 112 66 115 60 120C54 125 52 134 53 146L58 200C60 226 62 252 64 274H136C138 252 140 226 142 200L147 146C148 134 146 125 140 120C134 115 120 112 112 108V84Z',
    torsoShade: 'M88 90C94 99 106 99 112 90V102C106 106 94 106 88 102Z',
    torsoLines: 'M84 124C90 128 95 128 98 126M102 126C105 128 110 128 116 124',
    armL: [[[60, 126], [52, 165], [47, 205], [46, 238], [50, 268]], [17, 14, 12, 11, 9.5]],
    armR: [[[140, 126], [148, 165], [153, 205], [155, 238], [152, 266]], [17, 14, 12, 11, 9.5]],
    armShade: [[[57, 130], [49, 168], [44, 206], [43, 238]], [6, 5, 4, 3.5]],
    anchor: [50, 271],
    legs: [[[78, 300], [77, 410], [78, 462], [78, 492]], [[122, 300], [123, 410], [122, 462], [122, 492]]],
    legW: [30, 22, 15, 13],
    waist: 268,
  },
}

// ---------- hair (shared head space; frame A shifts it down by dy) ----------
const CURLS = [[100, 4], [118, 6], [134, 14], [146, 28], [152, 46], [156, 66], [160, 88], [158, 110], [162, 132], [156, 154], [146, 172], [128, 178], [112, 170], [88, 170], [72, 178], [54, 172], [44, 154], [38, 132], [42, 110], [40, 88], [44, 66], [48, 46], [54, 28], [66, 14], [82, 6]]
const AFRO = Array.from({ length: 22 }, (_, i) => {
  const t = (i / 22) * Math.PI * 2 - Math.PI / 2
  const r = 47 + (i % 2 ? 3 : -2)
  return [100 + Math.cos(t) * r * 1.05, 46 + Math.sin(t) * r]
})
const WAVES = [[100, 8], [122, 10], [136, 22], [140, 44], [143, 70], [139, 96], [145, 122], [141, 148], [145, 170], [128, 178], [112, 170], [88, 170], [72, 178], [55, 170], [59, 148], [55, 122], [61, 96], [57, 70], [60, 44], [64, 22], [78, 10]]
const faceZone = (q) => (q[0] > 73 && q[0] < 127 && q[1] > 22 && q[1] < 98) || q[1] > 74
const BIG_HAIR = new Set(['curly', 'afro', 'waves', 'long'])

const CAP_FRONT = 'M73 60C70 36 82 18 100 18C118 18 130 36 127 60C125 50 121 44 116 40C110 37 90 37 84 40C79 44 75 50 73 60Z'
const PARTED_FRONT = 'M70 76C67 44 80 16 100 15C120 16 133 44 130 76C128 62 124 50 116 43C112 40 106 38 102 40L100 50C98 44 94 40 90 40C82 42 74 54 70 76Z'

function hairParts(style, p, P) {
  const strands = (d, w = 1.1) => `<path d="${d}" stroke="${P.hairHi}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="0.8"/>`
  const curlStroke = (d, w, c, op = 0.9) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${op}"/>`
  switch (style) {
    case 'long':
      return {
        back: p.base('M70 52C66 22 84 10 100 10C116 10 134 22 130 52C133 80 136 120 139 164C122 172 78 172 61 164C64 120 67 80 70 52Z', 'hair') + p.shade('M70 70C68 100 66 130 64 160L72 162C72 130 73 100 76 74Z M130 70C132 100 134 130 136 160L128 162C128 130 127 100 124 74Z', 'hair') + strands('M68 90C66 116 66 140 66 160M134 90C136 116 136 140 135 160M74 110C72 130 72 148 72 164M127 110C129 130 129 148 129 164'),
        front: p.base(PARTED_FRONT, 'hair') + strands('M100 18C96 26 92 34 90 40M100 18C106 26 112 34 116 43M84 24C78 34 74 48 72 66M118 24C124 34 128 48 129 66'),
      }
    case 'bob':
      return {
        back: p.base('M68 54C64 24 82 11 100 11C118 11 136 24 132 54C133 70 134 86 136 102C128 108 118 106 114 102L86 102C82 106 72 108 64 102C66 86 67 70 68 54Z', 'hair') + p.shade('M68 70C67 84 66 94 64 102C70 106 76 106 80 104C76 94 74 82 74 72Z', 'hair'),
        front: p.base('M71 76C67 42 82 15 100 15C118 15 133 42 129 76C127 60 123 48 115 42C106 44 92 48 80 57C76 63 73 69 71 76Z', 'hair') + strands('M98 18C92 30 86 42 80 56M110 20C112 28 114 36 115 42M120 26C124 36 127 48 128 62'),
      }
    case 'bun':
      return {
        back: `<circle cx="100" cy="11" r="15" fill="${P.hair}"/>${strands('M90 8C94 4 104 3 110 8M88 14C94 20 106 20 112 14', 1.2)}`,
        front: p.base(CAP_FRONT, 'hair') + strands('M84 24C90 20 96 19 100 20M116 24C110 20 104 19 100 20M78 38C82 30 90 26 96 26'),
      }
    case 'ponytail':
      return {
        back: p.base('M110 24C132 22 144 40 142 72C140 104 134 128 128 146C126 124 126 98 124 74C122 52 118 38 106 30Z', 'hair') + strands('M128 50C132 74 132 100 130 126M134 60C136 84 134 108 132 128') + `<rect x="114" y="24" width="10" height="7" rx="3" transform="rotate(30 119 27)" fill="${P.band}"/>`,
        front: p.base(CAP_FRONT, 'hair') + strands('M84 24C90 20 96 19 100 20M100 20C108 20 114 22 120 28M78 38C82 30 90 26 96 26'),
      }
    case 'curly': {
      const poly = CURLS.map(([x, y]) => [x, y - 5])
      const skip = (q) => q[0] > 74 && q[0] < 126 && q[1] > 21 && q[1] < 95
      return {
        back: p.base(curlyOutline(poly), 'hair') + p.shade('M76 35C70 55 70 85 76 105C70 107 64 105 60 99C58 75 62 49 76 35Z M124 35C130 55 130 85 124 105C130 107 136 105 140 99C142 75 138 49 124 35Z', 'hair') + curlStroke(ringlets(poly, 46, 11, skip, 1.15), 2.4, dark(P.hair, 0.4)) + curlStroke(ringlets(poly, 34, 29, skip, 0.95), 1.4, P.hairHi, 0.75),
        front: shift(0, -5, p.base('M69 74C66 44 78 16 100 14C122 16 134 44 131 74C129 64 127 55 123 48C117 41 109 38 100 38.5C91 38 83 41 77 48C73 55 71 64 69 74Z', 'hair') + curlStroke(ringlets([[72, 70], [70, 46], [86, 22], [114, 22], [130, 46], [128, 70], [124, 50], [100, 40], [76, 50]], 14, 7, null, 0.8), 1.3, P.hairHi, 0.8) + p.base('M76 46C80 40 86 40 90 44C93 39 99 39 102 43C105 38 112 38 115 43C119 40 124 42 124.5 47C121 45 117 46 115.5 49C112 45.5 106 45.5 103 49C100 45 94 45 91 48.5C88 45 82 45 79.5 50Z', 'hair') + strands('M82 46c-1 2-1 4 1 5M95 45c-1 2-1 4 1 5M108 45c-1 2-1 4 1 5M118 46c-1 2-1 4 1 5', 1.2)),
      }
    }
    case 'afro':
      return {
        back: p.base(curlyOutline(AFRO, 0.7), 'hair') + curlStroke(ringlets(AFRO, 34, 5, faceZone, 0.8), 2.2, dark(P.hair, 0.4)) + curlStroke(ringlets(AFRO, 26, 17, faceZone, 0.7), 1.3, P.hairHi, 0.7),
        front: p.base('M72 62C69 36 82 20 100 20C118 20 131 36 128 62C126 52 122 45 116 41C110 38 90 38 84 41C78 45 74 52 72 62Z', 'hair') + curlStroke(ringlets([[74, 60], [74, 36], [100, 22], [126, 36], [126, 60], [116, 42], [84, 42]], 10, 3, null, 0.7), 1.2, P.hairHi, 0.7),
      }
    case 'waves':
      return {
        back: p.base(curlyOutline(WAVES, 0.9), 'hair') + strands('M64 60C60 72 66 84 62 96S64 120 60 132S64 150 62 162M136 60C140 72 134 84 138 96S136 120 140 132S136 150 138 162M72 100C70 112 74 124 70 136S72 152 70 164M128 100C130 112 126 124 130 136S128 152 130 164', 1.4),
        front: p.base(PARTED_FRONT, 'hair') + strands('M100 18C96 26 92 34 90 40M100 18C106 26 112 34 116 43M84 26C78 36 74 50 73 64M117 26C124 36 128 50 128 64'),
      }
    case 'buzz':
      return {
        back: '',
        front: p.base('M75 52C73 29 86 18 100 18C114 18 127 29 125 52C124 45 121 40 117 37C110 34 90 34 83 37C79 40 76 45 75 52Z', 'hair', { op: 0.92 }) + `<path d="M75 52C73 29 86 18 100 18C114 18 127 29 125 52C124 45 121 40 117 37C110 34 90 34 83 37C79 40 76 45 75 52Z" fill="url(#cx-dots)" opacity="0.35"/>`,
      }
    case 'bald':
      return { back: '', front: `<path d="M88 30C92 26 100 25 106 27" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.35"/>` }
    default: // short: the curtain fringe
      return {
        back: '',
        front: p.base('M74.5 56C67 42 67 22 82 12C94 4 112 5 123 12C135 20 136 40 125.5 56L125.5 50C124 44 122 40 119 37H81C78 40 76 44 74.5 50Z', 'hair') + p.shade('M81 37C78 40 76 44 75 50C74 44 75 38 78 34Z M119 37C122 40 124 44 125 50C126 44 125 38 122 34Z', 'hair') + p.base('M100 24C88 22 77 29 74.5 43C73.5 49 74.5 53 75.5 56C78 47 84 41.5 92 39.5C96.5 38.5 99.5 33.5 100 24Z', 'hair') + p.base('M100 24C112 22 123 29 125.5 43C126.5 49 125.5 53 124.5 56C122 47 116 41.5 108 39.5C103.5 38.5 100.5 33.5 100 24Z', 'hair') + strands('M84 14C92 10 104 10 112 14M80 20C88 15 96 14 102 16M77 30C82 26 88 25 92 26M120 28C116 25 111 24 107 25M86 43C82 46 79 50 77.5 54M114 43C118 46 121 50 122.5 54M98 28C97 32 95 35 92 37M102 28C103 32 105 35 108 37') + p.hi('M86 16C92 12.5 102 12 108 14L107 17C101 15.5 93 16 87 19Z', 'hair'),
      }
  }
}

// ---------- headwear (shared head space) ----------
function hatFor(type, p, P, big) {
  const c = P.hat
  const wrap = (s) => (big ? `<g transform="translate(100 40) scale(1.1) translate(-100 -40)">${s}</g>` : s)
  switch (type) {
    case 'cap':
      return wrap(p.base('M72 42C70 12 130 12 128 42C110 36 90 36 72 42Z', c) + p.base('M66 42C84 37 116 37 134 42C130 51 114 55 100 55C86 55 70 51 66 42Z', dark(c, 0.2)) + p.line('M70 44C86 40 114 40 130 44', dark(c, 0.35), 1) + p.line('M100 14V37', c, 1) + `<circle cx="100" cy="14" r="2" fill="${dark(c, 0.2)}"/>`)
    case 'beanie':
      return wrap(p.base('M72 44C70 12 130 12 128 44Z', c) + p.base('M70 33C88 28 112 28 130 33L130 46C112 41 88 41 70 46Z', dark(c, 0.14)) + p.line('M78 32V45M86 30.6V43.6M94 29.8V42.8M102 29.8V42.8M110 30V43M118 30.8V43.8M124 31.8V44.8', dark(c, 0.14), 1))
    case 'pom':
      return wrap(p.base('M72 44C70 10 130 10 128 44Z', c) + p.base('M70 33C88 28 112 28 130 33L130 46C112 41 88 41 70 46Z', dark(c, 0.14)) + p.line('M78 32V45M86 30.6V43.6M94 29.8V42.8M102 29.8V42.8M110 30V43M118 30.8V43.8M124 31.8V44.8', dark(c, 0.14), 1) + `<circle cx="100" cy="8" r="9" fill="#f7f1e6"/>`)
    case 'bucket':
      return wrap(p.base('M75 38C75 12 125 12 125 38Z', c, { pat: P.hatPat }) + p.base('M64 42C74 32 126 32 136 42C130 50 70 50 64 42Z', dark(c, 0.12)) + p.line('M75 36C88 32 112 32 125 36', c, 1))
    case 'sunhat':
      return wrap(p.base('M78 36C78 14 122 14 122 36Z', '#e2c48a') + p.base('M50 42C66 28 134 28 150 42C140 52 60 52 50 42Z', '#d6b375') + p.base('M78 30C92 28 108 28 122 30L122 36C108 34 92 34 78 36Z', '#a8553a') + p.line('M60 42C80 36 120 36 140 42M70 46C90 42 110 42 130 46', '#d6b375', 0.8))
    case 'headband':
      return p.base('M74 35C80 21 120 21 126 35L126 42C118 31 82 31 74 42Z', c, { pat: 'paisley' }) + p.base('M125 35L138 28L136 40L127 41Z M137 29L146 26L141 35Z', c, { pat: 'paisley' })
    case 'party':
      return p.base('M86 22L100 -14L114 22Z', c) + p.line('M90 12L110 6M93 2L106 -2', '#f7f1e6', 2, { raw: true }) + `<circle cx="100" cy="-14" r="5" fill="#d99a2b"/>`
    default:
      return ''
  }
}

// ---------- faces ----------
function faceFeatures(a, frame, P, look) {
  const F = FRAMES[frame]
  const [ex, ey] = F.eyes
  const ink = '#2a1a14'
  const eye = (x) => {
    switch (a.eyes) {
      case 'happy':
        return `<path d="M${x - 3} ${ey + 1}q3-4 6 0" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      case 'lashes':
        return `<ellipse cx="${x + 0.6}" cy="${ey}" rx="1.9" ry="2.4" fill="${ink}"/><path d="M${x + (x < 100 ? -2.4 : 3.6)} ${ey - 1.6}l${x < 100 ? -2 : 2}-1.6" stroke="${ink}" stroke-width="1.2" stroke-linecap="round"/>`
      case 'sleepy':
        return `<path d="M${x - 3} ${ey}q3 2.4 6 0" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      default:
        return `<ellipse cx="${x + 0.6}" cy="${ey}" rx="1.9" ry="2.4" fill="${ink}"/>`
    }
  }
  const by = ey - 8
  const browW = a.brows === 'bold' ? 2.6 : 1.6
  const brows = a.brows === 'none' ? '' : `<path d="M${ex[0] - 7} ${by + 1.6}C${ex[0] - 3} ${by - 1.4} ${ex[0] + 3} ${by - 1.6} ${ex[0] + 6} ${by + 0.4}M${ex[1] + 7} ${by + 1.6}C${ex[1] + 3} ${by - 1.4} ${ex[1] - 3} ${by - 1.6} ${ex[1] - 6} ${by + 0.4}" stroke="${P.hair}" stroke-width="${browW}" fill="none" stroke-linecap="round"/>`
  const ny = ey + 3
  const nose = `<path d="M101 ${ny}l3 7.5h-4" stroke="${ink}" stroke-width="1.2" fill="none" stroke-linejoin="round"/>`
  const mouth = look?.lips
    ? `<path d="M94.5 ${ny + 16}C97 ${ny + 14.4} 99 ${ny + 14.6} 100 ${ny + 15.4}C101 ${ny + 14.6} 103 ${ny + 14.4} 105.5 ${ny + 16}C103 ${ny + 19.6} 97 ${ny + 19.6} 94.5 ${ny + 16}Z" fill="${look.lips}"/>`
    : `<path d="M94 ${ny + 16}q6 4.4 12 0" stroke="${ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
  const blush = `<ellipse cx="${ex[0] - 3}" cy="${ey + 10}" rx="5" ry="2.8" fill="#ff7f7f" opacity="0.22"/><ellipse cx="${ex[1] + 3}" cy="${ey + 10}" rx="5" ry="2.8" fill="#ff7f7f" opacity="0.22"/>`
  return `${blush}${brows}<g class="blink">${eye(ex[0])}${eye(ex[1])}</g>${nose}${mouth}`
}

const BEARD = 'M74.8 56H77.4C78.2 66 80.4 74 84.8 79.2C87.8 82.4 91.8 84 96 84.4L104 84.4C108.2 84 112.2 82.4 115.2 79.2C119.6 74 121.8 66 122.6 56H125.2C125.6 70 124.2 80.5 119.4 88C114 95.2 107.5 98.4 100 98.4C92.5 98.4 86 95.2 80.6 88C75.8 80.5 74.4 70 74.8 56Z'
const MUSTACHE = 'M90.5 73.4C94.2 71.6 98 71.8 100 72.6C102 71.8 105.8 71.6 109.5 73.4C106.4 74.5 103 74.7 100 74.2C97 74.7 93.6 74.5 90.5 73.4Z'
const MUSTACHE_SIDES = 'M90.5 73.4C89.2 76 88.8 79 89.4 82.2L91 82.6C90.6 79.6 90.8 76.6 91.6 74Z M109.5 73.4C110.8 76 111.2 79 110.6 82.2L109 82.6C109.4 79.6 109.2 76.6 108.4 74Z'
const STUBBLE = 'M76.5 62C78.5 80 88 93.5 100 93.5C112 93.5 121.5 80 123.5 62C120 76 112 84 104 84.5C102 83 98 83 96 84.5C88 84 80 76 76.5 62Z M90 74.5C94 72.5 98 72.6 100 73.4C102 72.6 106 72.5 110 74.5C106 75.5 103 76 100 75.6C97 76 94 75.5 90 74.5Z'

function facialHair(type, P, frame) {
  const dy = frame === 'A' ? 2 : 0
  if (type === 'beard') return shift(0, dy, `<path d="${BEARD}" fill="${P.hair}" opacity="0.92"/><path d="${MUSTACHE}${MUSTACHE_SIDES}M98.4 80.6C99.4 80 100.6 80 101.6 80.6L101.2 84.6H98.8Z" fill="${P.hair}"/><path d="M78.6 62v8M81.6 72l1.4 4M118.4 72l-1.4 4M121.4 62v8" stroke="${P.hairHi}" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>`)
  if (type === 'stubble') return shift(0, dy, `<path d="${STUBBLE}" fill="${P.hair}" opacity="0.18"/><path d="${STUBBLE}" fill="url(#cx-dots)" opacity="0.55"/>`)
  if (type === 'mustache') return shift(0, dy, `<path d="${MUSTACHE}" fill="${P.hair}"/>`)
  return ''
}

function glassesFor(type, frame) {
  const [[l, r], y] = FRAMES[frame].eyes
  const ink = '#1d1a1f'
  if (type === 'round') return `<path d="M${l - 9} ${y}a9 9 0 1 0 18 0a9 9 0 1 0 -18 0ZM${r - 9} ${y}a9 9 0 1 0 18 0a9 9 0 1 0 -18 0ZM${l + 9} ${y - 0.5}H${r - 9}M${l - 9} ${y - 2}l-4.5-2M${r + 9} ${y - 2}l4.5-2" fill="none" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`
  if (type === 'square') return `<path d="M${l - 9.5} ${y - 6.5}h19v12.5h-19ZM${r - 9.5} ${y - 6.5}h19v12.5h-19ZM${l + 9.5} ${y - 2}H${r - 9.5}M${l - 9.5} ${y - 3}l-4-1.6M${r + 9.5} ${y - 3}l4-1.6" fill="none" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`
  if (type === 'shades') return `<path d="M${l - 9} ${y - 5}H${l + 9}V${y + 1}C${l + 9} ${y + 5} ${l + 6} ${y + 7.5} ${l} ${y + 7.5}C${l - 6} ${y + 7.5} ${l - 9} ${y + 5} ${l - 9} ${y + 1}ZM${r - 9} ${y - 5}H${r + 9}V${y + 1}C${r + 9} ${y + 5} ${r + 6} ${y + 7.5} ${r} ${y + 7.5}C${r - 6} ${y + 7.5} ${r - 9} ${y + 5} ${r - 9} ${y + 1}Z" fill="#2a1d18"/><path d="M${l + 9} ${y - 2.5}H${r - 9}M${l - 9} ${y - 4}l-5-2M${r + 9} ${y - 4}l5-2" stroke="#2a1d18" stroke-width="2"/><path d="M${l - 6} ${y - 2}l4-1.6M${r - 6} ${y - 2}l4-1.6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>`
  if (type === 'sunnies') return [l, r].map((x) => `<circle cx="${x}" cy="${y}" r="8.6" fill="#3a2620" opacity="0.9"/><circle cx="${x}" cy="${y}" r="8.6" fill="none" stroke="#d99a2b" stroke-width="2"/>`).join('') + `<path d="M${l + 8.6} ${y - 1}H${r - 8.6}" stroke="#d99a2b" stroke-width="2"/>`
  return ''
}

// ---------- shoes ----------
const SHOES = {
  sneakers(p, frame, c, accent, sole = '#efe6d4') {
    if (frame === 'A') {
      const one = (d, s, toe, sw) => p.base(d, c) + p.base(toe, accent) + p.base(s, sole) + p.line(sw, accent, 3, { raw: true })
      return one('M58 484C48 487 40 494 37.5 500C36 505 39.5 508.5 46 508.5H94.5C98.5 508.5 100.5 505 99.5 499L97 484Z', 'M37 503.5H100.2V506.5C100.2 510 98 513 94 513H45C40 513 37 510 37 506.5Z', 'M38 500C40 493 47 489 56 488.5L60 500Z', 'M44 499C58 499 74 495 92 487') + one('M103 484L100.5 499C99.5 505 101.5 508.5 105.5 508.5H154C160.5 508.5 164 505 162.5 500C160 494 152 487 142 484Z', 'M99.8 503.5H163V506.5C163 510 160 513 155 513H106C102 513 99.8 510 99.8 506.5Z', 'M162 500C160 493 153 489 144 488.5L140 500Z', 'M156 499C142 499 126 495 108 487') + p.line('M42 508H96M104 508H158', sole, 1, { op: 0.6 })
    }
    const one = (d, s, panel, laces) => p.base(d, c) + p.base(panel, accent) + p.line(laces, c, 1.3) + p.base(s, sole)
    return one('M60 478C48 481 39 490 36 498C34.5 503 38 507 45 507H96C99 507 101 504 100.5 499L99 478Z', 'M34 500C35 498 37 497.5 40 497.5H101V505C101 510 98 513.5 93 513.5H42C37 513.5 34 510 34 506Z', 'M40 497C44 490 52 486 62 485C70 487 78 492 84 497Z', 'M68 482l10 4M72 479l10 4M76 477l9 3.5') + one('M101 478L99.5 499C99 504 101 507 104 507H155C162 507 165.5 503 164 498C161 490 152 481 140 478Z', 'M166 500C165 498 163 497.5 160 497.5H99V505C99 510 102 513.5 107 513.5H158C163 513.5 166 510 166 506Z', 'M160 497C156 490 148 486 138 485C130 487 122 492 116 497Z', 'M132 482l-10 4M128 479l-10 4M124 477l-9 3.5') + p.line('M38 506H96M104 506H162', sole, 1, { op: 0.6 })
  },
  heels(p, frame, c) {
    const [l, r] = frame === 'A' ? [[83, 492], [120, 492]] : [[78, 492], [122, 492]]
    const one = ([x, y], dir) => p.base(`M${x - 5} ${y - 4}C${x - 9 * dir} ${y + 3} ${x - 13 * dir} ${y + 10} ${x - 13 * dir} ${y + 14}C${x - 13 * dir} ${y + 17} ${x - 9 * dir} ${y + 18} ${x - 3 * dir} ${y + 17}L${x + 8 * dir} ${y + 16}C${x + 9.5 * dir} ${y + 11} ${x + 8.6 * dir} ${y + 3} ${x + 5.6 * dir} ${y - 4}Z`, c) + p.line(`M${x - 5} ${y - 6}H${x + 6}`, '#d99a2b', 1.6, { raw: true })
    return one(l, 1) + one(r, -1)
  },
  slides(p, frame, c) {
    const off = frame === 'A' ? [5, 0] : [0, 0]
    return shift(off[0], off[1], p.base('M56 494H96V502C96 507 93 509 88 509H62C58 509 55 507 55 503Z', '#2a1d18') + p.base('M58 486H94V497H58Z', c) + p.base('M104 494H144V503C144 507 141 509 137 509H112C107 509 104 507 104 502Z', '#2a1d18') + p.base('M106 486H142V497H106Z', c))
  },
  furBoots(p, frame, c) {
    return SHOES.sneakers(p, frame, c, dark(c, 0.3), '#3a2620') + p.base('M44 474C50 470 56 472 62 470C68 474 74 471 80 472C86 469 92 473 98 471V488H44Z', '#f7f1e6') + p.base('M102 471C108 473 114 469 120 472C126 471 132 474 138 470C144 472 150 470 156 474V488H102Z', '#f7f1e6')
  },
  platforms(p, frame) {
    const [l, r] = frame === 'A' ? [[84, 83], [117, 120]] : [[78, 78], [122, 122]]
    return p.base(limb([[l[0], 400], [l[1], 488]], [17, 16]), '#1d1a1f') + p.base(limb([[r[0], 400], [r[1], 488]], [17, 16]), '#1d1a1f') + p.base(`M${l[1] - 15} 486H${l[1] + 15}V504C${l[1] + 15} 508 ${l[1] + 13} 510 ${l[1] + 9} 510H${l[1] - 11}C${l[1] - 14} 510 ${l[1] - 16} 508 ${l[1] - 16} 505Z`, '#1d1a1f') + p.base(`M${r[1] - 15} 486H${r[1] + 15}V505C${r[1] + 15} 508 ${r[1] + 13} 510 ${r[1] + 10} 510H${r[1] - 9}C${r[1] - 13} 510 ${r[1] - 15} 508 ${r[1] - 15} 504Z`, '#1d1a1f') + p.line(`M${l[1] - 15} 500H${l[1] + 15}M${r[1] - 15} 500H${r[1] + 15}`, '#3a3540', 1.4, { raw: true })
  },
}

// ---------- garments ----------
// Each returns markup; c is the main colour, o carries extras.
const SLEEVES_A = (p, c, o = {}) => {
  const L = o.short ? [[[69, 128], [63, 158], [60, 176]], [25, 22, 21]] : [[[69, 128], [62, 165], [59, 205], [57, 236], [57, 250]], [24, 20, 17, 16, 15]]
  const R = o.short ? [[[131, 128], [142, 152], [148, 168]], [25, 22, 21]] : [[[131, 128], [145, 158], [157, 188], [143, 205], [134, 212]], [24, 21, 18, 16, 15]]
  return p.base(limb(...L), c, o) + p.base(limb(...R), c, o) + (o.short ? '' : p.shade(limb([[66, 132], [59, 168], [56, 206], [54, 236]], [8, 7, 6, 5]), c) + p.line('M50 244C54 247 60 247 64 244M128 206C131 210 135 215 137 218', c, 1.2))
}
const SLEEVES_R = (p, c, o = {}) => {
  if (o.short) return p.base(limb([[60, 124], [54, 158], [50, 182]], [28, 26, 25]), c, o) + p.base(limb([[140, 124], [146, 158], [150, 182]], [28, 26, 25]), c, o) + p.line('M38 180C44 186 54 188 62 184M162 180C156 186 146 188 138 184', c, 1.3)
  return p.base(limb([[61, 126], [53, 165], [48, 205], [46, 238], [49, 262]], [27, 22, 19, 17, 15]), c, o) + p.base(limb([[139, 126], [147, 165], [152, 205], [155, 238], [152, 260]], [27, 22, 19, 17, 15]), c, o) + p.shade(limb([[56, 132], [49, 168], [44, 206], [42, 238]], [8, 7, 6, 5]), c) + p.base(limb([[47, 254], [49, 264]], [17, 16]), dark(p.col(c), 0.1)) + p.base(limb([[153, 252], [152, 262]], [17, 16]), dark(p.col(c), 0.1))
}

const R_BODY = (hem) => `M86 108C78 112 66 115 60 120C54 125 52 134 53 146L58 200C60 222 61 244 62 ${hem}C88 ${hem + 6} 112 ${hem + 6} 138 ${hem}C139 244 140 222 142 200L147 146C148 134 146 125 140 120C134 115 122 112 114 108C110 114 90 114 86 108Z`
const R_BODY_SHADE = 'M58 200C60 222 61 244 62 266C66 267.5 70 268.5 74 269C71 248 68 226 66 204Z M142 200C140 222 139 244 138 266C134 267.5 130 268.5 126 269C129 248 132 226 134 204Z'
const A_SHORT_TOP = 'M84 112C76 116 66 118 62 126C58 134 60 150 63 168L67 206C88 211 112 211 133 206L137 168C140 150 142 134 138 126C134 118 124 116 116 112C110 118 90 118 84 112Z'
const BOXY = 'M88 110C80 114 65 116 55 122C46 127 42 136 40 150L31.5 213C40 219 52 221 62.5 219L64 199L65 286C88 292.5 112 292.5 135 286L136 199L137.5 219C148 221 160 219 168.5 213L160 150C158 136 154 127 145 122C135 116 120 114 112 110C108 117 92 117 88 110Z'
const BOXY_SHADE = 'M40 150L31.5 213C35 215.5 39 217 43 218L48 160Z M160 150L168.5 213C165 215.5 161 217 157 218L152 160Z M65 240C64.6 256 64.8 272 65 286C72 288 78 289.5 84 290.5C76 276 70 258 65 240Z M135 240C135.4 256 135.2 272 135 286C128 288 122 289.5 116 290.5C124 276 130 258 135 240Z'

const TOPS = {
  // frame A
  tubeA: (p, c) => p.base('M67.5 145C80 139.5 120 139.5 132.5 145C131.5 158 128.5 171 126 185C110 189.5 90 189.5 74 185C71.5 171 68.5 158 67.5 145Z', c) + p.shade('M74 172C90 177 110 177 126 172L126 185C110 189.5 90 189.5 74 185Z M67.5 145C69 158 71.5 171 74 185L79 185C77 171 74 157 71 144Z', c) + p.hi('M81 147.5C87 145.6 93 145.2 98 145.6L97.4 150C92.6 149.8 87 150.4 82 152Z', c) + p.line('M68.5 149.5C80 144.2 120 144.2 131.5 149.5M73.5 181C90 185.4 110 185.4 126.5 181', c, 1.4),
  teeA: (p, c, o = {}) => p.base('M70 126C80 120 92 118 100 120C108 118 120 120 130 126L139 150L128 154L127 146C126 162 126 178 126.5 196C110 200.5 90 200.5 73.5 196C74 178 74 162 73 146L72 154L61 150Z', c) + p.shade('M73 146C74 162 74 178 73.5 196L79 197C79 180 78 162 76 146Z', c) + p.line('M88 121C92 128 108 128 112 121M63 148L71 151M137 148L129 151', c, 1.2) + (o.motif ? p.base('M95 150C95 146 100 145 100 149C100 145 105 146 105 150C105 154 100 158 100 158C100 158 95 154 95 150Z', o.motif) : ''),
  hoodieA: (p, c) => SLEEVES_A(p, c) + p.base(A_SHORT_TOP, c) + p.shade('M63 168L67 206C70 207 73 207.6 76 208L72 170Z M137 168L133 206C130 207 127 207.6 124 208L128 170Z', c) + p.base('M66 198C88 204 112 204 134 198L133.4 208C112 213 88 213 66.6 208Z', dark(p.col(c), 0.12)) + p.base('M84 112C82 100 118 100 116 112C112 124 88 124 84 112Z', dark(p.col(c), 0.12)) + p.line('M95 120L94 146M105 120L106 146', '#f7f1e6', 1.5, { raw: true }) + p.dot(94, 147, 1.7, '#f7f1e6') + p.dot(106, 147, 1.7, '#f7f1e6'),
  shirtA: (p, c) => SLEEVES_A(p, c) + p.base(A_SHORT_TOP, c) + p.shade('M63 168L67 206C70 207 73 207.6 76 208L72 170Z', c) + p.base('M92 204C96 212 104 212 108 204L112 220C106 216 94 216 88 220Z', dark(p.col(c), 0.08)) + p.base('M84 112L90 127L100 118Z M116 112L110 127L100 118Z', dark(p.col(c), 0.1)) + p.line('M100 118V206', c, 1.2) + [140, 160, 180].map((y) => p.dot(102.4, y, 1.5, '#f7f1e6')).join('') + p.base(limb([[57, 236], [57, 250]], [18, 17]), dark(p.col(c), 0.08)),
  jacketA: (p, c, o = {}) => (o.inner === null ? '' : TOPS.tubeA(p, o.inner ?? '#efe3c8')) + p.base('M86 110C76 114 66 118 62 126C58 134 60 150 62 168L65 192C74 196 82 196 90 194L94 150C92 132 90 120 86 110Z M114 110C124 114 134 118 138 126C142 134 140 150 138 168L135 192C126 196 118 196 110 194L106 150C108 132 110 120 114 110Z', c) + p.hi('M70 130C68 146 68 160 70 176L74 176C72 160 72 146 74 130Z', c) + p.line('M86 110L96 136M114 110L104 136M65 186C74 190 82 190 90 188M135 186C126 190 118 190 110 188', c, 1.1) + SLEEVES_A(p, c),
  dressA: (p, c, o = {}) => p.base('M70 146C82 154 118 154 130 146C131 160 128 176 124.5 192C121.5 204 121 213 124 228C130 270 138 340 147 420C120 431 80 431 53 420C62 340 70 270 76 228C79 213 78.5 204 75.5 192C72 176 69 160 70 146Z', c, o) + p.shade('M53 420C62 340 70 270 76 228L82 230C77 280 72 350 66 425Z M147 420C138 340 130 270 124 228L118 230C124 280 130 350 136 425Z M70 146C82 154 118 154 130 146L130 152C118 160 82 160 70 152Z', c) + p.hi('M94 236C96 290 96 360 92 424L99 425C101 360 101 290 99 236Z M108 166C110 176 110 186 108 194L112 194C114 184 114 176 112 166Z', c) + p.line('M76 146L79 122M124 146L121 122', c, 1.4) + p.line('M86 300C88 340 87 380 84 424M114 300C112 340 113 380 116 424', c, 1),
  miniDressA: (p, c, o = {}) => p.base('M70 146C82 154 118 154 130 146C131 160 128 176 124.5 192C121.5 204 121 213 124 228C127 248 130 266 133 284C112 291 88 291 67 284C70 266 73 248 76 228C79 213 78.5 204 75.5 192C72 176 69 160 70 146Z', c, o) + p.shade('M67 284C70 266 73 248 76 228L81 230C78 250 75 268 73 286Z M70 146C82 154 118 154 130 146L130 152C118 160 82 160 70 152Z', c) + p.line('M76 146L79 122M124 146L121 122', c, 1.4),
  // frame R
  teeR: (p, c) => SLEEVES_R(p, c, { short: true }) + p.base(R_BODY(276), c) + p.shade(R_BODY_SHADE, c) + p.base('M86 108C90 121 110 121 114 108L112 110C108 117 92 117 88 110Z', dark(p.col(c), 0.12)) + p.line('M70 230C72 246 72 260 70 274M130 230C128 246 128 260 130 274', c, 1),
  shirtR: (p, c, o = {}) => SLEEVES_R(p, c, { short: true, pat: o.pat }) + p.base(R_BODY(266), c, { pat: o.pat }) + p.shade(R_BODY_SHADE, c) + p.base('M62 260C88 266 112 266 138 260L138 268C112 274 88 274 62 268Z', dark(p.col(c), 0.12)) + p.base('M86 108L100 150L114 108C110 114 90 114 86 108Z', 'skin') + p.line('M100 150V266', c, 1.2) + [176, 206, 236].map((y) => p.dot(102.4, y, 1.7, '#ece0c8')).join('') + p.base('M86 106C82 113 79 120 78 128L94 138L100 150Z', c, { pat: o.pat }) + p.base('M114 106C118 113 121 120 122 128L106 138L100 150Z', c, { pat: o.pat }),
  hoodieR: (p, c) => SLEEVES_R(p, c) + p.base(R_BODY(272), c) + p.shade(R_BODY_SHADE, c) + p.base('M64 266C88 272 112 272 136 266L136.4 280C112 286 88 286 63.6 280Z', dark(p.col(c), 0.12)) + p.base('M74 226H126L132 262H68Z', c) + p.line('M74 226L70 250M126 226L130 250M74 226H126', c, 1.2) + p.base('M80 112C78 98 122 98 120 112C116 126 84 126 80 112Z', dark(p.col(c), 0.12)) + p.line('M95 120L94 150M105 120L106 150', '#f7f1e6', 1.6, { raw: true }) + p.dot(94, 151, 1.8, '#f7f1e6') + p.dot(106, 151, 1.8, '#f7f1e6'),
  jacketR: (p, c, o = {}) => TOPS.teeR(p, o.inner ?? '#f3eee4') + p.base('M86 106C78 110 66 114 60 120C54 125 52 134 53 146L58 200C60 226 62 252 63 282L93 286L96 150C94 130 90 116 86 106Z M114 106C122 110 134 114 140 120C146 125 148 134 147 146L142 200C140 226 138 252 137 282L107 286L104 150C106 130 110 116 114 106Z', c) + p.shade('M58 200C60 226 62 252 63 282L72 283C70 252 68 226 66 204Z M142 200C140 226 138 252 137 282L128 283C130 252 132 226 134 204Z', c) + p.base('M86 104L80 122L95 142Z M114 104L120 122L105 142Z', dark(p.col(c), 0.14)) + p.line('M70 230H84M116 230H130', c, 1.2) + (o.rib ? p.base('M63 274L93 278L93 288L63 284Z M107 278L137 274L137 284L107 288Z', dark(p.col(c), 0.2)) : '') + SLEEVES_R(p, c) + (o.square ? p.base('M120 150L130 148L130 156L121 157Z', o.square) : ''),
  dressR: (p, c) => SLEEVES_R(p, c, { short: true }) + p.base('M86 108C78 112 66 115 60 120C54 125 52 134 53 146L58 200C60 240 58 300 55 400C86 408 114 408 145 400C142 300 140 240 142 200L147 146C148 134 146 125 140 120C134 115 122 112 114 108C110 114 90 114 86 108Z', c) + p.shade('M58 200C60 240 58 300 55 400L64 402C66 300 68 240 66 204Z', c) + p.base('M86 108C90 121 110 121 114 108L112 110C108 117 92 117 88 110Z', dark(p.col(c), 0.12)) + p.line('M84 220C86 280 84 340 80 404M116 220C114 280 116 340 120 404', c, 1),
  boxyR: (p, c, o = {}) => (o.longSleeves ? SLEEVES_R(p, c) : '') + p.base(BOXY, c, { pat: o.pat }) + p.shade(BOXY_SHADE, c) + p.line('M64.5 199C69 203 72 212 72 222M135.5 199C131 203 128 212 128 222M78 250C80 262 79 274 76 286M122 250C120 262 121 274 124 286', c, 1.1) + p.base('M86.5 108.5C90.5 122 109.5 122 113.5 108.5L112 110.5C108 118.5 92 118.5 88 110.5Z', o.collar ?? c),
}

const BOTTOMS = {
  jeansA: (p, c, o = {}) => p.base('M78 213H122C124.5 228 128 240 130.5 253C137 300 145 380 155 484C151 489 145 490 140 487C135 491 129 491 124 488C119 492 112 491 108 487C106 420 104 350 101 300H99C96.5 350 96 420 95.5 487C91 491 84 492 79 488C74 491 67 491 62 487C57 490 51 489 47 484C57 380 63 300 69.5 253C72 240 75.5 228 78 213Z', c, o) + p.shade('M101 300C104 350 106 420 108 487L116 488C113 420 109 350 103 301Z M99 300C96.5 350 96 420 95.5 487L88 488C89 420 91 350 97 300Z M69.5 253C63 300 57 380 47 484C51 489 54 488 57 486C64 384 70 304 76 258Z', c) + (o.fade ? `<path d="M78 352C82 340 92 342 92 360C92 384 86 392 81 388C76 382 75 364 78 352Z M117 354C121 342 131 344 132 362C133 386 127 394 122 390C117 384 114 366 117 354Z" fill="${light(p.col(c), 0.22)}" opacity="0.7"/>` : '') + p.line('M77.5 224H122.5M100 224V272M100 262C104 266 106 270 106.5 276M81 225C85 236 90 240 93 242M119 225C115 236 110 240 107 242M58 468C66 464 76 466 84 461M116 463C124 467 134 465 144 469M60 448C66 446 72 447 78 444M122 446C128 449 136 448 142 450', c, 1) + p.line('M84 212.5V224.5M116 212.5V224.5', c, 2.4) + p.dot(100, 219, 1.8, '#c9ccd2'),
  shortsA: (p, c) => p.base('M78 213H122C125 230 129 246 133 264L104 270L101 254H99L96 270L67 264C71 246 75 230 78 213Z', c) + p.shade('M99 254L96 270L90 269L97 255Z M101 254L104 270L110 269L103 255Z', c) + p.line('M77.5 224H122.5M100 224V252M81 225C85 234 90 238 93 240M119 225C115 234 110 238 107 240M68 260L95 266M105 266L132 260', c, 1) + p.line('M84 212.5V224.5M116 212.5V224.5', c, 2.4),
  skirtA: (p, c) => p.base('M78 212H122C126 238 132 260 137 282C112 289 88 289 63 282C68 260 74 238 78 212Z', c) + p.hi('M84 222C82 240 79 258 76 276L81 277C84 258 86 240 88 222Z', c) + p.line('M77.5 222H122.5M92 284L94 262M110 284L108 262', c, 1),
  trousersR: (p, c, o = {}) => p.base('M63 256H137C141 300 146 380 149 478H106L101.5 318H98.5L94 478H51C54 380 59 300 63 256Z', c) + p.shade('M98.5 318L94 478L85 478L96 319Z M101.5 318L106 478L115 478L104 319Z M51 478C54 380 59 300 63 256L67 258C62 320 58 400 57 478Z', c) + p.line(`${o.pleats ? 'M78 262C79 300 76 380 72 476M122 262C121 300 124 380 128 476M88 262L89 290M112 262L111 290' : 'M76 300C76 360 74 420 72 476M124 300C124 360 126 420 128 476'}M100 266V318M55 470C66 473 82 473 93 470M107 470C118 473 134 473 145 470`, c, 1.1) + p.base('M63 256H137L137.6 264H62.4Z', o.belt ?? '#3a2620') + p.base('M96 255H104V265H96Z', '#d99a2b'),
  joggersR: (p, c) => p.base('M64 268H136C140 300 143 340 142.5 380C142 420 137 448 132 468H106L101.5 330H98.5L94 468H68C63 448 58 420 57.5 380C57 340 60 300 64 268Z', c) + p.shade('M98.5 330L94 468L86 468L95.5 331Z M101.5 330L106 468L114 468L104.5 331Z M57.5 380C58 420 63 448 68 468L74 468C70 446 66 418 65 382Z', c) + p.line('M62 300L70 352M138 300L130 352M66 410C72 414 80 414 86 410M114 410C120 414 128 414 134 410M100 290V330', c, 1.1) + p.base('M69 464H94.4L95 482C86 484.6 77 484.6 68.4 482Z', dark(p.col(c), 0.16)) + p.base('M105.6 464H131L131.6 482C123 484.6 114 484.6 105 482Z', dark(p.col(c), 0.16)),
  cargosR: (p, c, o = {}) => p.base('M64 268H136C140 300 146 360 150.5 420C152.5 446 152.5 462 150 474L108 474C106 438 104 380 101.5 326H98.5C96 380 94 438 92 474L50 474C47.5 462 47.5 446 49.5 420C54 360 60 300 64 268Z', c, o) + p.shade('M101.5 326C104 380 106 438 108 474L117 474C114 430 110 372 103.5 327Z M98.5 326C96 380 94 438 92 474L84 474C86 430 90 372 96.5 327Z M49.5 420C47.5 446 47.5 462 50 474L57 474C55 460 55 444 56 426Z M150.5 420C152.5 446 152.5 462 150 474L143 474C145 460 145 444 144 426Z', c) + p.base('M55 352H73L73.5 392C68 396 60 396 55.5 392Z M127 352H145L144.5 392C140 396 132 396 126.5 392Z', c, o) + p.base('M54 348H74V359C68 361 60 361 54 359Z M126 348H146V359C140 361 132 361 126 359Z', dark(p.col(c), 0.08)) + p.line('M60 300C66 306 70 314 70 322M140 300C134 306 130 314 130 322M64 420C70 416 76 418 82 414M118 414C124 418 130 416 136 420M100 292V326', c, 1.1) + p.base('M56 466H92L93 482C82 485 66 485 55 482Z M108 466H144L145 482C134 485 118 485 107 482Z', dark(p.col(c), 0.06)),
  shortsR: (p, c) => p.base('M64 268H136C139 300 142 330 145 358L105 362L101 322H99L95 362L55 358C58 330 61 300 64 268Z', c) + p.shade('M99 322L95 362L88 361L95 323Z M101 322L105 362L112 361L105 323Z', c) + p.line('M56 350L95 354M105 354L144 350M100 292V322M70 300C74 306 76 312 76 318', c, 1.1),
  skirtR: (p, c) => p.base('M64 262H136C141 290 146 320 150 352C118 360 82 360 50 352C54 320 59 290 64 262Z', c) + p.shade('M50 352C54 320 59 290 64 262L70 264C66 294 62 324 58 354Z', c) + p.line('M80 270L76 354M120 270L124 354M100 268V356', c, 1),
}

// ---------- props held in the left hand (drawn in R anchor space, then moved) ----------
const cupHand = (p) => p.base(HAND.palm, 'skin') + HAND.fingers.map((d) => p.base(d, 'skin')).join('')
const PROPS = {
  phone: (p, P, frame) => {
    if (frame === 'A') return p.base('M48.5 270H61.5A2.4 2.4 0 0 1 64 272.4V297.6A2.4 2.4 0 0 1 61.5 300H48.5A2.4 2.4 0 0 1 46 297.6V272.4A2.4 2.4 0 0 1 48.5 270Z', P.phone) + '<rect x="48.2" y="276" width="13.6" height="22" rx="1.4" fill="#26252d"/><circle cx="51" cy="273.4" r="1.3" fill="#26252d"/><circle cx="54.6" cy="273.4" r="1.3" fill="#26252d"/>' + at(57, 260, 0, p.base(HAND.grip, 'skin') + p.base('M-1 9C2 8.5 6 9 8.6 10.2C9.8 10.8 9.6 12.8 8.2 13C5 13.2 1.6 12.8-1 12.4Z', 'skin') + p.base('M-1 14C2 13.6 6 14 8 15C9.2 15.6 9 17.4 7.6 17.6C4.6 17.8 1.6 17.4-1 17Z', 'skin'))
    return p.base('M40 276H58A2.4 2.4 0 0 1 60.4 278.4V306A2.4 2.4 0 0 1 58 308.4H40A2.4 2.4 0 0 1 37.6 306V278.4A2.4 2.4 0 0 1 40 276Z', P.phone) + '<rect x="40" y="282" width="18" height="24" rx="1.4" fill="#26252d"/>' + at(50, 271, -8, cupHand(p))
  },
  coffee: (p) => p.base('M38 270H64L61 314C61 316 59.5 317.5 57.5 317.5H44.5C42.5 317.5 41 316 41 314Z', '#efe2d0') + '<path d="M41.6 282H62.4L61 314C61 316 59.5 317.5 57.5 317.5H44.5C42.5 317.5 41 316 41 314Z" fill="#7a5a3a" opacity="0.85"/><path d="M45 286v24" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.45"/>' + p.base('M36 266C36 262 42 259 51 259C60 259 66 262 66 266V270H36Z', '#efe2d0') + p.line('M54 259L57 240', '#a8553a', 3, { raw: true }) + at(50, 271, -8, cupHand(p)),
  juice: (p) => p.base('M38 270H64L61 314C61 316 59.5 317.5 57.5 317.5H44.5C42.5 317.5 41 316 41 314Z', '#f7efe2') + '<path d="M41.6 282H62.4L61 314C61 316 59.5 317.5 57.5 317.5H44.5C42.5 317.5 41 316 41 314Z" fill="#e88a3a" opacity="0.85"/>' + p.base('M36 266C36 262 42 259 51 259C60 259 66 262 66 266V270H36Z', '#f7efe2') + p.line('M54 259L57 240', '#3e6b5a', 3, { raw: true }) + at(50, 271, -8, cupHand(p)),
  boba: (p) => p.base('M38 268H64L60.5 316C60.5 318 59 319 57 319H45C43 319 41.5 318 41.5 316Z', '#f3ece4') + '<path d="M40.4 284H61.6L60.5 316C60.5 318 59 319 57 319H45C43 319 41.5 318 41.5 316Z" fill="#c08a5a" opacity="0.85"/>' + [[46, 312], [51, 314], [56, 312], [48.5, 308], [54, 308], [59, 309], [44, 307]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#2a1d18"/>`).join('') + p.base('M36 264C36 262 42 260 51 260C60 260 66 262 66 264V268H36Z', '#f3ece4') + p.line('M52 262L58 238', '#2a1d18', 5, { raw: true }) + at(50, 271, -8, cupHand(p)),
  mug: (p, P) => p.base('M38 274H62V300C62 305 59 308 54 308H46C41 308 38 305 38 300Z', '#e9e1d2') + p.line('M62 280C69 280 70 294 62 294', '#e9e1d2', 3, { raw: true }) + p.base('M38 274H62V279H38Z', P.accent) + p.line('M46 266C44 262 48 260 46 256M54 266C52 262 56 260 54 256', '#f7f1e6', 1.2, { raw: true }) + at(50, 271, -8, cupHand(p)),
  popper: (p) => p.base('M42 298L60 296L50 262Z', '#3e6b5a') + p.line('M44 290L58 288M46 282L56 280M48 274L54 273', '#d99a2b', 1.4, { raw: true }) + p.line('M50 262C46 250 52 244 48 234M50 262C56 252 62 252 64 242M50 262C44 256 38 256 34 248', '#a8553a', 1.6, { raw: true }) + '<rect x="36" y="236" width="4" height="2.4" fill="#d99a2b" transform="rotate(30 38 237)"/><rect x="60" y="232" width="4" height="2.4" fill="#3e6b5a" transform="rotate(-20 62 233)"/><circle cx="46" cy="226" r="1.8" fill="#a8553a"/><circle cx="66" cy="246" r="1.6" fill="#d99a2b"/>' + at(50, 271, -8, cupHand(p)),
  clutch: (p) => p.base('M40 268H60C62 268 63 269 63 271V282C63 284 62 285 60 285H40C38 285 37 284 37 282V271C37 269 38 268 40 268Z', '#d99a2b') + p.line('M37 274H63', '#d99a2b', 1) + at(50, 266, -8, cupHand(p)),
  rose: (p) => p.line('M51 300L44 244', '#3e6b5a', 2.2, { raw: true }) + p.base('M44 252C38 248 36 242 40 240C44 242 46 246 44 252Z', '#3e6b5a') + `<g><circle cx="44" cy="236" r="7" fill="#b5475a"/><path d="M40 234C42 230 47 230 48 235C46 233 43 233 41 236" stroke="#7d2333" stroke-width="1.2" fill="none"/></g>` + at(50, 271, -8, cupHand(p)),
  keys: (p) => `<circle cx="51" cy="292" r="4" fill="none" stroke="#9a9aa2" stroke-width="1.6"/>` + p.base('M50 294L48 306L52 306Z', '#c9ccd2') + p.base('M53 294C58 294 60 298 60 302C60 306 56 308 54 306Z', '#a8553a') + at(50, 271, -8, cupHand(p)),
}

// ---------- accessories ----------
const BAG_A = (p, c) => p.line('M72 122C92 162 114 204 138 248', '#2a1d18', 2.2, { raw: true }) + p.base('M128 246H152C156 246 158 249 158 253V265C158 269 156 272 152 272H128C124 272 122 269 122 265V253C122 249 124 246 128 246Z', c) + p.shade('M122 265C122 269 124 272 128 272H152C156 272 158 269 158 265V263C150 266 130 266 122 263Z', c) + p.base('M122 253C122 249 124 246 128 246H152C156 246 158 249 158 253V258C150 261 130 261 122 258Z', c) + '<rect x="137" y="257" width="6" height="4" rx="1.2" fill="#d99a2b"/>'
const SLING_R = (p, c) => p.line('M138 120C120 140 104 160 94 182', c, 3.4, { raw: true }) + p.base('M60 190L90 180C94 179 97 181 98 185L102 199C103 203 101 206 97 207L67 217C63 218 60 216 59 212L56 198C55 194 56.5 191 60 190Z', c) + p.line('M62 199L96 188', '#c9ccd2', 1.2, { raw: true })
const NECKLACE = (p, frame) => (frame === 'A' ? p.line('M90 110C92 122 108 122 110 110', '#d99a2b', 1.3, { raw: true }) + p.line('M87.5 111C87 132 113 132 112.5 111', '#d99a2b', 1, { raw: true }) + p.dot(100, 127, 2.2, '#d99a2b') : p.line('M90 112C93 124 107 124 110 112', '#c9ccd2', 1.6, { raw: true }))
const SCARF = (p, frame, c) => shift(0, frame === 'A' ? 0 : -2, p.base('M82 104C90 118 110 118 118 104L120 122C108 132 92 132 80 122Z', c, { pat: 'check' }) + p.base('M104 124L114 176L101 178L96 128Z', c, { pat: 'check' }))

// ---------- scene looks ----------
// Each look, per frame, swaps the outfit while the face, hair and skin stay the person's own.
// `i` is the person's place in the crew, used to vary colours so a group never matches exactly.
const LOOKS = {
  romance: {
    A: (i) => ({ top: (p) => TOPS.dressA(p, pick(['#7d2333', '#1f2a44', '#2f5246'], i)), legs: true, shoes: (p, f) => SHOES.heels(p, f, '#2a1d18'), prop: 'clutch', lips: '#8e2b35', necklace: true }),
    R: (i) => ({ top: (p) => TOPS.jacketR(p, pick(['#a87a4f', '#2a3550', '#3e4a3a'], i), { inner: '#f3eee4', square: '#b5475a' }), bottom: (p) => BOTTOMS.trousersR(p, '#232227', { belt: '#2a1d18' }), shoes: (p, f) => SHOES.sneakers(p, f, '#f7f3ea', '#f7f3ea'), prop: 'rose' }),
  },
  beach: {
    A: (i) => ({ top: (p) => TOPS.tubeA(p, pick(['#e88a3a', '#3e6b5a', '#c2443a'], i)) + SLEEVES_A(p, '#f7f1e6', { short: true }) + p.base('M84 110C76 114 66 118 62 126C58 134 60 150 62 168L66 214L86 216L92 150C90 132 88 120 84 110Z M116 110C124 114 134 118 138 126C142 134 140 150 138 168L134 214L114 216L108 150C110 132 112 120 116 110Z', '#f7f1e6'), bottom: (p) => BOTTOMS.shortsA(p, '#e6d3ad'), legs: true, shoes: (p, f) => SHOES.slides(p, f, '#d99a2b'), hat: 'sunhat', glasses: 'shades', prop: 'juice' }),
    R: (i) => ({ top: (p) => TOPS.boxyR(p, '#efe3c8', { pat: 'tropic' }) + p.base('M90 112L100 160L110 112C106 116 94 116 90 112Z', '#f7f1e6') + p.line('M90 112L100 160L102 290M110 112L100 160', '#efe3c8', 1.3), bottom: (p) => BOTTOMS.shortsR(p, pick(['#e6d3ad', '#8fa68a', '#4a5f8a'], i)), legs: true, shoes: (p, f) => SHOES.slides(p, f, '#d99a2b'), glasses: 'shades', prop: 'juice', boxy: true }),
  },
  mountains: {
    A: (i) => ({ top: (p) => TOPS.tubeA(p, '#1f1e24') + p.base('M84 112C76 116 66 118 62 126C58 134 60 150 62 168L65 252C88 258 112 258 135 252L138 168C140 150 142 134 138 126C134 118 124 116 116 112C110 118 90 118 84 112Z', pick(['#d06a3a', '#3e6b5a', '#4a5f8a'], i)) + p.base('M62 166C88 171 112 171 138 166L137.6 192C112 197 88 197 62.6 192Z', '#3e6b5a') + p.line('M100 117V255M65 240C88 246 112 246 135 240', '#d06a3a', 1.2) + p.base('M84 112C86 100 114 100 116 112C110 121 90 121 84 112Z', '#2f5246') + SLEEVES_A(p, pick(['#d06a3a', '#3e6b5a', '#4a5f8a'], i)), bottom: (p) => BOTTOMS.jeansA(p, '#b49a6a'), shoes: (p, f) => SHOES.sneakers(p, f, '#7a5236', '#d99a2b', '#3a2620'), hat: 'cap', hatColor: '#3e6b5a', bag: '#d99a2b' }),
    R: (i) => ({ top: (p) => TOPS.teeR(p, '#5f6646') + SLEEVES_R(p, '#5f6646') + p.base(R_BODY(262), pick(['#d06a3a', '#d99a2b', '#3e6b5a'], i)) + p.line('M58 160C88 166 112 166 142 160M59 190C88 196 112 196 141 190M60 220C88 226 112 226 140 220M61 248C88 254 112 254 139 248M100 112V266', pick(['#d06a3a', '#d99a2b', '#3e6b5a'], i), 1.3) + p.base('M86 104C88 96 112 96 114 104L114 114C110 110 90 110 86 114Z', dark(pick(['#d06a3a', '#d99a2b', '#3e6b5a'], i), 0.15)), bottom: (p) => BOTTOMS.cargosR(p, '#b49a6a'), shoes: (p, f) => SHOES.sneakers(p, f, '#7a5236', '#d99a2b', '#3a2620'), hat: 'cap', hatColor: '#3e6b5a', prop: 'coffee' }),
  },
  camping: {
    A: (i) => ({ top: (p) => TOPS.teeA(p, '#2a2d38') + p.base('M84 110C76 114 66 118 62 126C58 134 60 150 62 168L64 250L90 254L94 150C92 132 88 120 84 110Z M116 110C124 114 134 118 138 126C142 134 140 150 138 168L136 250L110 254L106 150C108 132 112 120 116 110Z', '#a33b2c', { pat: 'plaid' }) + SLEEVES_A(p, '#a33b2c', { pat: 'plaid' }), bottom: (p) => BOTTOMS.jeansA(p, '#2a2d38'), shoes: (p, f) => SHOES.sneakers(p, f, '#7a5236', '#d99a2b', '#3a2620'), hat: 'beanie', hatColor: pick(['#d99a2b', '#3e6b5a', '#a8553a'], i), prop: 'mug' }),
    R: (i) => {
      const body = pick(['#3e6b5a', '#4a5f8a', '#7a5236'], i)
      return { top: (p) => SLEEVES_R(p, body) + p.base(R_BODY(272), body) + p.base('M60 120C66 115 78 112 86 108C90 114 110 114 114 108C122 112 134 115 140 120C146 125 148 134 147 146L146.6 154C120 161 80 161 53.4 154L53 146C52 134 54 125 60 120Z', '#d9c7a5') + p.base('M53.4 154C80 161 120 161 146.6 154L146 162C120 169 80 169 54 162Z', '#d06a3a') + p.shade(R_BODY_SHADE, body) + p.base('M64 266C88 272 112 272 136 266L136.4 280C112 286 88 286 63.6 280Z', dark(body, 0.15)) + p.line('M100 112V186M112 176L128 172', body, 1.3) + p.base('M97.6 184H102.4V192H97.6Z', '#d9c7a5') + p.base('M82 100C88 95 112 95 118 100L118 116C112 111 88 111 82 116Z', dark(body, 0.15)) + p.line('M100 97V116', '#d9c7a5', 1), bottom: (p) => BOTTOMS.joggersR(p, '#3a3d44'), shoes: (p, f) => SHOES.sneakers(p, f, '#e6dccb', '#d06a3a', '#3a3540'), hat: 'beanie', hatColor: '#d06a3a', prop: 'mug' }
    },
  },
  snow: {
    A: (i) => ({ top: (p) => p.base('M82 110C70 114 60 120 56 132C52 150 54 180 56 210C52 260 50 320 52 382C80 390 120 390 148 382C150 320 148 260 144 210C146 180 148 150 144 132C140 120 130 114 118 110C110 118 90 118 82 110Z', pick(['#efe6d4', '#a8553a', '#3e6b5a'], i)) + p.shade('M56 210C52 260 50 320 52 382C58 384 64 385 70 386C66 330 64 270 66 214Z M144 210C148 260 150 320 148 382C142 384 136 385 130 386C134 330 136 270 134 214Z', pick(['#efe6d4', '#a8553a', '#3e6b5a'], i)) + p.line('M56 160C88 168 112 168 144 160M55 196C88 204 112 204 145 196M54 236C88 244 112 244 146 236M53 276C88 284 112 284 147 276M52 316C88 324 112 324 148 316M52 352C88 360 112 360 148 352M100 118V388', pick(['#efe6d4', '#a8553a', '#3e6b5a'], i), 1.3) + p.base(limb([[69, 128], [62, 165], [59, 205], [57, 236], [57, 252]], [30, 27, 24, 22, 20]), pick(['#efe6d4', '#a8553a', '#3e6b5a'], i)) + p.base(limb([[131, 128], [145, 158], [157, 188], [143, 205], [134, 212]], [30, 27, 24, 21, 19]), pick(['#efe6d4', '#a8553a', '#3e6b5a'], i)), bottom: (p) => BOTTOMS.jeansA(p, '#3a3a48'), shoes: (p, f) => SHOES.furBoots(p, f, '#8a5a3a'), scarf: '#a8553a', hat: 'pom', hatColor: '#a8553a', prop: 'phone' }),
    R: (i) => {
      const c = pick(['#2a3550', '#a8553a', '#3e6b5a'], i)
      return { top: (p) => SLEEVES_R(p, c) + p.base('M86 106C76 110 62 114 56 122C50 128 49 138 50 150L54 210C55 240 56 264 57 290C86 298 114 298 143 290C144 264 145 240 146 210L150 150C151 138 150 128 144 122C138 114 124 110 114 106C110 114 90 114 86 106Z', c) + p.shade('M54 210C55 240 56 264 57 290C62 291.5 67 292.6 72 293.4C68 266 66 238 64 212Z M146 210C145 240 144 264 143 290C138 291.5 133 292.6 128 293.4C132 266 134 238 136 212Z', c) + p.line('M52 160C86 168 114 168 148 160M53 196C86 204 114 204 147 196M54 232C86 240 114 240 146 232M56 266C86 274 114 274 144 266M100 112V296', c, 1.3) + p.base('M84 100C90 94 110 94 116 100L116 116C110 111 90 111 84 116Z', dark(c, 0.16)) + p.base(limb([[61, 126], [53, 165], [48, 205], [46, 238], [49, 258]], [32, 28, 26, 24, 22]), c) + p.base(limb([[139, 126], [147, 165], [152, 205], [155, 238], [152, 256]], [32, 28, 26, 24, 22]), c), bottom: (p) => BOTTOMS.joggersR(p, '#3a3d44'), shoes: (p, f) => SHOES.furBoots(p, f, '#8a5a3a'), scarf: '#d99a2b', hat: 'pom', hatColor: '#d99a2b', prop: 'mug' }
    },
  },
  party: {
    A: (i) => ({ top: (p) => TOPS.miniDressA(p, pick(['#d9a83a', '#7d2a35', '#3e6b5a'], i), { pat: i % 3 === 0 ? 'sequin' : undefined }), legs: true, shoes: (p, f) => SHOES.heels(p, f, '#2a1d18'), prop: 'popper', lips: '#a8455e', necklace: true }),
    R: (i) => ({ top: (p) => TOPS.shirtR(p, pick(['#7d2a35', '#2a3550', '#3e6b5a'], i), { pat: i % 3 === 0 ? 'knit' : undefined }) + NECKLACE(p, 'A'), bottom: (p) => BOTTOMS.trousersR(p, '#ece0c8', { pleats: true }), shoes: (p, f) => SHOES.sneakers(p, f, '#f7f3ea', '#f7f3ea', '#eadfca'), prop: 'popper' }),
  },
  nightlife: {
    A: () => ({ top: (p) => TOPS.tubeA(p, '#1d1a1f') + p.base('M78 212H122C126 238 132 260 137 282C112 289 88 289 63 282C68 260 74 238 78 212Z', '#1d1a1f') + p.hi('M84 222C82 240 79 258 76 276L81 277C84 258 86 240 88 222Z', '#1d1a1f') + TOPS.jacketA(p, '#3a3036', { inner: null }), legs: '#5a3f36', shoes: (p, f) => SHOES.platforms(p, f), bag: '#c9ccd2', lips: '#7a1f2c', necklace: true }),
    R: () => ({ top: (p) => TOPS.jacketR(p, '#2a2428', { inner: '#f3eee4' }) + NECKLACE(p, 'R'), bottom: (p) => BOTTOMS.trousersR(p, '#1d1a1f', { belt: '#3a3540' }), shoes: (p, f) => SHOES.sneakers(p, f, '#1d1a1f', '#3a3540', '#2a2428'), prop: 'phone' }),
  },
  food: {
    A: (i) => ({ top: (p) => TOPS.hoodieA(p, pick(['#c9b6e4', '#8fa68a', '#e39aa0'], i)), bottom: (p) => BOTTOMS.jeansA(p, pick(['#c9b6e4', '#8fa68a', '#e39aa0'], i)), shoes: (p, f) => SHOES.sneakers(p, f, '#f3eee4', '#c9b6e4'), prop: 'boba' }),
    R: (i) => ({ top: (p) => TOPS.boxyR(p, pick(['#c9b6e4', '#8fa68a', '#e6d3ad'], i), { longSleeves: true }) + p.base('M74 232H126L132 270H68Z', pick(['#c9b6e4', '#8fa68a', '#e6d3ad'], i)) + p.line('M74 232L70 256M126 232L130 256', pick(['#c9b6e4', '#8fa68a', '#e6d3ad'], i), 1.2) + p.base('M80 112C78 98 122 98 120 112C116 126 84 126 80 112Z', dark(pick(['#c9b6e4', '#8fa68a', '#e6d3ad'], i), 0.1)) + p.line('M95 120L94 150M105 120L106 150', '#f7f1e6', 1.6, { raw: true }), bottom: (p) => BOTTOMS.cargosR(p, '#8f8c93'), shoes: (p, f) => SHOES.sneakers(p, f, '#f3eee4', '#3e6b5a'), prop: 'boba', sling: '#2a1d18', boxy: true }),
  },
  roadtrip: {
    A: (i) => ({ top: (p) => TOPS.teeA(p, '#f7f1e6', { motif: '#a8553a' }), bottom: (p) => BOTTOMS.jeansA(p, '#8fa68a', { fade: true }), shoes: (p, f) => SHOES.sneakers(p, f, '#f3eee4', '#a8553a'), hat: 'bucket', hatColor: pick(['#d99a2b', '#3e6b5a', '#a8553a'], i), hatPat: 'check', glasses: 'sunnies', prop: 'keys', bag: '#d99a2b' }),
    R: (i) => ({ top: (p) => TOPS.jacketR(p, pick(['#4a5f8a', '#7a5236', '#3e6b5a'], i), { inner: '#f3eee4' }), bottom: (p) => BOTTOMS.trousersR(p, '#cdb994'), shoes: (p, f) => SHOES.sneakers(p, f, '#f3eee4', '#a8553a'), glasses: 'shades', prop: 'keys', hat: 'cap', hatColor: '#a8553a' }),
  },
}

// The person's own outfit, used in the editor, on profile chips and in the everyday scene.
function ownLook(a, frame) {
  const top = TOP_COLORS[a.topColor] ?? TOP_COLORS[0]
  const bottom = BOTTOM_COLORS[a.bottomColor] ?? BOTTOM_COLORS[0]
  const shoe = SHOE_COLORS[a.shoeColor] ?? SHOE_COLORS[0]
  const accent = shoe === '#f3eee4' ? '#a8553a' : '#f3eee4'
  const dress = a.top === 'dress'
  const look = { shoes: (p, f) => SHOES.sneakers(p, f, shoe, accent), prop: frame === 'A' ? 'phone' : 'coffee' }
  if (frame === 'A') {
    const tops = { tee: TOPS.teeA, hoodie: TOPS.hoodieA, shirt: TOPS.shirtA, jacket: TOPS.jacketA, dress: TOPS.dressA }
    look.top = (p) => (tops[a.top] ?? TOPS.teeA)(p, top)
    if (!dress) look.bottom = (p) => ({ pants: BOTTOMS.jeansA, shorts: BOTTOMS.shortsA, skirt: BOTTOMS.skirtA })[a.bottom]?.(p, bottom) ?? BOTTOMS.jeansA(p, bottom)
    look.legs = dress || a.bottom !== 'pants'
    look.bag = '#d99a2b'
    look.necklace = a.top === 'dress' || a.top === 'jacket'
  } else {
    const tops = { tee: TOPS.teeR, hoodie: TOPS.hoodieR, shirt: TOPS.shirtR, jacket: TOPS.jacketR, dress: TOPS.dressR }
    look.top = (p) => (tops[a.top] ?? TOPS.teeR)(p, top)
    if (!dress) look.bottom = (p) => ({ pants: BOTTOMS.trousersR, shorts: BOTTOMS.shortsR, skirt: BOTTOMS.skirtR })[a.bottom]?.(p, bottom) ?? BOTTOMS.trousersR(p, bottom)
    look.legs = dress || a.bottom !== 'pants'
    look.necklace = a.top === 'shirt'
  }
  return look
}

export const frameOf = (a) => (a.body === 'female' ? 'A' : 'R')

// ---------- assembly ----------
const cache = new Map()

/**
 * Markup for one person. `sceneId` other than everyday dresses them in that scene's look.
 * `index` varies the look's colours within a crew. Returns an SVG <g> string in the 200 x 520 box.
 */
export function figureMarkup(avatar, sceneId = 'everyday', index = 0, bust = false) {
  const a = withDefaults(avatar)
  const key = JSON.stringify([a, sceneId, index % 3, bust])
  const hit = cache.get(key)
  if (hit) return hit
  const frame = frameOf(a)
  const F = FRAMES[frame]
  const skin = SKIN[a.skin] ?? SKIN[3]
  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0]
  const sceneLook = LOOKS[sceneId]?.[frame]?.(index)
  const look = sceneLook ?? ownLook(a, frame)
  const P = { skin, hair, hairHi: light(hair, 0.28), band: '#a8553a', hat: look.hatColor ?? TOP_COLORS[(a.topColor + 4) % TOP_COLORS.length], hatPat: look.hatPat, phone: '#c6a4ee', accent: '#d06a3a' }
  const p = painter(P)
  const hairStyle = a.hair
  const hp = hairParts(hairStyle, p, P)
  const hatType = look.hat ?? (a.headwear === 'none' ? '' : a.headwear)
  const glasses = look.glasses ?? a.glasses
  const big = BIG_HAIR.has(hairStyle)

  const out = []
  // hair behind everything
  if (hp.back) out.push(shift(0, F.dy, hp.back))
  // arms (behind the torso)
  out.push(p.base(limb(...F.armL), 'skin') + p.base(limb(...F.armR), 'skin') + p.shade(limb(...F.armShade), 'skin'))
  // bare legs and shoes
  if (look.legs && !bust) {
    const legColour = typeof look.legs === 'string' ? look.legs : 'skin'
    out.push(F.legs.map((pts) => p.base(limb(pts, F.legW), legColour)).join(''))
  }
  if (!bust) out.push(look.shoes(p, frame))
  // torso skin
  out.push(p.base(F.torso, 'skin') + p.shade(F.torsoShade, 'skin') + p.line(F.torsoLines, 'skin', 1, { op: 0.55 }))
  if (look.necklace && frame === 'A') out.push(NECKLACE(p, 'A'))
  if (look.bottom && !bust) out.push(look.bottom(p))
  out.push(look.top(p))
  if (look.necklace && frame === 'R' && !sceneLook) out.push(NECKLACE(p, 'R'))
  if (look.scarf) out.push(SCARF(p, frame, look.scarf))
  if (look.bag && frame === 'A') out.push(BAG_A(p, look.bag))
  if (look.sling && frame === 'R') out.push(SLING_R(p, look.sling))
  // the free hand
  if (frame === 'A') out.push(at(128, 216, 52, p.base(HAND.hip, 'skin') + p.line(HAND.hipLines, 'skin', 0.9, { op: 0.7 })))
  else out.push(at(152, 268, -6, p.base(HAND.relaxed, 'skin') + p.line(HAND.relaxedLines, 'skin', 0.9, { op: 0.7 }), true))
  // prop in the other hand
  const prop = PROPS[look.prop] && !bust ? PROPS[look.prop](p, P, frame) : ''
  if (prop) out.push(look.prop === 'phone' ? prop : shift(F.anchor[0] - 50, F.anchor[1] - 271, prop))
  // head
  out.push(`<g class="head">${p.base(F.ears, 'skin')}${p.base(F.face, 'skin')}${p.shade(F.faceShade, 'skin')}${facialHair(a.facialHair, P, frame)}${faceFeatures(a, frame, P, look)}</g>`)
  out.push(shift(0, F.dy, hp.front))
  out.push(glassesFor(glasses, frame))
  if (frame === 'A' && !['short', 'buzz', 'bald'].includes(hairStyle)) out.push(`<g fill="none" stroke="#d99a2b" stroke-width="1.8"><circle cx="74" cy="80" r="5.5"/><circle cx="126" cy="80" r="5.5"/></g>`)
  if (hatType) out.push(shift(0, F.dy, hatFor(hatType, p, P, big)))

  const markup = `<g filter="url(#cx-grain)">${out.join('')}</g>`
  if (cache.size > 400) cache.clear()
  cache.set(key, markup)
  return markup
}

// Shared SVG definitions: one copy per document (see ArtDefs), and inlined into exported images.
export const DEFS = `
<filter id="cx-grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.03  0 0 0 0.5 -0.12" result="speck"/>
  <feComposite in="speck" in2="SourceAlpha" operator="in" result="s2"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="s2"/></feMerge>
</filter>
<pattern id="cx-dots" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.6" cy="1.6" r="0.75" fill="#2a1a10"/></pattern>
<pattern id="cx-paisley" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#3e6b5a"/><circle cx="2" cy="2" r="1" fill="#f1e6cf"/><path d="M5 5q2-1 2 1" stroke="#f1e6cf" stroke-width="0.7" fill="none"/></pattern>
<pattern id="cx-tropic" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#efe3c8"/><path d="M3 12C3 7 7 4 11 4C9 7 7 10 3 12Z" fill="#3e6b5a"/><path d="M10 15C11 12 14 10 16 10C15 13 13 15 10 15Z" fill="#6f8a6b"/><circle cx="13" cy="4" r="1.6" fill="#e88a3a"/></pattern>
<pattern id="cx-plaid" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#a33b2c"/><rect width="12" height="4" y="4" fill="#2a1d18" opacity="0.45"/><rect width="4" height="12" x="4" fill="#2a1d18" opacity="0.45"/><path d="M0 10h12M10 0v12" stroke="#e8c27a" stroke-width="0.6"/></pattern>
<pattern id="cx-sequin" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#d9a83a"/><circle cx="1.5" cy="1.5" r="1.2" fill="#f3d27a"/><circle cx="4" cy="4" r="1.1" fill="#b7861f"/></pattern>
<pattern id="cx-check" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#a8553a"/><rect width="4" height="4" fill="#f1e6cf"/><rect x="4" y="4" width="4" height="4" fill="#f1e6cf"/></pattern>
<pattern id="cx-knit" width="3" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="6" fill="#7d2a35"/><path d="M0.5 0v6" stroke="#6a222c" stroke-width="1"/><path d="M2 0v6" stroke="#8e3540" stroke-width="0.6"/></pattern>
`
