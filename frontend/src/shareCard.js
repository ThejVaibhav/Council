// Draws the shareable recap card: the crew in their scene outfits, the three pitches, the verdict, the route
// and who won what. Story (1080 x 1920) for Instagram and WhatsApp status, post (1080 x 1350) for feeds.
import { AGENTS, formatCost } from './agents'
import { withDefaults } from './avatarOptions'
import { DEFS, figureMarkup } from './components/art/figure'
import { duels, firstLine, pitches } from './story'

const THEMES = {
  everyday: { bg: '#f3e9d6', sun: '#e8b45a', ground: '#d9c7a5', ink: '#2a1d17', accent: '#a8553a' },
  romance: { bg: '#ecc9c6', sun: '#f6e2bd', ground: '#c99393', ink: '#3a1420', accent: '#8e2b35' },
  beach: { bg: '#f6e7c8', sun: '#e88a3a', ground: '#ead6a8', ink: '#123c46', accent: '#2f7f86' },
  mountains: { bg: '#e6ecdf', sun: '#f6e2bd', ground: '#b9a77d', ink: '#1d3324', accent: '#d06a3a' },
  camping: { bg: '#2c3644', sun: '#f6e2bd', ground: '#3a4636', ink: '#f3ead8', accent: '#e2b43a' },
  snow: { bg: '#e2ecf1', sun: '#ffffff', ground: '#f7fbfd', ink: '#1b2b44', accent: '#a8553a' },
  party: { bg: '#f6e2bd', sun: '#e39aa0', ground: '#e2c995', ink: '#2b1a3d', accent: '#7d2a35' },
  nightlife: { bg: '#5d4673', sun: '#d96aa0', ground: '#4a3858', ink: '#f6f0ff', accent: '#e8b45a' },
  food: { bg: '#f4dccb', sun: '#e8b45a', ground: '#d9b49a', ink: '#3a1f14', accent: '#a8553a' },
  roadtrip: { bg: '#f3e1c0', sun: '#e8b45a', ground: '#c9b48d', ink: '#3b2414', accent: '#3e6b5a' },
}
const AGENT_COLOR = { budget: '#3e8e6e', logistics: '#4a6fb0', vibe: '#c25a8a', moderator: '#c99a1f' }

const SERIF = '"Instrument Serif", Georgia, serif'
const SANS = '"Inter Tight Variable", "Inter Tight", system-ui, sans-serif'

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth) line = test
    else {
      if (line) lines.push(line)
      line = w
      if (lines.length === maxLines) break
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1]
    while (ctx.measureText(`${last}…`).width > maxWidth && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '))
    lines[maxLines - 1] = `${last.replace(/[,.;:]$/, '')}…`
  }
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadSvg(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not draw the characters'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

// The crew as one SVG image, in the scene's outfits.
function crewSvg(avatars, sceneId) {
  const list = avatars.slice(0, 4).map((a) => withDefaults(a))
  const gap = 120
  const width = 200 + gap * (list.length - 1)
  const figs = list.map((a, i) => `<g transform="translate(${i * gap} 0)">${figureMarkup(a, sceneId, i)}</g>`).join('')
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -30 ${width} 560" width="${width * 2}" height="1120"><defs>${DEFS}</defs><ellipse cx="${width / 2}" cy="514" rx="${width / 2 - 10}" ry="12" fill="#000" opacity="0.14"/>${figs}</svg>`, ratio: width / 560 }
}

function grain(ctx, w, h, ink) {
  // A light speckle so the card feels printed rather than rendered.
  const n = Math.round((w * h) / 900)
  ctx.save()
  ctx.fillStyle = ink
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = Math.random() * 0.07
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6)
  }
  ctx.restore()
}

/**
 * Render the card. Returns { blob, url, width, height }.
 * people: [{ display_name, avatar }]
 */
export async function renderCard(args) {
  try {
    return await draw(args)
  } catch {
    // Some browsers refuse to export a canvas that has had an SVG drawn on it; retry without the characters.
    return draw({ ...args, skipArt: true })
  }
}

async function draw({ plan, request, items = [], people = [], sceneId = 'everyday', route, link, format = 'story', skipArt = false }) {
  const story = format === 'story'
  const W = 1080
  const H = story ? 1920 : 1350
  const t = THEMES[sceneId] ?? THEMES.everyday
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  await Promise.all([document.fonts?.load(`96px ${SERIF}`), document.fonts?.load(`600 32px ${SANS}`), document.fonts?.load(`400 32px ${SANS}`)].filter(Boolean)).catch(() => {})
  const pad = 84
  const inner = W - pad * 2

  // ---- measure every block first, then give the crew whatever room is left ----
  const titleSize = story ? 112 : 92
  ctx.font = `${titleSize}px ${SERIF}`
  const titleLines = wrap(ctx, plan.title, inner, 3)
  const opening = story ? pitches(items, 1) : []
  const sumSize = story ? 38 : 33
  const sumLead = story ? 52 : 45
  ctx.font = `400 ${sumSize}px ${SANS}`
  let summary = wrap(ctx, plan.summary, inner - 80, story ? 5 : 3)
  const chips = []
  if (plan.estimated_cost != null) chips.push(`${formatCost(plan.estimated_cost)}${Number(request?.constraints?.headcount) > 1 ? ` for ${request.constraints.headcount}` : ''}`)
  if (route?.from && route?.to) chips.push(`${route.from} → ${route.to}${route.km ? ` · ${route.km}` : ''}`)
  if (route?.time || route?.modes) chips.push([route.modes, route.time && `~${route.time}`].filter(Boolean).join(' · '))
  else if (request?.constraints?.dates) chips.push(request.constraints.dates)
  ctx.font = `600 28px ${SANS}`
  const chipRows = []
  let row = []
  let rowW = 0
  for (const c of chips) {
    const text = wrap(ctx, c, inner - 60, 1)[0]
    const w = ctx.measureText(text).width + 52
    if (row.length && rowW + w > inner) {
      chipRows.push(row)
      row = []
      rowW = 0
    }
    row.push({ text, w })
    rowW += w + 14
  }
  if (row.length) chipRows.push(row)
  const ds = duels(plan).filter((d) => d.winner).slice(0, 2)

  const KICKER = 120
  const titleH = titleLines.length * titleSize
  const namesH = people.length ? 56 : 0
  const pitchH = opening.length ? 30 + opening.length * 120 : 0
  const boxH = () => 96 + summary.length * sumLead
  const chipsH = chipRows.length * 74
  const stampsH = ds.length ? 96 : 0
  const FOOT = 150
  const fixed = () => KICKER + 30 + titleH + 26 + namesH + pitchH + 26 + boxH() + 28 + chipsH + 12 + stampsH + FOOT
  let crewH = H - fixed()
  const keep = story ? 4 : 3
  if (crewH < (story ? 420 : 300) && summary.length > keep) {
    summary = summary.slice(0, keep)
    summary[keep - 1] = summary[keep - 1].replace(/[,.;:]?$/, '…')
    crewH = H - fixed()
  }
  crewH = Math.max(story ? 340 : 240, Math.min(story ? 660 : 420, crewH))

  // ---- background: paper and a low sun ----
  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = t.sun
  ctx.globalAlpha = 0.7
  ctx.beginPath()
  ctx.arc(W - 170, KICKER + titleH + crewH * 0.45, Math.min(230, crewH * 0.42), 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // kicker and title
  let y = KICKER
  ctx.fillStyle = t.accent
  ctx.font = `700 30px ${SANS}`
  ctx.letterSpacing = '6px'
  ctx.fillText('THE COUNCIL HAS SPOKEN', pad, y)
  ctx.letterSpacing = '0px'
  y += 30
  ctx.fillStyle = t.ink
  ctx.font = `${titleSize}px ${SERIF}`
  for (const line of titleLines) {
    y += titleSize
    ctx.fillText(line, pad, y)
  }
  y += 26

  // the crew, standing on a strip of ground
  const avatars = people.map((p) => p.avatar).filter(Boolean)
  const groundY = y + crewH
  ctx.fillStyle = t.ground
  ctx.fillRect(0, groundY - 34, W, 62)
  if (avatars.length && !skipArt) {
    try {
      const { svg, ratio } = crewSvg(avatars, sceneId)
      const img = await loadSvg(svg)
      let h = crewH
      let w = h * ratio
      if (w > inner) {
        w = inner
        h = w / ratio
      }
      ctx.drawImage(img, (W - w) / 2, groundY - h + 6, w, h)
    } catch {
      // drawn without characters
    }
  }
  y = groundY + 28
  if (namesH) {
    const names = people.map((p) => p.display_name).filter(Boolean)
    const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0]
    if (who) {
      ctx.fillStyle = t.ink
      ctx.globalAlpha = 0.78
      ctx.font = `500 30px ${SANS}`
      const text = `${who} asked the council`
      ctx.fillText(text, (W - ctx.measureText(text).width) / 2, y + 36)
      ctx.globalAlpha = 1
    }
    y += namesH
  }

  // the opening pitches
  if (opening.length) {
    y += 30
    for (const p of opening) {
      const h = 104
      ctx.fillStyle = 'rgba(255,252,246,0.86)'
      roundRect(ctx, pad, y, inner, h, 26)
      ctx.fill()
      ctx.fillStyle = AGENT_COLOR[p.agent]
      ctx.beginPath()
      ctx.arc(pad + 50, y + h / 2, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `700 26px ${SANS}`
      const ini = AGENTS[p.agent].initial
      ctx.fillText(ini, pad + 50 - ctx.measureText(ini).width / 2, y + h / 2 + 9)
      ctx.fillStyle = '#2a1d17'
      ctx.font = `700 28px ${SANS}`
      ctx.fillText(`${AGENTS[p.agent].name} pitched`, pad + 96, y + 42)
      const cost = p.cost != null ? formatCost(p.cost) : ''
      ctx.font = `600 28px ${SANS}`
      if (cost) {
        ctx.fillStyle = AGENT_COLOR[p.agent]
        ctx.fillText(cost, W - pad - 30 - ctx.measureText(cost).width, y + 42)
      }
      ctx.fillStyle = '#4a3a30'
      ctx.font = `400 27px ${SANS}`
      ctx.fillText(wrap(ctx, p.title, inner - 140, 1)[0] ?? '', pad + 96, y + 80)
      y += h + 16
    }
  }

  // the call
  y += 26 - (opening.length ? 16 : 0)
  ctx.fillStyle = '#fffaf2'
  roundRect(ctx, pad, y, inner, boxH(), 34)
  ctx.fill()
  ctx.strokeStyle = t.accent
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.fillStyle = t.accent
  ctx.font = `700 26px ${SANS}`
  ctx.letterSpacing = '4px'
  ctx.fillText('THE CALL', pad + 40, y + 58)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = '#2a1d17'
  ctx.font = `400 ${sumSize}px ${SANS}`
  summary.forEach((line, i) => ctx.fillText(line, pad + 40, y + 106 + i * sumLead))
  y += boxH() + 28

  // facts
  ctx.font = `600 28px ${SANS}`
  for (const r of chipRows) {
    let x = pad
    for (const c of r) {
      ctx.fillStyle = t.ink
      ctx.globalAlpha = 0.9
      roundRect(ctx, x, y, c.w, 60, 30)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = t.bg
      ctx.fillText(c.text, x + 26, y + 40)
      x += c.w + 14
    }
    y += 74
  }
  y += 12

  // who won what, as rubber stamps
  ds.forEach((d, i) => {
    const text = `${AGENTS[d.winner].name.toUpperCase()}${d.loser ? ` BEAT ${AGENTS[d.loser].name.toUpperCase()}` : ' WON'}`
    ctx.save()
    ctx.font = `800 28px ${SANS}`
    ctx.letterSpacing = '3px'
    const w = ctx.measureText(text).width + 56
    const x = i === 0 ? pad : W - pad - w
    ctx.translate(x + w / 2, y + 40)
    ctx.rotate(((i ? 3 : -3) * Math.PI) / 180)
    ctx.strokeStyle = AGENT_COLOR[d.winner]
    ctx.lineWidth = 5
    roundRect(ctx, -w / 2, -32, w, 64, 14)
    ctx.stroke()
    ctx.fillStyle = AGENT_COLOR[d.winner]
    ctx.fillText(text, -w / 2 + 28, 10)
    ctx.restore()
  })

  // footer
  ctx.fillStyle = t.ink
  ctx.globalAlpha = 0.85
  ctx.font = `400 50px ${SERIF}`
  ctx.fillText('Council', pad, H - 58)
  const brandW = ctx.measureText('Council').width
  ctx.globalAlpha = 0.65
  ctx.font = `500 26px ${SANS}`
  const tag = link ? link.replace(/^https?:\/\//, '') : 'three agents argued, one plan won'
  ctx.fillText(firstLine(tag, 60), pad + brandW + 24, H - 66)
  ctx.globalAlpha = 1
  grain(ctx, W, H, t.ink)

  const blob = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('empty'))), 'image/png')
    } catch (e) {
      reject(e)
    }
  })
  return { blob, url: URL.createObjectURL(blob), width: W, height: H }
}
