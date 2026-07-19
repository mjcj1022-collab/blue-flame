/**
 * Optional Stripe checkout. Only mounts when the backend (VITE_API_URL) AND a
 * Stripe publishable key (VITE_STRIPE_PK) are configured at build time. The
 * client never sees a secret key — it asks the backend for a PaymentIntent
 * client secret, then Stripe Elements collects the card in an iframe hosted by
 * Stripe. When either env var is unset the whole feature is inert and the app
 * stays quote-only.
 */
import { useEffect, useMemo, useState } from 'react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { api, apiConfigured } from '../lib/api'
import { money } from '../lib/units'

const PK = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_STRIPE_PK

/** True only when both the backend and a publishable key are wired up. */
export const checkoutConfigured = (): boolean => apiConfigured() && !!PK

// One Stripe.js load, shared across opens.
let _stripe: Promise<Stripe | null> | null = null
const getStripe = (): Promise<Stripe | null> => (_stripe ??= loadStripe(PK as string))

interface Props {
  amountCents: number
  label: string
  onClose: () => void
}

export function Checkout({ amountCents, label, onClose }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    api.checkout(amountCents, 'quote')
      .then(r => { if (live) setClientSecret(r.clientSecret) })
      .catch(e => { if (live) setError((e as Error).message) })
    return () => { live = false }
  }, [amountCents])

  const appearance = useMemo(() => ({
    theme: 'night' as const,
    variables: {
      colorPrimary: '#c79a4a', colorBackground: '#1a1d1e', colorText: '#dde2e3',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', borderRadius: '2px'
    }
  }), [])

  return (
    <div className="lab-overlay" onClick={onClose}>
      <div className="lab checkout" style={{ width: 'min(460px,96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="lab-head">
          <div>
            <h2>Take payment</h2>
            <p>{label} · Stripe secure checkout</p>
          </div>
          <button className="lab-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="co-body">
          <div className="co-amount"><span>Amount due</span><b>{money(amountCents / 100)}</b></div>

          {error && <p className="co-err">{error}</p>}

          {!error && !clientSecret && <p className="disc">Contacting Stripe…</p>}

          {clientSecret && (
            <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
              <PayForm onDone={onClose} />
            </Elements>
          )}

          <p className="disc co-note">
            Test mode: use card <b>4242 4242 4242 4242</b>, any future date, any CVC.
          </p>
        </div>
      </div>
    </div>
  )
}

function PayForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const pay = async () => {
    if (!stripe || !elements) return
    setBusy(true); setMsg(null)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.href }
    })
    setBusy(false)
    if (error) { setMsg(error.message ?? 'Payment failed.'); return }
    if (paymentIntent?.status === 'succeeded') {
      setDone(true)
      setTimeout(onDone, 1800)
    } else {
      setMsg(`Payment ${paymentIntent?.status ?? 'incomplete'}.`)
    }
  }

  if (done) return <p className="co-ok">✓ Payment received. Thank you.</p>

  return (
    <div className="co-form">
      <PaymentElement />
      {msg && <p className="co-err">{msg}</p>}
      <button className="primary co-pay" disabled={!stripe || busy} onClick={pay}>
        {busy ? 'Processing…' : 'Pay now'}
      </button>
    </div>
  )
}
