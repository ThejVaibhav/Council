import { SPECIALISTS, STANCE_LABEL, formatCost } from './agents'

// Turns the debate stream into what each seat at the table is doing right now.
// Poses: idle, listening, thinking, speaking, flag, support, offline, notes, synthesizing, cheer.
export function deriveCouncil(debate) {
  const { status, items, pending } = debate
  const rounds = items.filter((i) => i.kind === 'round').map((i) => i.round)
  const round = rounds.length ? rounds[rounds.length - 1] : 0
  const turns = items.filter((i) => i.kind === 'turn')
  const last = turns[turns.length - 1]

  let step = 0 // 0 brief, 1 round 1, 2 round 2, 3 verdict
  if (status !== 'idle') step = Math.max(1, round)
  if (status === 'moderating') step = 3
  if (status === 'done') step = 4

  const seats = {}
  for (const agent of SPECIALISTS) {
    const inRound = items.filter((i) => i.agent === agent && i.round === round)
    const turn = [...inRound].reverse().find((i) => i.kind === 'turn')
    const missing = inRound.some((i) => i.kind === 'missing')
    let seat = { pose: 'idle', status: 'Ready' }

    if (status === 'idle') seat = { pose: 'idle', status: 'Ready' }
    else if (status === 'done') seat = { pose: 'cheer', status: turn ? STANCE_LABEL[turn.stance] : 'Done' }
    else if (pending.includes(agent)) seat = { pose: 'thinking', status: 'Thinking' }
    else if (missing) seat = { pose: 'offline', status: 'Did not respond' }
    else if (status === 'moderating') seat = { pose: 'listening', status: turn ? STANCE_LABEL[turn.stance] : 'Done' }
    else if (turn) {
      const speaking = last && turn.id === last.id
      const pose = speaking ? { propose: 'speaking', flag: 'flag', support: 'support' }[turn.stance] : 'listening'
      seat = {
        pose,
        status: `${STANCE_LABEL[turn.stance]}${turn.estimated_cost != null ? ` · ${formatCost(turn.estimated_cost)}` : ''}`,
        bubble: speaking ? (formatCost(turn.estimated_cost) ?? STANCE_LABEL[turn.stance]) : null,
      }
    } else if (status === 'error') seat = { pose: 'idle', status: 'Stopped' }
    seats[agent] = seat
  }

  let moderator = { pose: 'idle', status: 'Ready' }
  if (status === 'running') moderator = { pose: 'notes', status: 'Taking notes' }
  if (status === 'moderating') moderator = { pose: 'synthesizing', status: 'Writing the verdict' }
  if (status === 'done') moderator = { pose: 'cheer', status: 'Verdict ready' }
  if (status === 'error') moderator = { pose: 'idle', status: 'Stopped' }
  seats.moderator = moderator

  const speaker = status === 'moderating' ? 'moderator' : last && seats[last.agent]?.bubble ? last.agent : null
  return { step, round, seats, speaker }
}
