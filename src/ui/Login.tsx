import { useState } from 'react'
import { useAuth } from '../state/auth'

export function Login() {
  const login = useAuth(s => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!login(username, password)) setError(true)
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
        <button className="login-btn" type="submit">Sign in</button>
      </form>
    </div>
  )
}
