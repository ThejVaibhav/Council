export const EMPTY_CONSTRAINTS = { budget: '', headcount: '', dates: '', location: '' }

export function cleanConstraints(c) {
  const out = {}
  for (const [k, v] of Object.entries(c)) {
    const t = String(v).trim()
    if (!t) continue
    if (k === 'headcount') {
      const n = parseInt(t, 10)
      if (n > 0) out[k] = n
    } else if (k === 'budget') {
      out[k] = /^\d+$/.test(t) ? `${t} INR` : t
    } else out[k] = t
  }
  return Object.keys(out).length ? out : null
}
