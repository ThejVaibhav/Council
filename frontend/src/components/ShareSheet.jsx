import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy, Download, Image as ImageIcon, Link2, Mail, MessageSquareText, Share2, Sparkles, X as Close } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COMPANIONS } from '../avatarOptions'
import { renderCard } from '../shareCard'
import { emailText, quickTake, storyText } from '../story'

const enc = encodeURIComponent

// Small brand-style glyphs for the share targets.
const Brand = {
  whatsapp: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.6a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.8Zm4.4-5.9c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.8 2.7 4.3 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1l-.5-.2Z" /></svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor" /></svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M21.4 3.6 2.9 10.8c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.6c.2.6.4.8.9.8s.6-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.5-1.5Zm-3.4 4-8 7.2-.3 3.3-1.5-4.8 9.4-6c.4-.3.8 0 .4.3Z" /></svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>
  ),
}

// WhatsApp-style formatting in the preview: *bold* becomes bold.
function Formatted({ text }) {
  return text.split('\n').map((line, i) => (
    <span key={i} className="share-line">
      {line.split(/(\*[^*\n]+\*)/g).map((part, j) => (part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <b key={j}>{part.slice(1, -1)}</b> : part))}
      {'\n'}
    </span>
  ))
}

const FORMATS = [
  { id: 'story', label: 'Story', hint: 'The whole debate, told like a story' },
  { id: 'quick', label: 'Quick take', hint: 'One line for X, SMS or a status' },
  { id: 'card', label: 'Card', hint: 'An image for Instagram and WhatsApp status' },
]

/**
 * Share a finished decision. The message is written from the transcript; the link opens a read-only recap.
 * people: [{ display_name, avatar }], route: { from, to, km: '275 km', time, modes }
 */
export default function ShareSheet({ open, onClose, plan, request, items, people, sceneId, route, getLink }) {
  const [format, setFormat] = useState('story')
  const [linkResult, setLinkResult] = useState(undefined) // undefined: not asked yet, null: none
  const askedLink = useRef(false)
  const [toast, setToast] = useState(null)
  const [cards, setCards] = useState({})
  const [cardSize, setCardSize] = useState('story')
  const panelRef = useRef(null)
  const names = people.map((p) => p.display_name).filter(Boolean)
  const namesKey = names.join('|')
  const link = linkResult ?? null
  const linkState = !getLink || linkResult === null ? 'none' : linkResult === undefined ? 'loading' : 'ready'

  useEffect(() => {
    if (!open || askedLink.current || !getLink) return
    askedLink.current = true
    getLink().then((l) => setLinkResult(l ?? null)).catch(() => setLinkResult(null))
  }, [open, getLink])

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => panelRef.current?.querySelector('button')?.focus(), 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const args = useMemo(() => ({ plan, request, items, route, link, people: names }), [plan, request, items, route, link, namesKey])
  const story = useMemo(() => storyText(args), [args])
  const plainStory = useMemo(() => storyText({ ...args, bold: (s) => s }), [args])
  const quick = useMemo(() => quickTake(args), [args])
  const mail = useMemo(() => emailText(args), [args])

  const cardKey = (size) => `${size}:${link ?? ''}`
  const card = { story: cards[cardKey('story')], post: cards[cardKey('post')] }
  const makeCard = async (size) => {
    if (cards[cardKey(size)]) return cards[cardKey(size)]
    // Draw the whole group, filling in stand-ins up to the headcount, as the app's crew does.
    const head = Math.min(4, Math.max(people.length, Number(request?.constraints?.headcount) || 1))
    const crew = [...people]
    for (let i = 0; crew.length < head; i++) crew.push({ avatar: COMPANIONS[i % COMPANIONS.length] })
    const c = await renderCard({ plan, request, items, people: crew, sceneId, route, link, format: size })
    setCards((x) => ({ ...x, [cardKey(size)]: c }))
    return c
  }
  useEffect(() => {
    if (open && format === 'card') makeCard(cardSize).catch(() => flash('Could not draw the card on this browser.'))
  }, [open, format, cardSize, link]) // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (text, msg = 'Copied. Paste it anywhere.') => {
    try {
      await navigator.clipboard.writeText(text)
      flash(msg)
    } catch {
      flash('Copying is blocked here. Select the text and copy it instead.')
    }
  }
  const textFor = () => (format === 'quick' ? quick : story)
  const openUrl = (url) => window.open(url, '_blank', 'noopener,noreferrer')
  const fileName = `council-${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`

  const download = (c) => {
    const a = document.createElement('a')
    a.href = c.url
    a.download = fileName
    a.click()
  }
  const shareImage = async (caption) => {
    const c = await makeCard(format === 'card' ? cardSize : 'story')
    const file = new File([c.blob], fileName, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: plan.title, text: caption })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    download(c)
    await copy(caption, 'Card saved and caption copied. Open Instagram, add it to your story and paste.')
  }

  const channels = [
    { id: 'whatsapp', label: 'WhatsApp', icon: Brand.whatsapp, run: () => (format === 'card' ? shareImage(quick) : openUrl(`https://wa.me/?text=${enc(textFor())}`)) },
    { id: 'instagram', label: 'Instagram', icon: Brand.instagram, run: () => shareImage(quick) },
    { id: 'messages', label: 'Messages', icon: <MessageSquareText size={21} />, run: () => { window.location.href = `sms:?&body=${enc(format === 'quick' ? quick : plainStory)}` } },
    { id: 'mail', label: 'Mail', icon: <Mail size={21} />, run: () => { window.location.href = `mailto:?subject=${enc(mail.subject)}&body=${enc(mail.body)}` } },
    { id: 'telegram', label: 'Telegram', icon: Brand.telegram, run: () => openUrl(`https://t.me/share/url?url=${enc(link ?? '')}&text=${enc((format === 'quick' ? quick : story).replace(link ?? '\u0000', '').trim())}`) },
    { id: 'x', label: 'X', icon: Brand.x, run: () => openUrl(`https://twitter.com/intent/tweet?text=${enc(quick)}`) },
    { id: 'copy', label: 'Copy text', icon: <Copy size={20} />, run: () => copy(format === 'card' ? quick : textFor()) },
    ...(typeof navigator !== 'undefined' && navigator.share ? [{ id: 'more', label: 'More', icon: <Share2 size={20} />, run: () => navigator.share({ title: plan.title, text: format === 'quick' ? quick : plainStory, ...(link ? { url: link } : {}) }).catch(() => {}) }] : []),
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            ref={panelRef}
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-grab" aria-hidden="true" />
            <header className="sheet-head">
              <div>
                <p className="eyebrow"><Sparkles size={13} /> Share the decision</p>
                <h2 id="share-title" className="display sheet-title">{plan.title}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                <Close size={18} />
              </button>
            </header>

            <div className="sheet-tabs" role="tablist" aria-label="Format">
              {FORMATS.map((f) => (
                <button key={f.id} type="button" role="tab" aria-selected={format === f.id} className={format === f.id ? 'is-on' : ''} onClick={() => setFormat(f.id)}>
                  {format === f.id && <motion.span layoutId="share-tab" className="seg-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="seg-label">{f.label}</span>
                </button>
              ))}
            </div>
            <p className="sheet-hint">{FORMATS.find((f) => f.id === format).hint}</p>

            <div className="sheet-preview">
              {format === 'card' ? (
                <div className="card-preview">
                  <div className="card-sizes" role="radiogroup" aria-label="Card size">
                    {[['story', 'Story 9:16'], ['post', 'Post 4:5']].map(([id, label]) => (
                      <button key={id} type="button" role="radio" aria-checked={cardSize === id} className={cardSize === id ? 'is-on' : ''} onClick={() => setCardSize(id)}>{label}</button>
                    ))}
                  </div>
                  <div className={`card-frame is-${cardSize}`}>
                    {card[cardSize] ? <img src={card[cardSize].url} alt={`Share card for ${plan.title}`} /> : <span className="card-wait"><ImageIcon size={20} /> Drawing your card…</span>}
                  </div>
                  {card[cardSize] && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => download(card[cardSize])}>
                      <Download size={14} /> Save image
                    </button>
                  )}
                </div>
              ) : (
                <div className="chat-preview">
                  <div className="share-bubble">
                    <Formatted text={format === 'quick' ? quick : story} />
                  </div>
                </div>
              )}
            </div>

            <div className="share-grid">
              {channels.map((c) => (
                <button key={c.id} type="button" className={`share-btn s-${c.id}`} onClick={() => Promise.resolve(c.run()).catch(() => flash('That app could not be opened from here.'))}>
                  <span className="share-ico">{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            <div className="sheet-foot">
              {linkState === 'loading' && <span><Link2 size={13} /> Making a recap link…</span>}
              {linkState === 'ready' && (
                <button type="button" className="link-chip" onClick={() => copy(link, 'Recap link copied.')}>
                  <Link2 size={13} /> <span>{link.replace(/^https?:\/\//, '')}</span> <Copy size={12} />
                </button>
              )}
              {linkState === 'none' && <span>Recap links work in the full app. The message still has the whole story.</span>}
              <span className="sheet-small">Anyone with the link can read the recap. Only people you invite can join the plan.</span>
            </div>

            <AnimatePresence>
              {toast && (
                <motion.div className="sheet-toast" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <Check size={14} /> {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
