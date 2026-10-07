// One interface, two implementations: the real backend over HTTP, or an in-browser stand-in for the static preview.
import { DEFAULT_AVATAR, withDefaults } from './avatarOptions'
import { simulateDebate } from './demo'
import { streamDebate } from './sse'

export const DEMO = import.meta.env.VITE_DEMO === '1'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const TOKEN_KEY = 'council.token'

const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key)
      return v == null ? fallback : JSON.parse(v)
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage can be unavailable; the app still works for this visit
    }
  },
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ---------------- real backend ----------------
function httpApi() {
  let token = store.get(TOKEN_KEY)
  const call = async (method, path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : data.detail?.[0]?.msg
      throw new ApiError(res.status, detail || `Could not reach the Council server (HTTP ${res.status}).`)
    }
    return data
  }
  const signedIn = (data) => {
    token = data.token
    store.set(TOKEN_KEY, token)
    return data.user
  }
  return {
    hasSession: () => Boolean(token),
    signup: async (body) => signedIn(await call('POST', '/auth/signup', body)),
    login: async (body) => signedIn(await call('POST', '/auth/login', body)),
    logout: async () => {
      try { await call('POST', '/auth/logout') } catch { /* already signed out */ }
      token = null
      store.set(TOKEN_KEY, null)
    },
    me: () => call('GET', '/me'),
    updateMe: (body) => call('PUT', '/me', body),
    search: (q) => call('GET', `/users/search?q=${encodeURIComponent(q)}`).then((r) => r.results),
    friends: () => call('GET', '/friends'),
    requestFriend: (username) => call('POST', '/friends/requests', { username }),
    accept: (id) => call('POST', `/friends/${id}/accept`),
    removeFriend: (id) => call('DELETE', `/friends/${id}`),
    createPlan: (body) => call('POST', '/plans', body),
    listPlans: () => call('GET', '/plans').then((r) => r.plans),
    getPlan: (id) => call('GET', `/plans/${id}`),
    addMember: (id, userId) => call('POST', `/plans/${id}/members`, { user_id: userId }),
    join: (code) => call('POST', '/plans/join', { code }),
    sharePlan: (id) => call('POST', `/plans/${id}/share`).then((r) => r.code),
    deletePlan: (id) => call('DELETE', `/plans/${id}`),
    recap: (code) => call('GET', `/recap/${encodeURIComponent(code)}`),
    streamPlan: (id, onEvent, signal) =>
      streamDebate(`${API_BASE}/plans/${id}/stream`, null, onEvent, signal, token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ---------------- in-browser stand-in ----------------
const SEED = [
  { id: 'u-ravi', username: 'ravi.k', display_name: 'Ravi', email: 'ravi@example.com', avatar: withDefaults({ body: 'male', skin: 5, hair: 'curly', top: 'hoodie', topColor: 1, pet: { kind: 'dog', breed: 'Beagle', name: 'Bolt' } }) },
  { id: 'u-meera', username: 'meera', display_name: 'Meera', email: 'meera@example.com', avatar: withDefaults({ body: 'female', skin: 3, hair: 'ponytail', hairColor: 0, eyes: 'lashes', top: 'dress', topColor: 10 }) },
  { id: 'u-kabir', username: 'kabir_travels', display_name: 'Kabir', email: 'kabir@example.com', avatar: withDefaults({ body: 'male', skin: 6, hair: 'short', facialHair: 'beard', glasses: 'square', top: 'jacket', topColor: 6 }) },
  { id: 'u-zoya', username: 'zoya', display_name: 'Zoya', email: 'zoya@example.com', avatar: withDefaults({ body: 'female', skin: 1, hair: 'afro', hairColor: 2, headwear: 'headband', topColor: 9 }) },
]

function demoApi() {
  const KEY = 'council.demo.v1'
  const load = () =>
    store.get(KEY) ?? {
      me: null,
      users: SEED,
      // Ravi is already a friend, Meera has asked, Kabir and Zoya can be found by search
      friendships: [
        { a: 'me', b: 'u-ravi', status: 'accepted' },
        { a: 'u-meera', b: 'me', status: 'pending' },
      ],
      plans: [],
    }
  let db = load()
  const save = () => store.set(KEY, db)
  const live = new Map() // plan id -> { listeners:Set, done:boolean }
  const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
  const pub = (u) => ({ id: u.id, username: u.username, display_name: u.display_name, avatar: u.avatar })
  const meUser = () => ({ ...db.me, id: 'me' })
  const userById = (id) => (id === 'me' ? meUser() : db.users.find((u) => u.id === id))
  const relation = (id) => {
    const f = db.friendships.find((x) => (x.a === 'me' && x.b === id) || (x.b === 'me' && x.a === id))
    if (!f) return 'none'
    if (f.status === 'accepted') return 'friends'
    return f.a === 'me' ? 'outgoing' : 'incoming'
  }
  const need = () => {
    if (!db.me) throw new ApiError(401, 'Sign in to continue.')
  }
  const summary = (p) => ({ ...p, members: p.memberIds.map((id) => ({ ...pub(userById(id)), role: id === 'me' ? 'owner' : 'member' })) })

  return {
    hasSession: () => Boolean(db.me),
    async signup({ username, display_name, email }) {
      await wait()
      const name = username.trim().toLowerCase()
      if (!/^[a-z0-9_.]{3,20}$/.test(name)) throw new ApiError(422, 'Usernames are 3 to 20 characters: letters, numbers, dots and underscores.')
      if (db.users.some((u) => u.username === name)) throw new ApiError(409, 'That username is already taken.')
      db.me = { username: name, display_name: display_name.trim(), email: email?.trim() || null, avatar: { ...DEFAULT_AVATAR } }
      save()
      return meUser()
    },
    async login({ login }) {
      await wait()
      if (db.me && [db.me.username, db.me.email].includes(login.trim().toLowerCase())) return meUser()
      throw new ApiError(401, 'Wrong username, email or password. In this preview, create an account instead.')
    },
    async logout() {
      store.set(KEY, null)
      db = load()
    },
    async me() {
      need()
      return meUser()
    },
    async updateMe(body) {
      need()
      if (body.email != null && body.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) throw new ApiError(422, 'That email address does not look right.')
      db.me = {
        ...db.me,
        ...(body.display_name ? { display_name: body.display_name } : {}),
        ...(body.avatar ? { avatar: withDefaults(body.avatar) } : {}),
        ...(body.email != null ? { email: body.email.trim().toLowerCase() || null } : {}),
      }
      save()
      return meUser()
    },
    async search(q) {
      await wait(150)
      const s = q.trim().toLowerCase().replace(/^@/, '')
      if (s.length < 2) return []
      const hits = s.includes('@') ? db.users.filter((u) => u.email === s) : db.users.filter((u) => u.username.startsWith(s) || u.display_name.toLowerCase().startsWith(s))
      return hits.map((u) => ({ ...pub(u), relation: relation(u.id) }))
    },
    async friends() {
      const out = { friends: [], incoming: [], outgoing: [] }
      for (const f of db.friendships) {
        const other = f.a === 'me' ? f.b : f.a
        const key = f.status === 'accepted' ? 'friends' : f.a === 'me' ? 'outgoing' : 'incoming'
        out[key].push(pub(userById(other)))
      }
      return out
    },
    async requestFriend(username) {
      await wait()
      const u = db.users.find((x) => x.username === username.toLowerCase().replace(/^@/, ''))
      if (!u) throw new ApiError(404, 'No one with that username.')
      const rel = relation(u.id)
      if (rel === 'incoming') db.friendships.find((x) => x.a === u.id && x.b === 'me').status = 'accepted'
      else if (rel === 'none') db.friendships.push({ a: 'me', b: u.id, status: 'pending' })
      save()
      // in the preview, people you ask say yes a moment later
      if (rel === 'none') setTimeout(() => { const f = db.friendships.find((x) => x.a === 'me' && x.b === u.id); if (f) { f.status = 'accepted'; save() } }, 4000)
      return { relation: rel === 'incoming' ? 'friends' : rel === 'friends' ? 'friends' : 'outgoing', user: pub(u) }
    },
    async accept(id) {
      const f = db.friendships.find((x) => x.a === id && x.b === 'me')
      if (f) f.status = 'accepted'
      save()
      return { relation: 'friends' }
    },
    async removeFriend(id) {
      db.friendships = db.friendships.filter((x) => !((x.a === 'me' && x.b === id) || (x.b === 'me' && x.a === id)))
      save()
      return { relation: 'none' }
    },
    async createPlan({ brief, constraints, scene, member_ids = [] }) {
      need()
      await wait(200)
      const id = `p-${Date.now().toString(36)}`
      const plan = {
        id, brief, constraints, scene, status: 'in_progress', created_at: new Date().toISOString(),
        invite_code: Math.random().toString(36).slice(2, 10), title: null,
        memberIds: ['me', ...member_ids.filter((m) => relation(m) === 'friends')], events: [],
      }
      db.plans.unshift(plan)
      save()
      const channel = { listeners: new Set(), done: false }
      live.set(id, channel)
      let seq = 0
      simulateDebate(null, { brief, constraints }, (type, data) => {
        const ev = { ...data, type, seq: ++seq }
        plan.events.push(ev)
        if (type === 'final_plan') plan.title = data.title
        if (type === 'done') plan.status = 'complete'
        save()
        channel.listeners.forEach((fn) => fn(ev))
        if (type === 'done') channel.done = true
      })
      return summary(plan)
    },
    async listPlans() {
      need()
      return db.plans.map(summary)
    },
    async getPlan(id) {
      const p = db.plans.find((x) => x.id === id)
      if (!p) throw new ApiError(404, 'Plan not found, or you are not part of it.')
      return summary(p)
    },
    async addMember(id, userId) {
      const p = db.plans.find((x) => x.id === id)
      if (relation(userId) !== 'friends') throw new ApiError(403, 'You can add friends to a plan. Share the invite link with anyone else.')
      if (!p.memberIds.includes(userId)) p.memberIds.push(userId)
      save()
      return { members: summary(p).members }
    },
    async join() {
      throw new ApiError(404, 'Invite links work in the full app, not this preview.')
    },
    async deletePlan(id) {
      db.plans = db.plans.filter((x) => x.id !== id)
      save()
      return { deleted: true }
    },
    async sharePlan(id) {
      const p = db.plans.find((x) => x.id === id)
      if (!p) throw new ApiError(404, 'Plan not found.')
      p.share_code = p.share_code ?? Math.random().toString(36).slice(2, 10)
      save()
      return p.share_code
    },
    async recap(code) {
      await wait(150)
      const p = db.plans.find((x) => x.share_code === code)
      if (!p) throw new ApiError(404, 'This recap link is not valid.')
      const members = summary(p).members.map((m) => ({ display_name: m.display_name, avatar: m.avatar, role: m.role }))
      return { brief: p.brief, constraints: p.constraints, scene: p.scene, status: p.status, created_at: p.created_at, title: p.title, members, events: p.events }
    },
    async streamPlan(id, onEvent, signal) {
      const p = db.plans.find((x) => x.id === id)
      if (!p) throw new ApiError(404, 'Plan not found.')
      for (const ev of [...p.events]) onEvent(ev.type, ev)
      const channel = live.get(id)
      if (!channel || channel.done || p.events.some((e) => e.type === 'done')) return
      const last = p.events.length ? p.events[p.events.length - 1].seq : 0
      await new Promise((resolve, reject) => {
        const fn = (ev) => {
          if (ev.seq <= last) return
          onEvent(ev.type, ev)
          if (ev.type === 'done' || ev.type === 'error') finish()
        }
        const finish = () => { channel.listeners.delete(fn); resolve() }
        channel.listeners.add(fn)
        signal?.addEventListener('abort', () => { channel.listeners.delete(fn); reject(new DOMException('aborted', 'AbortError')) })
      })
    },
  }
}

export const api = DEMO ? demoApi() : httpApi()
