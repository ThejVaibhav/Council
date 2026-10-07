import { useCallback, useRef, useState } from 'react'
import { SPECIALISTS } from '../agents'
import { DEMO, api } from '../api'

export { DEMO }

const initial = { status: 'idle', plan: null, request: null, items: [], pending: [], result: null, error: null }

// Applies one streamed event to the debate state. Shared by the live view and the read-only recap.
export function reduceEvent(s, type, data) {
  const drop = (pending, agent) => pending.filter((a) => a !== agent)
  switch (type) {
    case 'round_start':
      return { ...s, status: 'running', items: [...s.items, { kind: 'round', round: data.round }], pending: [...SPECIALISTS] }
    case 'turn':
      return { ...s, items: [...s.items, { kind: 'turn', ...data }], pending: drop(s.pending, data.agent) }
    case 'agent_error':
      return { ...s, items: [...s.items, { kind: 'missing', ...data }], pending: drop(s.pending, data.agent) }
    case 'moderator_start':
      return { ...s, status: 'moderating', pending: ['moderator'] }
    case 'final_plan':
      return { ...s, result: data, pending: [] }
    case 'error':
      return { ...s, status: 'error', error: data.error, pending: [] }
    case 'done':
      return { ...s, status: 'done', pending: [] }
    default:
      return s
  }
}

/** Debate state from a finished (or partly finished) recap, without streaming. */
export function stateFromRecap(rec) {
  let s = { ...initial, request: { brief: rec.brief, constraints: rec.constraints } }
  for (const ev of rec.events ?? []) s = reduceEvent(s, ev.type, ev)
  if (!['done', 'error'].includes(s.status)) s = { ...s, status: s.result ? 'done' : 'partial', pending: [] }
  return s
}

// Follows one shared plan: replays what already happened, then the live debate.
// status: idle | loading | running | moderating | done | error
export function useDebate() {
  const [state, setState] = useState(initial)
  const abortRef = useRef(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initial)
  }, [])

  const open = useCallback(async (plan) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const request = { brief: plan.brief, constraints: plan.constraints }
    setState({ ...initial, status: plan.status === 'complete' ? 'loading' : 'running', plan, request })
    const update = (fn) => !controller.signal.aborted && setState(fn)
    let finished = false
    try {
      await api.streamPlan(
        plan.id,
        (type, data) => {
          if (type === 'error' || type === 'done') finished = true
          update((s) => reduceEvent(s, type, data))
        },
        controller.signal,
      )
      if (!finished) update((s) => (s.status === 'loading' || s.status === 'running' ? { ...s, status: 'error', error: 'This debate was interrupted before it finished.' } : s))
    } catch (err) {
      if (err.name === 'AbortError') return
      update((s) => ({ ...s, status: 'error', error: err.message, pending: [] }))
    }
  }, [])

  const start = useCallback(
    async (request) => {
      setState({ ...initial, status: 'running', request })
      try {
        const plan = await api.createPlan(request)
        await open(plan)
        return plan
      } catch (err) {
        setState((s) => ({ ...s, status: 'error', error: err.message }))
        return null
      }
    },
    [open],
  )

  const patchPlan = useCallback((patch) => setState((s) => (s.plan ? { ...s, plan: { ...s.plan, ...patch } } : s)), [])

  return { ...state, start, open, reset, patchPlan }
}
