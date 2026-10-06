// The profile lives only on this device. Storage can be unavailable (private mode), so every access is guarded.
const KEY = 'council.profile.v1'

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    const p = raw ? JSON.parse(raw) : null
    return p && p.name && p.look ? p : null
  } catch {
    return null
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // keep working for this visit even if it cannot be stored
  }
}
