import express, { type Request } from 'express'
import cors from 'cors'
import { q } from './db.js'
import { requireAuth, type Claims } from './auth.js'
import { createPaymentIntent } from './stripe.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }))
app.use(express.json({ limit: '2mb' }))

const user = (req: Request) => (req as Request & { user: Claims }).user

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'blue-flame', time: new Date().toISOString() }))

/* ---- auth (stubs: add real password hashing, e.g. argon2/bcrypt) ---- */
app.post('/api/auth/register', async (_req, res) => {
  // TODO: validate, hash password, insert tenant + admin user, return signToken(...)
  res.status(501).json({ error: 'implement: hash password, create tenant + user, return token' })
})
app.post('/api/auth/login', async (_req, res) => {
  // TODO: look up user by email, verify hash, return signToken({ id, tenant_id, role })
  res.status(501).json({ error: 'implement: verify password_hash, return token' })
})

/* ---- designs (the DesignSpec JSON, tenant-scoped) ---- */
app.get('/api/designs', requireAuth, async (req, res) => {
  const r = await q('select id, name, updated_at from designs where tenant_id = $1 order by updated_at desc', [user(req).tenant_id])
  res.json(r.rows)
})
app.post('/api/designs', requireAuth, async (req, res) => {
  const { name, spec, parent_id } = req.body
  const r = await q(
    'insert into designs (tenant_id, owner_id, name, spec, parent_id) values ($1,$2,$3,$4,$5) returning id',
    [user(req).tenant_id, user(req).id, name, spec, parent_id ?? null]
  )
  res.json(r.rows[0])
})
app.get('/api/designs/:id', requireAuth, async (req, res) => {
  const r = await q('select * from designs where id = $1 and tenant_id = $2', [req.params.id, user(req).tenant_id])
  r.rows[0] ? res.json(r.rows[0]) : res.status(404).json({ error: 'not found' })
})

/* ---- quotes (versioned, with expiry) ---- */
app.post('/api/quotes', requireAuth, async (req, res) => {
  const { design_id, total_cents, breakdown, expires_at } = req.body
  const r = await q(
    'insert into quotes (tenant_id, design_id, total_cents, breakdown, expires_at) values ($1,$2,$3,$4,$5) returning id, version',
    [user(req).tenant_id, design_id, total_cents, breakdown, expires_at ?? null]
  )
  res.json(r.rows[0])
})

/* ---- orders / pipeline ---- */
app.post('/api/orders', requireAuth, async (req, res) => {
  const { design_id, quote_id } = req.body
  const r = await q('insert into orders (tenant_id, design_id, quote_id) values ($1,$2,$3) returning id, stage', [user(req).tenant_id, design_id, quote_id ?? null])
  res.json(r.rows[0])
})
app.patch('/api/orders/:id/stage', requireAuth, async (req, res) => {
  const { stage } = req.body // designed|approved|cast|set|finished|qc|shipped
  await q(
    "update orders set stage = $1, approved_at = case when $1 = 'approved' then now() else approved_at end where id = $2 and tenant_id = $3",
    [stage, req.params.id, user(req).tenant_id]
  )
  res.json({ ok: true })
})

/* ---- checkout (Stripe payment intent) ---- */
app.post('/api/checkout', requireAuth, async (req, res) => {
  try {
    const { amount_cents, order_id } = req.body
    const pi = await createPaymentIntent(amount_cents, { order_id: String(order_id), tenant_id: user(req).tenant_id })
    res.json({ clientSecret: pi.client_secret })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

/* ---- Stripe webhook (verify signature, mark order paid) ---- */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (_req, res) => {
  // TODO: construct event with STRIPE_WEBHOOK_SECRET, on payment_intent.succeeded
  // set orders.stripe_payment_intent + advance stage. Return 200.
  res.json({ received: true })
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => console.log(`Blue Flame API listening on :${port}`))
