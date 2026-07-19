import { useState } from 'react'
import { useAuth } from '../state/auth'

export function Login() {
  const login = useAuth(s => s.login)
  const loginRemote = useAuth(s => s.loginRemote)
  const backend = useAuth(s => s.backend)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (backend) {
      setBusy(true)
      const ok = await loginRemote(username, password)
      setBusy(false)
      if (!ok) setError(true)
    } else if (!login(username, password)) {
      setError(true)
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
            onChange={e => { setUsername(e.target.value); setError(false) }} />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input type="password" value={password} autoComplete="current-password"
            onChange={e => { setPassword(e.target.value); setError(false) }} />
        </label>

        {error && <div className="login-err">Wrong username or password.</div>}
        <button className="login-btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {backend && <p className="login-sub" style={{ margin: '2px 0 -4px' }}>Connected to backend</p>}
      </form>
    </div>
  )
}
