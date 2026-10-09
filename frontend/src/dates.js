// Dates for the "when" field.
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const sameDay = (a, b) => Boolean(a && b) && a.getTime() === b.getTime()

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Fri 17 Oct 2026", "Fri 17 – Sun 19 Oct 2026" or "Fri 31 Oct – Sun 2 Nov 2026" */
export function formatDates(start, end) {
  if (!start) return ''
  const day = (d) => `${WD[d.getDay()]} ${d.getDate()}`
  const full = (d) => `${day(d)} ${MO[d.getMonth()]} ${d.getFullYear()}`
  if (!end || sameDay(start, end)) return full(start)
  if (start.getFullYear() !== end.getFullYear()) return `${full(start)} – ${full(end)}`
  if (start.getMonth() !== end.getMonth()) return `${day(start)} ${MO[start.getMonth()]} – ${full(end)}`
  return `${day(start)} – ${full(end)}`
}
