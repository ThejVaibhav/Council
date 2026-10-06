import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import Crew from './art/Crew'
import { SKIN } from './art/people'

const LOOKS = [
  { id: 'female', label: 'Woman' },
  { id: 'male', label: 'Man' },
  { id: 'neutral', label: 'Prefer not to say' },
]

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
}

export default function Onboarding({ initial, onDone, onCancel }) {
  const [step, setStep] = useState(initial ? 1 : 0)
  const [name, setName] = useState(initial?.name ?? '')
  const [look, setLook] = useState(initial?.look ?? 'female')
  const [skin, setSkin] = useState(initial?.skin ?? 1)
  const profile = { name: name.trim(), look, skin }
  const nameOk = name.trim().length >= 1

  return (
    <motion.main className="onboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="onboard-card glass">
        <div className="onboard-art">
          <Crew count={1} profile={profile} sceneId="everyday" />
          <span className="onboard-hello">{name.trim() ? `Hi, ${name.trim()}` : 'Hi there'}</span>
        </div>

        <div className="onboard-form">
          <div className="steps-dots" aria-hidden="true">
            <span className={step === 0 ? 'on' : ''} />
            <span className={step === 1 ? 'on' : ''} />
          </div>
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.form key="name" {...slide} onSubmit={(e) => { e.preventDefault(); if (nameOk) setStep(1) }}>
                <p className="eyebrow">Welcome to Council</p>
                <h1 className="display">Plans, argued out by three AI agents, decided by a fourth.</h1>
                <label className="field-label" htmlFor="name">What should the council call you?</label>
                <input id="name" className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" autoFocus maxLength={40} />
                <div className="onboard-actions">
                  <button type="submit" className="btn btn-accent" disabled={!nameOk}>Continue <ArrowRight size={16} /></button>
                </div>
              </motion.form>
            ) : (
              <motion.div key="look" {...slide}>
                <p className="eyebrow">Your character</p>
                <h1 className="display">Which one is you?</h1>
                <p className="hint">This is how you appear in every trip, from a solo walk to a group of twenty.</p>
                <div className="look-options" role="radiogroup" aria-label="Character">
                  {LOOKS.map((l) => (
                    <button type="button" key={l.id} role="radio" aria-checked={look === l.id} className={`look-option ${look === l.id ? 'is-on' : ''}`} onClick={() => setLook(l.id)}>
                      <Crew count={1} profile={{ look: l.id, skin }} sceneId="everyday" size="xs" />
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
                <span className="field-label">Skin tone</span>
                <div className="swatches" role="radiogroup" aria-label="Skin tone">
                  {SKIN.map((c, i) => (
                    <button type="button" key={c} role="radio" aria-checked={skin === i} aria-label={`Tone ${i + 1}`} className={`swatch ${skin === i ? 'is-on' : ''}`} style={{ background: c }} onClick={() => setSkin(i)} />
                  ))}
                </div>
                <div className="onboard-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => (initial && onCancel ? onCancel() : setStep(0))}>
                    <ArrowLeft size={16} /> {initial && onCancel ? 'Cancel' : 'Back'}
                  </button>
                  {initial && (
                    <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>Change name</button>
                  )}
                  <button type="button" className="btn btn-accent" disabled={!nameOk} onClick={() => onDone(profile)}>
                    {initial ? 'Save' : 'Start planning'} <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="onboard-note">Saved on this device only. No account needed.</p>
    </motion.main>
  )
}
