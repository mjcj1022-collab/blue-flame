import Stripe from 'stripe'

// Set STRIPE_SECRET_KEY (test key first). Null until configured so the rest of
// the API still boots for local development.
const key = process.env.STRIPE_SECRET_KEY
export const stripe = key ? new Stripe(key) : null

export async function createPaymentIntent(amountCents: number, metadata: Record<string, string>) {
  if (!stripe) throw new Error('Stripe not configured — set STRIPE_SECRET_KEY in .env')
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata
  })
}
