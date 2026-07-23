import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Login } from './ui/Login'
import { ClientReview } from './ui/ClientReview'
import { useAuth } from './state/auth'
import { reviewFromUrl } from './lib/share'
import './styles.css'

const review = reviewFromUrl()   // a ?review= link opens the client screen, no login

function Root() {
  const user = useAuth(s => s.user)
  const verifySession = useAuth(s => s.verifySession)

  // Confirm a restored token is still accepted. Signs out only if the server
  // rejects it — never because the server was merely unreachable.
  useEffect(() => { void verifySession() }, [verifySession])

  if (review) return <ClientReview spec={review.spec} shop={review.shop} />
  return user ? <App /> : <Login />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Root /></StrictMode>
)
