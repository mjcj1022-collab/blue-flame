import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Login } from './ui/Login'
import { useAuth } from './state/auth'
import './styles.css'

function Root() {
  const user = useAuth(s => s.user)
  return user ? <App /> : <Login />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Root /></StrictMode>
)
