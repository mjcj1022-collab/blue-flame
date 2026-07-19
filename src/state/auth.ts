import { create } from 'zustand'

// Soft front-door gate. NOT real security — these live in the shipped bundle.
// Real accounts come from the backend `auth` API when it's provisioned.
const USERS: Record<string, string> = {
  mike: 'mike123',
  liliya: 'liliya123'
}
const KEY = 'blue-flame.user'

const stored = (): string | null => {
  try { return localStorage.getItem(KEY) } catch { return null }
}

interface AuthStore {
  user: string | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

export const useAuth = create<AuthStore>(set => ({
  user: stored(),
  login: (username, password) => {
    const key = username.trim().toLowerCase()
    if (USERS[key] && USERS[key] === password) {
      try { localStorage.setItem(KEY, key) } catch { /* storage disabled */ }
      set({ user: key })
      return true
    }
    return false
  },
  logout: () => {
    try { localStorage.removeItem(KEY) } catch { /* storage disabled */ }
    set({ user: null })
  }
}))
