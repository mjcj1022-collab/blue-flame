import { create } from 'zustand'
import { api, apiConfigured, setToken } from '../lib/api'

// Standalone soft gate (used when no backend is configured). NOT real security.
const USERS: Record<string, string> = { mike: 'mike123', liliya: 'liliya123' }
const KEY = 'blue-flame.user'
const TKEY = 'blue-flame.token'

const stored = (): string | null => {
  try { return localStorage.getItem(KEY) } catch { return null }
}

// Restore a backend token across refreshes.
try { const t = localStorage.getItem(TKEY); if (t) setToken(t) } catch { /* storage disabled */ }

interface AuthStore {
  user: string | null
  backend: boolean
  login: (username: string, password: string) => boolean
  loginRemote: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuth = create<AuthStore>(set => ({
  user: stored(),
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
      return true
    } catch {
      return false
    }
  },

  logout: () => {
    setToken(null)
    try { localStorage.removeItem(KEY); localStorage.removeItem(TKEY) } catch { /* */ }
    set({ user: null })
  }
}))
