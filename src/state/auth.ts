import { create } from 'zustand'
import { api, apiConfigured, setToken } from '../lib/api'

// Standalone soft gate (used when no backend is configured). NOT real security.
const USERS: Record<string, string> = { mike: 'mike123', liliya: 'liliya123' }
const KEY = 'blue-flame.user'
const TKEY = 'blue-flame.token'

const stored = (): string | null => {
  try { return localStorage.getItem(KEY) } catch { return null }
}
const storedToken = (): string | null => {
  try { return localStorage.getItem(TKEY) } catch { return null }
}

/**
 * With a backend, a remembered username is only a real session if we still hold
 * a token. Without this the app looks signed in while every API call fails with
 * "missing bearer token" — a broken state the user can't see or escape.
 */
export const sessionUser = (user: string | null, token: string | null, backend: boolean): string | null =>
  backend && !token ? null : user

// Restore a backend token across refreshes.
const restoredToken = storedToken()
if (restoredToken) setToken(restoredToken)

/**
 * Why a backend sign-in failed. "unreachable" matters on a free host that
 * sleeps: telling someone their password is wrong when the server is simply
 * asleep sends them chasing the wrong problem.
 */
export type LoginFailure = 'credentials' | 'unreachable'
export type LoginResult = { ok: true } | { ok: false; reason: LoginFailure }

/**
 * Classify a failed sign-in. fetch() rejects with a TypeError when the request
 * never got a response (server asleep, offline, CORS-blocked); an HTTP error —
 * including a 401 for a genuinely wrong password — arrives as a plain Error
 * from the API client.
 */
export const loginFailureReason = (err: unknown): LoginFailure =>
  err instanceof TypeError ? 'unreachable' : 'credentials'

interface AuthStore {
  user: string | null
  backend: boolean
  login: (username: string, password: string) => boolean
  loginRemote: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
}

export const useAuth = create<AuthStore>(set => ({
  user: sessionUser(stored(), restoredToken, apiConfigured()),
  backend: apiConfigured(),

  // Standalone gate.
  login: (username, password) => {
    const key = username.trim().toLowerCase()
    if (USERS[key] && USERS[key] === password) {
      try { localStorage.setItem(KEY, key) } catch { /* */ }
      set({ user: key })
      return true
    }
    return false
  },

  // Backend auth (scrypt + JWT) when VITE_API_URL is set.
  loginRemote: async (email, password) => {
    try {
      const r = await api.login(email.trim().toLowerCase(), password) as { token: string }
      setToken(r.token)
      try { localStorage.setItem(TKEY, r.token); localStorage.setItem(KEY, email.trim().toLowerCase()) } catch { /* */ }
      set({ user: email.trim().toLowerCase() })
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: loginFailureReason(err) }
    }
  },

  logout: () => {
    setToken(null)
    try { localStorage.removeItem(KEY); localStorage.removeItem(TKEY) } catch { /* */ }
    set({ user: null })
  }
}))
