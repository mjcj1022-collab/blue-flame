import { useState } from 'react'
import { useAuth } from '../state/auth'

export function Login() {
  const login = useAuth(s => s.login)
  const loginRemote = useAuth(s => s.loginRemote)
  const backend = useAuth(s => s.backend)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<null | 'credentials' | 'unreachable'>(null)
  const [busy, setBusy] = useState(false)
  // A sleeping free host takes up to a minute to wake. Silence for that long
  // reads as "broken", so say what's happening once it's clearly not instant.
  const [waking, setWaking] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (backend) {
      setBusy(true)
      const wakeHint = setTimeout(() => setWaking(true), 4000)
      const res = await loginRemote(username, password)
      clearTimeout(wakeHint)
      setBusy(false); setWaking(false)
      if (!res.ok) setError(res.reason)
    } else if (!login(username, password)) {
      setError('credentials')
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">BLUE&nbsp;<em>FLAME</em></div>
        <p className="login-sub">Jewelry Design Studio</p>

        <label className="login-field">
          <span>Username</span>
          <input value={username} autoFocus autoComplete="username" spellCheck={false}
            onChange={e => { setUsername(e.target.value); setError(null) }} />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input type="password" value={password} autoComplete="current-password"
            onChange={e => { setPassword(e.target.value); setError(null) }} />
        </label>

        {error === 'credentials' && <div className="login-err">Wrong username or password.</div>}
        {error === 'unreachable' && (
          <div className="login-err">Couldn’t reach the server — it may be waking up. Try again in a moment.</div>
        )}
        <button className="login-btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {waking && (
          <p className="login-sub" style={{ margin: '4px 0 -4px', textTransform: 'none', letterSpacing: 0 }}>
            Waking the server — the free host sleeps when idle, this can take up to a minute.
          </p>
        )}
        {backend && <p className="login-sub" style={{ margin: '2px 0 -4px' }}>Connected to backend</p>}
      </form>
    </div>
  )
}
