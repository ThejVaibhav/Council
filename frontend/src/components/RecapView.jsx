import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ROUND_LABEL } from '../agents'
import { api } from '../api'
import { stateFromRecap } from '../hooks/useDebate'
import Crew from './art/Crew'
import { RoundGroup, SystemLine, UserMessage } from './Messages'
import { roundsOf } from '../council'
import Verdict from './Verdict'

const dateOf = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

/** A read-only replay of a shared decision. Opens from a recap link, no account needed. */
export default function RecapView({ code, onScene, onStart, signedIn }) {
  const [rec, setRec] = useState(null)
  const [error, setError] = useState(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    let live = true
    api.recap(code).then(
      (r) => {
        if (!live) return
        setRec(r)
        onScene?.(r.scene || 'everyday')
      },
      (e) => live && setError(e.message),
    )
    return () => {
      live = false
    }
  }, [code, onScene])

  if (error)
    return (
      <motion.main className="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="error-card glass" role="alert">
          <strong>This recap isn't available.</strong>
          <p>{error} Ask whoever shared it to send the link again.</p>
          <button type="button" className="btn btn-accent btn-sm" onClick={onStart}>
            Plan something with Council <ArrowRight size={14} />
          </button>
        </div>
      </motion.main>
    )
  if (!rec)
    return (
      <main className="recap">
        <div className="recap-loading glass" aria-busy="true"><span className="live-dot" /> Opening the recap…</div>
      </main>
    )

  const state = stateFromRecap(rec)
  const owner = rec.members.find((m) => m.role === 'owner') ?? rec.members[0]
  const others = rec.members.filter((m) => m !== owner)
  const names = rec.members.map((m) => m.display_name)
  const headcount = rec.constraints?.headcount ?? rec.members.length

  return (
    <motion.main className="recap debate" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <section className="recap-hero glass">
        <div className="recap-copy">
          <p className="eyebrow"><Sparkles size={13} /> A Council recap · {dateOf(rec.created_at)}</p>
          <h1 className="display recap-title">{state.result?.title ?? rec.title ?? 'A plan in the making'}</h1>
          <p className="recap-sub">
            {names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]} asked the council. Budget, Logistics and Vibe argued it out over two rounds, then the Moderator made the call.
          </p>
        </div>
        <div className="recap-art">
          <Crew count={headcount} me={owner?.avatar} friends={others.map((m) => m.avatar)} sceneId={rec.scene || 'everyday'} size="xs" />
        </div>
      </section>

      <div className="thread">
        {state.request && <UserMessage request={state.request} author={owner?.display_name} />}
        {roundsOf(state.items).map((g) => (
          <RoundGroup key={`${g.round}-${Boolean(state.result)}`} label={ROUND_LABEL[g.round]} items={g.items} collapsible={Boolean(state.result)} />
        ))}
        {state.status === 'partial' && <SystemLine>The council was still debating when this was shared</SystemLine>}
        {state.result && (
          <Verdict
            plan={state.result}
            brief={rec.brief}
            constraints={rec.constraints}
            items={state.items}
            people={rec.members}
            sceneId={rec.scene || 'everyday'}
            getLink={async () => window.location.href}
            sharing={sharing}
            onShare={() => setSharing(true)}
            onCloseShare={() => setSharing(false)}
          />
        )}
      </div>

      <div className="action-bar">
        <div className="action-inner glass">
          <span className="action-wait">Want a council for your own plans?</span>
          <button type="button" className="btn btn-accent" onClick={onStart}>
            {signedIn ? 'Back to my plans' : 'Try Council'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.main>
  )
}
