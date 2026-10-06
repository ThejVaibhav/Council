import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { BOTTOM_COLORS, HAIR_COLORS, LABELS, OPTIONS, PET_BREEDS, SHOE_COLORS, SKIN, TOP_COLORS, presetFor, shuffleAvatar, withDefaults } from '../avatarOptions'
import { SCENES } from '../scenes'
import Crew, { Person, Pet, Portrait } from './art/Crew'

const TABS = [
  { id: 'body', label: 'Body' },
  { id: 'hair', label: 'Hair' },
  { id: 'face', label: 'Face' },
  { id: 'outfit', label: 'Outfit' },
  { id: 'extras', label: 'Extras' },
  { id: 'pet', label: 'Pet' },
]

function FullBody({ avatar, size = 84 }) {
  return (
    <svg viewBox="12 0 76 200" width={size * 0.38} height={size} aria-hidden="true">
      <Person avatar={avatar} scene={SCENES.everyday} own pose="stand" />
    </svg>
  )
}

function Tiles({ label, options, value, render, onPick, wide }) {
  return (
    <div className="ed-group">
      <span className="field-label">{label}</span>
      <div className={`ed-tiles ${wide ? 'ed-tiles-wide' : ''}`} role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const id = typeof opt === 'string' ? opt : opt.id
          const text = typeof opt === 'string' ? LABELS[opt] ?? opt : opt.label
          return (
            <button type="button" key={id} role="radio" aria-checked={value === id} className={`ed-tile ${value === id ? 'is-on' : ''}`} onClick={() => onPick(id)}>
              {render(id)}
              <span>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Swatches({ label, colors, value, onPick }) {
  return (
    <div className="ed-group">
      <span className="field-label">{label}</span>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {colors.map((c, i) => (
          <button type="button" key={c} role="radio" aria-checked={value === i} aria-label={`${label} ${i + 1}`} className={`swatch ${value === i ? 'is-on' : ''}`} style={{ background: c }} onClick={() => onPick(i)} />
        ))}
      </div>
    </div>
  )
}

function PetArt({ pet, size = 64 }) {
  return (
    <svg viewBox="-4 -82 104 86" width={size} height={size * 0.82} aria-hidden="true">
      <Pet pet={pet} />
    </svg>
  )
}

export default function CharacterEditor({ user, mode = 'create', onSave, onCancel, busy, error }) {
  const [a, setA] = useState(() => withDefaults(user?.avatar))
  const [name, setName] = useState(user?.display_name ?? '')
  const [tab, setTab] = useState('body')
  const set = (patch) => setA((x) => ({ ...x, ...patch }))
  const setPet = (patch) => setA((x) => ({ ...x, pet: { ...x.pet, ...patch } }))
  const preview = (patch) => ({ ...a, ...patch })

  return (
    <motion.main className="editor" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="editor-card glass">
        <div className="editor-stage">
          <Crew count={1} me={a} sceneId="everyday" label="Your character" />
          <label className="sr-only" htmlFor="display-name">Display name</label>
          <input id="display-name" className="name-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Your name" />
          {a.pet.kind !== 'none' && <span className="pet-caption">{a.pet.name || 'Your pet'} · {a.pet.breed}</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setA((x) => shuffleAvatar(x))}>
            <Shuffle size={14} /> Shuffle
          </button>
        </div>

        <div className="editor-panel">
          <p className="eyebrow">{mode === 'create' ? 'Step 2 of 2' : 'Your character'}</p>
          <h1 className="display editor-title">{mode === 'create' ? 'Make yourself.' : 'Edit your character'}</h1>
          <div className="ed-tabs" role="tablist">
            {TABS.map((t) => (
              <button type="button" key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
                {tab === t.id && <motion.span layoutId="ed-tab" className="seg-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="seg-label">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="ed-body">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
                {tab === 'body' && (
                  <>
                    <Tiles label="Body" options={OPTIONS.body} value={a.body} render={(id) => <FullBody avatar={a.body === id ? a : presetFor(id, a)} />} onPick={(id) => setA((x) => (x.body === id ? x : presetFor(id, x)))} />
                    <Swatches label="Skin tone" colors={SKIN} value={a.skin} onPick={(skin) => set({ skin })} />
                  </>
                )}
                {tab === 'hair' && (
                  <>
                    <Tiles label="Style" options={OPTIONS.hair} value={a.hair} render={(id) => <Portrait avatar={preview({ hair: id, headwear: 'none' })} size={52} />} onPick={(hair) => set({ hair })} />
                    <Swatches label="Colour" colors={HAIR_COLORS} value={a.hairColor} onPick={(hairColor) => set({ hairColor })} />
                  </>
                )}
                {tab === 'face' && (
                  <>
                    <Tiles label="Eyes" options={OPTIONS.eyes} value={a.eyes} render={(id) => <Portrait avatar={preview({ eyes: id, glasses: 'none' })} size={52} />} onPick={(eyes) => set({ eyes })} />
                    <Tiles label="Brows" options={OPTIONS.brows} value={a.brows} render={(id) => <Portrait avatar={preview({ brows: id })} size={52} />} onPick={(brows) => set({ brows })} />
                    <Tiles label="Facial hair" options={OPTIONS.facialHair} value={a.facialHair} render={(id) => <Portrait avatar={preview({ facialHair: id })} size={52} />} onPick={(facialHair) => set({ facialHair })} />
                  </>
                )}
                {tab === 'outfit' && (
                  <>
                    <Tiles label="Top" options={OPTIONS.top} value={a.top} render={(id) => <FullBody avatar={preview({ top: id })} />} onPick={(top) => set({ top })} />
                    <Swatches label="Top colour" colors={TOP_COLORS} value={a.topColor} onPick={(topColor) => set({ topColor })} />
                    {a.top !== 'dress' && (
                      <>
                        <Tiles label="Bottoms" options={OPTIONS.bottom} value={a.bottom} render={(id) => <FullBody avatar={preview({ bottom: id })} />} onPick={(bottom) => set({ bottom })} />
                        <Swatches label="Bottoms colour" colors={BOTTOM_COLORS} value={a.bottomColor} onPick={(bottomColor) => set({ bottomColor })} />
                      </>
                    )}
                    <Swatches label="Shoes" colors={SHOE_COLORS} value={a.shoeColor} onPick={(shoeColor) => set({ shoeColor })} />
                  </>
                )}
                {tab === 'extras' && (
                  <>
                    <Tiles label="Glasses" options={OPTIONS.glasses} value={a.glasses} render={(id) => <Portrait avatar={preview({ glasses: id })} size={52} />} onPick={(glasses) => set({ glasses })} />
                    <Tiles label="Headwear" options={OPTIONS.headwear} value={a.headwear} render={(id) => <Portrait avatar={preview({ headwear: id })} size={52} />} onPick={(headwear) => set({ headwear })} />
                  </>
                )}
                {tab === 'pet' && (
                  <>
                    <Tiles
                      label="Travel buddy"
                      options={[{ id: 'none', label: 'No pet' }, { id: 'dog', label: 'Dog' }, { id: 'cat', label: 'Cat' }, { id: 'rabbit', label: 'Rabbit' }]}
                      value={a.pet.kind}
                      render={(id) => (id === 'none' ? <span className="ed-none">—</span> : <PetArt pet={{ kind: id, breed: a.pet.kind === id ? a.pet.breed : PET_BREEDS[id][0] }} />)}
                      onPick={(kind) => setPet({ kind, breed: kind === 'none' ? '' : a.pet.kind === kind ? a.pet.breed : PET_BREEDS[kind][0] })}
                    />
                    {a.pet.kind !== 'none' && (
                      <>
                        <Tiles label="Breed" wide options={PET_BREEDS[a.pet.kind]} value={a.pet.breed} render={(id) => <PetArt pet={{ kind: a.pet.kind, breed: id }} size={56} />} onPick={(breed) => setPet({ breed })} />
                        <label className="field-label" htmlFor="pet-name">Name</label>
                        <input id="pet-name" className="text-input" value={a.pet.name} maxLength={20} onChange={(e) => setPet({ name: e.target.value })} placeholder="What do you call them?" />
                      </>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="editor-actions">
            {onCancel && (
              <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            )}
            <button type="button" className="btn btn-accent" disabled={busy || !name.trim()} onClick={() => onSave({ display_name: name.trim(), avatar: a })}>
              {mode === 'create' ? 'Start planning' : 'Save'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <p className="onboard-note">Your character is saved to your account, so it looks the same on every device and to your friends.</p>
    </motion.main>
  )
}
