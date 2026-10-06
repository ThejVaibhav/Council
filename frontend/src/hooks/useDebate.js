import { useCallback, useRef, useState } from 'react'
import { SPECIALISTS } from '../agents'
import { simulateDebate } from '../demo'
import { streamDebate } from '../sse'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
export const DEMO = import.meta.env.VITE_DEMO === '1'
const run = DEMO ? simulateDebate : streamDebate

const initial = { status: 'idle', request: null, items: [], pending: [], plan: null, error: null }

// status: idle | running | moderating | done | error
export function useDebate() {
  const [state, setState] = useState(initial)
  const abortRef = useRef(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initial)
  }, [])

  const start = useCallback(async (request) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ ...initial, status: 'running', request })

    const update = (fn) => {
      if (!controller.signal.aborted) setState(fn)
    }
    const drop = (pending, agent) => pending.filter((a) => a !== agent)
    let finished = false

    try {
      await run(
        `${API_BASE}/sessions/stream`,
        { brief: request.brief, constraints: request.constraints },
        (type, data) => {
          switch (type) {
            case 'round_start':
              update((s) => ({ ...s, items: [...s.items, { kind: 'round', round: data.round }], pending: [...SPECIALISTS] }))
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
              update((s) => ({ ...s, plan: data, pending: [] }))
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
      if (!finished) throw new Error('The connection closed before the council finished.')
    } catch (err) {
      if (err.name === 'AbortError') return
      update((s) => ({ ...s, status: 'error', error: err.message, pending: [] }))
    }
  }, [])

  return { ...state, start, reset }
}
