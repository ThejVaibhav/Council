import { useCallback, useRef, useState } from 'react'
import { SPECIALISTS } from '../agents'
import { DEMO, api } from '../api'

export { DEMO }

const initial = { status: 'idle', plan: null, request: null, items: [], pending: [], result: null, error: null }

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
    const drop = (pending, agent) => pending.filter((a) => a !== agent)
    let finished = false
    try {
      await api.streamPlan(
        plan.id,
        (type, data) => {
          switch (type) {
            case 'round_start':
              update((s) => ({ ...s, status: 'running', items: [...s.items, { kind: 'round', round: data.round }], pending: [...SPECIALISTS] }))
              break
            case 'turn':
              update((s) => ({ ...s, items: [...s.items, { kind: 'turn', ...data }], pending: drop(s.pending, data.agent) }))
              break
            case 'agent_error':
              update((s) => ({ ...s, items: [...s.items, { kind: 'missing', ...data }], pending: drop(s.pending, data.agent) }))
              break
            case 'moderator_start':
              update((s) => ({ ...s, status: 'moderating', pending: ['moderator'] }))
              break
            case 'final_plan':
              update((s) => ({ ...s, result: data, pending: [] }))
              break
            case 'error':
              finished = true
              update((s) => ({ ...s, status: 'error', error: data.error, pending: [] }))
              break
            case 'done':
              finished = true
              update((s) => ({ ...s, status: 'done', pending: [] }))
              break
          }
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
