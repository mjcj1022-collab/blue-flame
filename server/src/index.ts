import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { run, get, all, uid, audit, initDb, dbKind } from './db.js'
import { requireAuth, requireRole, signToken, hashPassword, verifyPassword, type Claims } from './auth.js'
import { createPaymentIntent, constructWebhookEvent, createCheckoutSession } from './stripe.js'
import { getSpot } from './spot.js'
import { runAssistant, aiEnabled } from './ai.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }))

const me = (req: Request) => (req as Request & { user: Claims }).user

/**
 * Comp accounts — emails that get full studio access without paying (the shop
 * owner, staff, testers). Set COMP_EMAILS in the environment as a comma-separated
 * list. Matched case-insensitively. Kept in env (not the DB) so it survives a
 * fresh database and can't be lost — the owner can never lock themselves out.
 */
const COMP_EMAILS = new Set(
  (process.env.COMP_EMAILS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
const isComped = async (userId: string): Promise<boolean> => {
  if (COMP_EMAILS.size === 0) return false
  const u = await get<{ email?: string }>('SELECT email FROM users WHERE id = ?', userId)
  return !!u?.email && COMP_EMAILS.has(String(u.email).toLowerCase())
}

/** Wrap an async handler so a rejected promise reaches Express's error handler. */
const a = (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next)

/**
 * Record an affiliate commission for a paying, referred customer. Looks up the
 * tenant's referrer and its CURRENT rate, then inserts a commission. sourceId is
 * the Stripe session/invoice id, uniquely constrained, so a re-delivered webhook
 * can't double-credit. No-ops when the tenant wasn't referred.
 */
async function creditCommission(tenantId: string, kind: 'subscription' | 'offline', grossCents: number, sourceId: string): Promise<void> {
  if (!tenantId || !grossCents || grossCents <= 0) return
  const t = await get<{ referred_by?: string }>('SELECT referred_by FROM tenants WHERE id = ?', tenantId)
  if (!t?.referred_by) return
  const aff = await get<{ id: string; rate: number; active: number }>('SELECT id, rate, active FROM affiliates WHERE id = ?', t.referred_by)
  if (!aff || !aff.active) return
  const rate = Number(aff.rate) || 0
  const commission = Math.round(grossCents * rate)
  await run(
    'INSERT OR IGNORE INTO commissions (id, affiliate_id, tenant_id, kind, gross_cents, rate, commission_cents, source_id) VALUES (?,?,?,?,?,?,?,?)',
    uid(), aff.id, tenantId, kind, grossCents, rate, commission, sourceId)
}

/* ---------- Stripe webhook (raw body, before the JSON parser) ----------
 * Stripe posts here when a payment settles / a subscription changes; the
 * signature is verified against the raw bytes, so this route must NOT go through
 * express.json(). Idempotent — Stripe may deliver an event more than once. */
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') { res.status(400).json({ error: 'missing stripe-signature' }); return }
  let event
  try {
    event = await constructWebhookEvent(req.body as Buffer, sig)
  } catch (e) {
    res.status(400).json({ error: `signature verification failed: ${(e as Error).message}` }); return
  }

  const updateTenantSub = async (tenantId: string, patch: Record<string, unknown>) => {
    const cols = Object.keys(patch)
    if (!cols.length || !tenantId) return
    const set = cols.map(c => `${c} = ?`).join(', ')
    await run(`UPDATE tenants SET ${set} WHERE id = ?`, ...cols.map(c => patch[c]), tenantId)
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as { id?: string; amount_received?: number; amount?: number; metadata?: Record<string, string> }
      const orderId = pi.metadata?.order_id
      const tenantId = pi.metadata?.tenant_id
      const amount = pi.amount_received ?? pi.amount ?? 0
      if (orderId && orderId !== 'quote' && orderId !== 'adhoc') {
        const info = await run(
          `UPDATE orders SET stage = 'approved', approved_at = COALESCE(approved_at, datetime('now')),
           stripe_payment_intent = ?, deposit_cents = ? WHERE id = ? AND stage IN ('designed','approved')`,
          pi.id ?? null, amount, orderId)
        if (info.changes && tenantId) audit(tenantId, null, 'order.paid', orderId, { amount, payment_intent: pi.id })
      } else if (tenantId) {
        audit(tenantId, null, 'payment.received', null, { amount, payment_intent: pi.id })
      }
    } else if (event.type === 'checkout.session.completed') {
      const s = event.data.object as { id?: string; mode?: string; amount_total?: number; client_reference_id?: string; metadata?: Record<string, string>; customer?: string; subscription?: string }
      const tenantId = s.metadata?.tenant_id ?? s.client_reference_id ?? ''
      const planId = s.metadata?.plan_id ?? null
      if (tenantId) {
        if (s.mode === 'payment') {
          await updateTenantSub(tenantId, { offline_purchase: 1, subscription_plan: planId ?? 'offline-lifetime', stripe_customer_id: s.customer ?? null })
        } else {
          await updateTenantSub(tenantId, { subscription_status: 'active', subscription_plan: planId ?? 'studio-monthly', stripe_customer_id: s.customer ?? null, stripe_subscription_id: s.subscription ?? null })
        }
        audit(tenantId, null, 'billing.checkout', planId ?? undefined, { mode: s.mode })
        // Affiliate commission on this first payment (offline one-time, or the
        // first month of a subscription). Renewals are credited via invoice.paid.
        await creditCommission(tenantId, s.mode === 'payment' ? 'offline' : 'subscription', s.amount_total ?? 0, s.id ?? uid())
      }
    } else if (event.type === 'invoice.paid') {
      // Recurring subscription payments (not the first — that's covered above).
      const inv = event.data.object as { id?: string; subscription?: string; amount_paid?: number; billing_reason?: string }
      if (inv.subscription && inv.billing_reason === 'subscription_cycle') {
        const t = await get<{ id?: string }>('SELECT id FROM tenants WHERE stripe_subscription_id = ?', inv.subscription)
        if (t?.id) await creditCommission(t.id, 'subscription', inv.amount_paid ?? 0, inv.id ?? uid())
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as { status?: string; current_period_end?: number; metadata?: Record<string, string> }
      const tenantId = sub.metadata?.tenant_id ?? ''
      if (tenantId) {
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : (sub.status ?? 'active')
        await updateTenantSub(tenantId, { subscription_status: status, current_period_end: sub.current_period_end ? sub.current_period_end * 1000 : null })
      }
    } else if (event.type === 'invoice.payment_failed') {
      const inv = event.data.object as { subscription?: string }
      if (inv.subscription) {
        const t = await get<{ id?: string }>('SELECT id FROM tenants WHERE stripe_subscription_id = ?', inv.subscription)
        if (t?.id) await updateTenantSub(t.id, { subscription_status: 'past_due' })
      }
    }
  } catch (e) {
    console.error('[webhook] handler error:', (e as Error).message)   // don't crash; Stripe will retry
  }

  res.json({ received: true })
})

app.use(express.json({ limit: '2mb' }))

// Email must be unique ACROSS tenants: login matches on email alone (first row
// wins), so two shops sharing an email would lock one out or cross into the
// other's data. Enforce global uniqueness at every account-creation path.
const emailExists = async (email: string): Promise<boolean> =>
  !!(await get('SELECT 1 FROM users WHERE email = ?', String(email).toLowerCase()))

// Health + readiness. Booleans only — never leaks a key. Lets us confirm from
// outside whether Stripe, the webhook, and persistent storage are wired.
app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'blue-flame',
  db: dbKind,
  time: new Date().toISOString(),
  stripe: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_OFFLINE),
  webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
  persistent: dbKind === 'libsql-turso',
}))

// Daily precious-metal spot (public — prices aren't sensitive). Cached server-side.
app.get('/api/spot', async (_req, res) => {
  try { res.json(await getSpot()) }
  catch { res.json({ prices: {}, at: new Date().toISOString(), source: 'static', stale: true }) }
})

// AI design assistant proxy (auth-gated so it can't be used to burn the key).
app.get('/api/assistant/status', requireAuth, (_req, res) => res.json({ enabled: aiEnabled() }))
app.post('/api/assistant', requireAuth, a(async (req, res) => {
  if (!aiEnabled()) { res.json({ disabled: true, text: '' }); return }
  try {
    const { system, messages, image } = req.body ?? {}
    if (!Array.isArray(messages)) { res.status(400).json({ error: 'messages required' }); return }
    const text = await runAssistant({ system, messages, image })
    res.json({ text })
  } catch (e) {
    const detail = (e as Error).message || 'unknown error'
    console.error('[assistant] call failed:', detail)
    res.status(502).json({ error: 'assistant failed', detail: detail.slice(0, 400) })
  }
}))

/* ---------------- auth ---------------- */

app.post('/api/auth/register', a(async (req, res) => {
  const { shop, email, password, ref } = req.body ?? {}
  if (!shop || !email || !password) { res.status(400).json({ error: 'shop, email and password are required' }); return }
  if (await emailExists(email)) { res.status(400).json({ error: 'that email is already registered' }); return }
  const tenantId = uid()
  const slug = `${String(shop).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${tenantId.slice(0, 4)}`
  const userId = uid()
  // Attribute the signup to an affiliate if a valid, active ref code came along.
  let referredBy: string | null = null
  if (ref) {
    const aff = await get<{ id: string }>('SELECT id FROM affiliates WHERE code = ? AND active = 1', String(ref).toLowerCase())
    referredBy = aff?.id ?? null
  }
  await run('INSERT INTO tenants (id, name, slug, referred_by) VALUES (?,?,?,?)', tenantId, shop, slug, referredBy)
  await run('INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES (?,?,?,?,?)',
    userId, tenantId, String(email).toLowerCase(), hashPassword(password), 'admin')
  audit(tenantId, userId, 'register')
  res.json({ token: signToken({ id: userId, tenant_id: tenantId, role: 'admin' }), tenant: { id: tenantId, name: shop, slug }, role: 'admin' })
}))

app.post('/api/auth/login', a(async (req, res) => {
  const { email, password } = req.body ?? {}
  const u = await get<{ id: string; tenant_id: string; role: string; password_hash: string }>(
    'SELECT * FROM users WHERE email = ?', String(email ?? '').toLowerCase())
  if (!u || !verifyPassword(String(password ?? ''), u.password_hash)) { res.status(401).json({ error: 'invalid credentials' }); return }
  res.json({ token: signToken({ id: u.id, tenant_id: u.tenant_id, role: u.role }), role: u.role })
}))

app.get('/api/me', requireAuth, a(async (req, res) => {
  const t = await get('SELECT id, name, slug, markup FROM tenants WHERE id = ?', me(req).tenant_id)
  res.json({ user: me(req), tenant: t })
}))

/* ---------------- team (users & roles) ----------------
 * A shop owner (admin) invites bench and setter accounts into the same tenant.
 * All routes are admin-only and tenant-scoped. Guardrails: you can't demote or
 * remove the last admin, and you can't remove yourself. */
const ROLES = ['admin', 'bench', 'setter', 'associate']
const adminCount = async (tenantId: string): Promise<number> =>
  Number((await get<{ n: number }>("SELECT COUNT(*) n FROM users WHERE tenant_id = ? AND role = 'admin'", tenantId))?.n ?? 0)
const userRole = async (id: string, tenantId: string): Promise<string | undefined> =>
  (await get<{ role?: string }>('SELECT role FROM users WHERE id = ? AND tenant_id = ?', id, tenantId))?.role

app.get('/api/team', requireAuth, requireRole('admin'), a(async (req, res) => {
  res.json(await all('SELECT id, email, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at', me(req).tenant_id))
}))

app.post('/api/team', requireAuth, requireRole('admin'), a(async (req, res) => {
  const { email, password, role } = req.body ?? {}
  if (!email || !password) { res.status(400).json({ error: 'email and password are required' }); return }
  if (String(password).length < 6) { res.status(400).json({ error: 'password must be at least 6 characters' }); return }
  if (await emailExists(email)) { res.status(400).json({ error: 'that email is already in use' }); return }
  const r = ROLES.includes(role) ? role : 'associate'
  const id = uid()
  await run('INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES (?,?,?,?,?)',
    id, me(req).tenant_id, String(email).toLowerCase(), hashPassword(String(password)), r)
  audit(me(req).tenant_id, me(req).id, 'team.add', id, { role: r })
  res.json({ id, role: r })
}))

app.patch('/api/team/:id', requireAuth, requireRole('admin'), a(async (req, res) => {
  const { role } = req.body ?? {}
  if (!ROLES.includes(role)) { res.status(400).json({ error: 'invalid role' }); return }
  if (role !== 'admin' && await userRole(String(req.params.id), me(req).tenant_id) === 'admin' && await adminCount(me(req).tenant_id) <= 1) {
    res.status(400).json({ error: 'cannot demote the last admin' }); return
  }
  const info = await run('UPDATE users SET role = ? WHERE id = ? AND tenant_id = ?', role, req.params.id, me(req).tenant_id)
  audit(me(req).tenant_id, me(req).id, 'team.role', String(req.params.id), { role })
  res.json({ updated: info.changes })
}))

app.delete('/api/team/:id', requireAuth, requireRole('admin'), a(async (req, res) => {
  if (req.params.id === me(req).id) { res.status(400).json({ error: 'you cannot remove yourself' }); return }
  if (await userRole(String(req.params.id), me(req).tenant_id) === 'admin' && await adminCount(me(req).tenant_id) <= 1) {
    res.status(400).json({ error: 'cannot remove the last admin' }); return
  }
  const info = await run('DELETE FROM users WHERE id = ? AND tenant_id = ?', req.params.id, me(req).tenant_id)
  audit(me(req).tenant_id, me(req).id, 'team.remove', String(req.params.id))
  res.json({ deleted: info.changes })
}))

/* ---------------- affiliates / referral program ----------------
 * Admin-only. Each affiliate has a unique link code and its own commission rate,
 * which the owner can change any time. Referred signups and their commissions
 * are tracked automatically (see register + the Stripe webhook). */
const slugify = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 16)
const clampRate = (pct: unknown) => Math.max(0, Math.min(1, (Number(pct) || 0) / 100))
async function genAffiliateCode(base: unknown): Promise<string> {
  const s = slugify(base) || 'ref'
  for (let i = 0; i < 6; i++) {
    const code = `${s}-${uid().slice(0, 4)}`
    if (!(await get('SELECT 1 FROM affiliates WHERE code = ?', code))) return code
  }
  return `ref-${uid().slice(0, 8)}`
}

app.get('/api/affiliates', requireAuth, requireRole('admin'), a(async (req, res) => {
  res.json(await all(`
    SELECT af.id, af.code, af.name, af.email, af.rate, af.active, af.created_at,
      (SELECT COUNT(*) FROM tenants t WHERE t.referred_by = af.id) AS referrals,
      (SELECT COUNT(*) FROM commissions c WHERE c.affiliate_id = af.id) AS conversions,
      (SELECT COALESCE(SUM(commission_cents),0) FROM commissions c WHERE c.affiliate_id = af.id) AS earned_cents,
      (SELECT COALESCE(SUM(commission_cents),0) FROM commissions c WHERE c.affiliate_id = af.id AND c.status='pending') AS pending_cents
    FROM affiliates af WHERE af.owner_tenant_id = ? ORDER BY af.created_at DESC
  `, me(req).tenant_id))
}))

app.post('/api/affiliates', requireAuth, requireRole('admin'), a(async (req, res) => {
  const { name, email, code, ratePct } = req.body ?? {}
  const finalCode = code ? slugify(code) : await genAffiliateCode(name)
  if (!finalCode) { res.status(400).json({ error: 'could not build a link code' }); return }
  if (await get('SELECT 1 FROM affiliates WHERE code = ?', finalCode)) { res.status(400).json({ error: 'that link code is already taken' }); return }
  const id = uid()
  const rate = clampRate(ratePct ?? 20)
  await run('INSERT INTO affiliates (id, owner_tenant_id, code, name, email, rate) VALUES (?,?,?,?,?,?)',
    id, me(req).tenant_id, finalCode, name ? String(name) : null, email ? String(email) : null, rate)
  audit(me(req).tenant_id, me(req).id, 'affiliate.create', id, { code: finalCode, rate })
  res.json({ id, code: finalCode, rate })
}))

app.patch('/api/affiliates/:id', requireAuth, requireRole('admin'), a(async (req, res) => {
  const { ratePct, active, name, email } = req.body ?? {}
  const fields: Record<string, unknown> = {}
  if (ratePct !== undefined) fields.rate = clampRate(ratePct)
  if (active !== undefined) fields.active = active ? 1 : 0
  if (name !== undefined) fields.name = name ? String(name) : null
  if (email !== undefined) fields.email = email ? String(email) : null
  const cols = Object.keys(fields)
  if (!cols.length) { res.json({ updated: 0 }); return }
  const set = cols.map(c => `${c} = ?`).join(', ')
  const info = await run(`UPDATE affiliates SET ${set} WHERE id = ? AND owner_tenant_id = ?`, ...cols.map(c => fields[c]), String(req.params.id), me(req).tenant_id)
  audit(me(req).tenant_id, me(req).id, 'affiliate.update', String(req.params.id), fields)
  res.json({ updated: info.changes })
}))

app.delete('/api/affiliates/:id', requireAuth, requireRole('admin'), a(async (req, res) => {
  // Deactivate rather than delete, so commission history is preserved.
  const info = await run('UPDATE affiliates SET active = 0 WHERE id = ? AND owner_tenant_id = ?', String(req.params.id), me(req).tenant_id)
  res.json({ deactivated: info.changes })
}))

app.get('/api/affiliates/:id/commissions', requireAuth, requireRole('admin'), a(async (req, res) => {
  const aff = await get('SELECT id FROM affiliates WHERE id = ? AND owner_tenant_id = ?', String(req.params.id), me(req).tenant_id)
  if (!aff) { res.status(404).json({ error: 'not found' }); return }
  res.json(await all('SELECT id, kind, gross_cents, rate, commission_cents, status, created_at FROM commissions WHERE affiliate_id = ? ORDER BY created_at DESC', String(req.params.id)))
}))

/* ---------------- designs ---------------- */

app.get('/api/designs', requireAuth, a(async (req, res) => {
  res.json(await all('SELECT id, name, updated_at FROM designs WHERE tenant_id = ? ORDER BY updated_at DESC', me(req).tenant_id))
}))

app.post('/api/designs', requireAuth, a(async (req, res) => {
  const { name, spec, parent_id } = req.body ?? {}
  if (!name || !spec) { res.status(400).json({ error: 'name and spec required' }); return }
  const id = uid()
  await run('INSERT INTO designs (id, tenant_id, owner_id, name, spec, parent_id) VALUES (?,?,?,?,?,?)',
    id, me(req).tenant_id, me(req).id, name, JSON.stringify(spec), parent_id ?? null)
  audit(me(req).tenant_id, me(req).id, 'design.create', id)
  res.json({ id })
}))

app.get('/api/designs/:id', requireAuth, a(async (req, res) => {
  const r = await get<{ spec: string }>('SELECT * FROM designs WHERE id = ? AND tenant_id = ?', req.params.id, me(req).tenant_id)
  if (!r) { res.status(404).json({ error: 'not found' }); return }
  res.json({ ...r, spec: JSON.parse(r.spec) })
}))

app.delete('/api/designs/:id', requireAuth, a(async (req, res) => {
  const info = await run('DELETE FROM designs WHERE id = ? AND tenant_id = ?', req.params.id, me(req).tenant_id)
  res.json({ deleted: info.changes })
}))

app.put('/api/designs/:id', requireAuth, a(async (req, res) => {
  const { name, spec } = req.body ?? {}
  const info = await run("UPDATE designs SET name = COALESCE(?, name), spec = COALESCE(?, spec), updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
    name ?? null, spec ? JSON.stringify(spec) : null, req.params.id, me(req).tenant_id)
  res.json({ updated: info.changes })
}))

/* ---------------- cloud maker library (sculpts) ---------------- */

app.get('/api/sculpts', requireAuth, a(async (req, res) => {
  res.json(await all('SELECT id, name, tags, updated_at FROM sculpts WHERE tenant_id = ? ORDER BY updated_at DESC', me(req).tenant_id))
}))

app.get('/api/sculpts/:id', requireAuth, a(async (req, res) => {
  const r = await get<{ data: string }>('SELECT id, name, tags, data, updated_at FROM sculpts WHERE id = ? AND tenant_id = ?', req.params.id, me(req).tenant_id)
  if (!r) { res.status(404).json({ error: 'not found' }); return }
  res.json({ ...r, data: JSON.parse(r.data) })
}))

app.post('/api/sculpts', requireAuth, a(async (req, res) => {
  const { name, tags, data } = req.body ?? {}
  if (!name || !data) { res.status(400).json({ error: 'name and data required' }); return }
  const id = uid()
  await run('INSERT INTO sculpts (id, tenant_id, owner_id, name, tags, data) VALUES (?,?,?,?,?,?)',
    id, me(req).tenant_id, me(req).id, String(name), Array.isArray(tags) ? tags.join(',') : (tags ?? null), JSON.stringify(data))
  audit(me(req).tenant_id, me(req).id, 'sculpt.save', id)
  res.json({ id })
}))

app.delete('/api/sculpts/:id', requireAuth, a(async (req, res) => {
  const info = await run('DELETE FROM sculpts WHERE id = ? AND tenant_id = ?', req.params.id, me(req).tenant_id)
  res.json({ deleted: info.changes })
}))

/* ---------------- customers (CRM) ---------------- */

app.get('/api/customers', requireAuth, a(async (req, res) => {
  res.json(await all('SELECT id, name, email, phone, notes, created_at FROM customers WHERE tenant_id = ? ORDER BY name COLLATE NOCASE', me(req).tenant_id))
}))

app.post('/api/customers', requireAuth, a(async (req, res) => {
  const { name, email, phone, notes } = req.body ?? {}
  if (!name || !String(name).trim()) { res.status(400).json({ error: 'name required' }); return }
  const id = uid()
  await run('INSERT INTO customers (id, tenant_id, name, email, phone, notes) VALUES (?,?,?,?,?,?)',
    id, me(req).tenant_id, String(name).trim(), email ?? null, phone ?? null, notes ?? null)
  audit(me(req).tenant_id, me(req).id, 'customer.create', id)
  res.json({ id })
}))

app.patch('/api/customers/:id', requireAuth, a(async (req, res) => {
  const { name, email, phone, notes } = req.body ?? {}
  const info = await run(
    'UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), notes = COALESCE(?, notes) WHERE id = ? AND tenant_id = ?',
    name ? String(name).trim() : null, email ?? null, phone ?? null, notes ?? null, req.params.id, me(req).tenant_id)
  res.json({ updated: info.changes })
}))

app.delete('/api/customers/:id', requireAuth, a(async (req, res) => {
  // Detach from any orders first so the order history survives the customer.
  await run('UPDATE orders SET customer_id = NULL WHERE customer_id = ? AND tenant_id = ?', req.params.id, me(req).tenant_id)
  const info = await run('DELETE FROM customers WHERE id = ? AND tenant_id = ?', req.params.id, me(req).tenant_id)
  res.json({ deleted: info.changes })
}))

/* ---------------- gallery (curated showcase) ---------------- */

const requireAdmin = (req: Request, res: Response): boolean => {
  if (me(req).role !== 'admin') { res.status(403).json({ error: 'admin only' }); return false }
  return true
}

app.get('/api/gallery', requireAuth, a(async (req, res) => {
  res.json(await all('SELECT id, title, subtitle, image, spec, created_at FROM gallery WHERE tenant_id = ? ORDER BY created_at DESC', me(req).tenant_id))
}))

app.post('/api/gallery', requireAuth, a(async (req, res) => {
  if (!requireAdmin(req, res)) return
  const { title, subtitle, image, spec } = req.body ?? {}
  if (!title || !String(title).trim()) { res.status(400).json({ error: 'title required' }); return }
  if (!image || !String(image).startsWith('data:image')) { res.status(400).json({ error: 'image required' }); return }
  const id = uid()
  await run('INSERT INTO gallery (id, tenant_id, title, subtitle, image, spec, created_by) VALUES (?,?,?,?,?,?,?)',
    id, me(req).tenant_id, String(title).trim(), subtitle ? String(subtitle).trim() : null, String(image), spec ? JSON.stringify(spec) : null, me(req).id)
  audit(me(req).tenant_id, me(req).id, 'gallery.add', id)
  res.json({ id })
}))

app.delete('/api/gallery/:id', requireAuth, a(async (req, res) => {
  if (!requireAdmin(req, res)) return
  const gid = String(req.params.id)
  const info = await run('DELETE FROM gallery WHERE id = ? AND tenant_id = ?', gid, me(req).tenant_id)
  audit(me(req).tenant_id, me(req).id, 'gallery.delete', gid)
  res.json({ deleted: info.changes })
}))

/* ---------------- quotes ---------------- */

app.post('/api/quotes', requireAuth, a(async (req, res) => {
  const { design_id, total_cents, breakdown, expires_at } = req.body ?? {}
  const id = uid()
  const prev = await get<{ v: number | null }>('SELECT MAX(version) v FROM quotes WHERE design_id = ?', design_id)
  const version = (prev?.v ?? 0) + 1
  await run('INSERT INTO quotes (id, tenant_id, design_id, version, total_cents, breakdown, expires_at) VALUES (?,?,?,?,?,?,?)',
    id, me(req).tenant_id, design_id, version, total_cents, JSON.stringify(breakdown ?? {}), expires_at ?? null)
  res.json({ id, version })
}))

/* ---------------- orders / pipeline ---------------- */

app.get('/api/orders', requireAuth, a(async (req, res) => {
  res.json(await all(`
    SELECT o.*, d.name AS design_name, c.name AS customer_name,
           CASE WHEN json_extract(d.spec, '$.kind') = 'sculpt' THEN 1 ELSE 0 END AS is_sculpt
    FROM orders o
    LEFT JOIN designs d ON d.id = o.design_id AND d.tenant_id = o.tenant_id
    LEFT JOIN customers c ON c.id = o.customer_id AND c.tenant_id = o.tenant_id
    WHERE o.tenant_id = ? ORDER BY o.created_at DESC
  `, me(req).tenant_id))
}))

app.post('/api/orders', requireAuth, a(async (req, res) => {
  const { design_id, quote_id, customer_id } = req.body ?? {}
  const id = uid()
  await run('INSERT INTO orders (id, tenant_id, design_id, quote_id, customer_id) VALUES (?,?,?,?,?)',
    id, me(req).tenant_id, design_id, quote_id ?? null, customer_id ?? null)
  res.json({ id, stage: 'designed' })
}))

app.patch('/api/orders/:id/customer', requireAuth, a(async (req, res) => {
  const { customer_id } = req.body ?? {}
  const info = await run('UPDATE orders SET customer_id = ? WHERE id = ? AND tenant_id = ?', customer_id ?? null, req.params.id, me(req).tenant_id)
  res.json({ updated: info.changes })
}))

app.patch('/api/orders/:id/stage', requireAuth, a(async (req, res) => {
  const { stage } = req.body ?? {}
  const approved = stage === 'approved'
  const info = await run(`UPDATE orders SET stage = ?, approved_at = CASE WHEN ? THEN datetime('now') ELSE approved_at END WHERE id = ? AND tenant_id = ?`,
    stage, approved ? 1 : 0, req.params.id, me(req).tenant_id)
  audit(me(req).tenant_id, me(req).id, 'order.stage', String(req.params.id), { stage })
  res.json({ updated: info.changes })
}))

/* ---------------- subscription / access billing ---------------- */

const PLAN_PRICE: Record<string, { mode: 'subscription' | 'payment'; env: string }> = {
  'studio-monthly': { mode: 'subscription', env: 'STRIPE_PRICE_MONTHLY' },
  'offline-lifetime': { mode: 'payment', env: 'STRIPE_PRICE_OFFLINE' },
}

app.get('/api/subscription', requireAuth, a(async (req, res) => {
  // Comp accounts (owner / staff / testers) always have access — no Stripe needed,
  // and it holds even on a fresh database since the list lives in the environment.
  if (await isComped(me(req).id)) {
    res.json({ status: 'active', planId: 'studio-monthly', comp: true }); return
  }
  const t = await get<{ subscription_status?: string; subscription_plan?: string; current_period_end?: number; offline_purchase?: number }>(
    'SELECT subscription_status, subscription_plan, current_period_end, offline_purchase FROM tenants WHERE id = ?', me(req).tenant_id)
  res.json({
    status: t?.subscription_status ?? 'none',
    planId: t?.subscription_plan ?? undefined,
    currentPeriodEnd: t?.current_period_end ?? undefined,
    offline: !!t?.offline_purchase,
  })
}))

app.post('/api/billing/checkout', requireAuth, a(async (req, res) => {
  try {
    const planId = String((req.body ?? {}).planId ?? '')
    const plan = PLAN_PRICE[planId]
    if (!plan) { res.status(400).json({ error: 'unknown plan' }); return }
    const priceId = process.env[plan.env] ?? ''
    const clientOrigin = process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN !== '*' ? process.env.CLIENT_ORIGIN : ''
    // The app may be served from a subpath (e.g. GitHub Pages /repo/). Use the
    // return URL the client sent so Stripe drops the customer back INTO the app —
    // but only if it's under our own origin, so this can't become an open redirect.
    const returnTo = String((req.body ?? {}).returnTo ?? '').trim()
    let base = clientOrigin
    if (returnTo && (!clientOrigin || returnTo.startsWith(clientOrigin))) base = returnTo.replace(/\/+$/, '')
    const session = await createCheckoutSession({
      mode: plan.mode, priceId, tenantId: me(req).tenant_id, planId,
      successUrl: `${base}/?billing=success`, cancelUrl: `${base}/?billing=cancel`,
    })
    res.json({ url: session.url })
  } catch (e) {
    res.status(501).json({ error: (e as Error).message })
  }
}))

/* ---------------- checkout (Stripe, optional) ---------------- */

app.post('/api/checkout', requireAuth, a(async (req, res) => {
  try {
    const { amount_cents, order_id, design_id } = req.body ?? {}
    let oid = order_id as string | undefined
    if ((!oid || oid === 'quote' || oid === 'adhoc') && design_id) {
      oid = uid()
      await run('INSERT INTO orders (id, tenant_id, design_id, balance_cents) VALUES (?,?,?,?)',
        oid, me(req).tenant_id, String(design_id), Number(amount_cents) || 0)
    }
    const pi = await createPaymentIntent(Number(amount_cents), { order_id: String(oid ?? 'adhoc'), tenant_id: me(req).tenant_id })
    res.json({ clientSecret: pi.client_secret, order_id: oid ?? null })
  } catch (e) {
    res.status(501).json({ error: (e as Error).message })
  }
}))

// Async errors from any wrapped handler land here as a clean 500.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] error:', (err as Error)?.message)
  if (!res.headersSent) res.status(500).json({ error: 'server error' })
})

const port = Number(process.env.PORT ?? 8787)
// Make sure the schema + migrations exist before we accept traffic.
initDb().then(() => {
  app.listen(port, () => console.log(`Blue Flame API listening on http://localhost:${port} (${dbKind})`))
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
