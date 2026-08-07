import { createClient, type Client, type InValue } from '@libsql/client'

/**
 * Database layer on libSQL (SQLite-compatible). In production it points at a
 * hosted Turso database so accounts, orders and subscriptions PERSIST across
 * deploys and restarts — the free tier the shop runs on has an ephemeral disk,
 * so the data can't live in a local file. Locally (no Turso env) it falls back
 * to a plain SQLite file, so `npm run dev` needs nothing set up.
 *
 * Env:
 *   TURSO_DATABASE_URL   libsql://<db>.turso.io   (prod — persistent)
 *   TURSO_AUTH_TOKEN     the database token
 *   DB_FILE              local file path when Turso isn't set (default blueflame.db)
 */
const url = process.env.TURSO_DATABASE_URL || `file:${process.env.DB_FILE ?? 'blueflame.db'}`
const authToken = process.env.TURSO_AUTH_TOKEN
export const dbKind = process.env.TURSO_DATABASE_URL ? 'libsql-turso' : 'libsql-file'
export const client: Client = createClient(authToken ? { url, authToken } : { url })

/** undefined isn't a valid bound value; SQLite uses NULL. */
const norm = (v: unknown): InValue => (v === undefined ? null : v) as InValue

/** Run a write; returns the affected-row count as `.changes` (mirrors the old API). */
export async function run(sql: string, ...args: unknown[]): Promise<{ changes: number }> {
  const r = await client.execute({ sql, args: args.map(norm) })
  return { changes: Number(r.rowsAffected) }
}

/** libSQL rows are array-like; turn them into plain, JSON-safe objects keyed by column. */
function toObjects(cols: string[], rows: unknown[]): Record<string, unknown>[] {
  return (rows as Record<string, unknown>[]).map(row => {
    const o: Record<string, unknown> = {}
    cols.forEach((c, i) => { o[c] = (row as unknown as unknown[])[i] })
    return o
  })
}

/** First matching row, or undefined. */
export async function get<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T | undefined> {
  const r = await client.execute({ sql, args: args.map(norm) })
  return (toObjects(r.columns, r.rows)[0] as unknown as T) ?? undefined
}

/** All matching rows. */
export async function all<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]> {
  const r = await client.execute({ sql, args: args.map(norm) })
  return toObjects(r.columns, r.rows) as unknown as T[]
}

/** Run a multi-statement SQL script (schema, migrations). */
export async function exec(sql: string): Promise<void> { await client.executeMultiple(sql) }

export const uid = (): string => globalThis.crypto.randomUUID()

/**
 * Append to the audit log. Fire-and-forget with its own catch so a logging
 * failure never breaks the request it's recording — callers don't await it.
 */
export function audit(tenantId: string, actorId: string | null, action: string, target?: string | null, detail?: unknown): void {
  run('INSERT INTO audit_log (tenant_id, actor_id, action, target, detail) VALUES (?,?,?,?,?)',
    tenantId, actorId ?? null, action, target ?? null, detail ? JSON.stringify(detail) : null).catch(() => { /* logging is best-effort */ })
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tenants (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    markup real NOT NULL DEFAULT 1.35,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'associate',
    created_at text NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, email)
  );
  CREATE TABLE IF NOT EXISTS designs (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    owner_id text,
    name text NOT NULL,
    spec text NOT NULL,
    parent_id text,
    created_at text NOT NULL DEFAULT (datetime('now')),
    updated_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS quotes (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    design_id text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    total_cents integer NOT NULL,
    breakdown text NOT NULL,
    expires_at text,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    design_id text NOT NULL,
    quote_id text,
    stage text NOT NULL DEFAULT 'designed',
    approved_at text,
    stripe_payment_intent text,
    deposit_cents integer,
    balance_cents integer,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id integer PRIMARY KEY AUTOINCREMENT,
    tenant_id text NOT NULL,
    actor_id text,
    action text NOT NULL,
    target text,
    detail text,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS customers (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    notes text,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers (tenant_id);
  CREATE TABLE IF NOT EXISTS gallery (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    title text NOT NULL,
    subtitle text,
    image text NOT NULL,
    spec text,
    created_by text,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_gallery_tenant ON gallery (tenant_id);
  CREATE TABLE IF NOT EXISTS sculpts (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    owner_id text,
    name text NOT NULL,
    tags text,
    data text NOT NULL,
    updated_at text NOT NULL DEFAULT (datetime('now')),
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sculpts_tenant ON sculpts (tenant_id);

  -- Affiliate / referral program. Each affiliate has a unique link code and its
  -- own commission rate (a fraction, e.g. 0.2 = 20%), settable per link.
  CREATE TABLE IF NOT EXISTS affiliates (
    id text PRIMARY KEY,
    owner_tenant_id text NOT NULL,          -- the shop that runs this affiliate program
    code text UNIQUE NOT NULL,              -- the per-individual ?ref= code in the link
    name text,
    email text,
    rate real NOT NULL DEFAULT 0.2,
    active integer NOT NULL DEFAULT 1,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_affiliates_owner ON affiliates (owner_tenant_id);

  -- One row per commission-earning payment by a referred customer. source_id is
  -- the Stripe session/invoice id, uniquely constrained so a re-delivered webhook
  -- can't double-credit.
  CREATE TABLE IF NOT EXISTS commissions (
    id text PRIMARY KEY,
    affiliate_id text NOT NULL,
    tenant_id text,
    kind text NOT NULL,                     -- 'subscription' | 'offline'
    gross_cents integer NOT NULL,
    rate real NOT NULL,                     -- the affiliate's rate at time of sale
    commission_cents integer NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending' | 'paid'
    source_id text UNIQUE,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_commissions_aff ON commissions (affiliate_id);
`

// Additive columns applied to existing databases. Each is guarded so re-running
// against an up-to-date schema is a no-op.
const MIGRATIONS = [
  'ALTER TABLE orders ADD COLUMN customer_id text',
  "ALTER TABLE tenants ADD COLUMN subscription_status text NOT NULL DEFAULT 'none'",
  'ALTER TABLE tenants ADD COLUMN subscription_plan text',
  'ALTER TABLE tenants ADD COLUMN current_period_end integer',
  'ALTER TABLE tenants ADD COLUMN stripe_customer_id text',
  'ALTER TABLE tenants ADD COLUMN stripe_subscription_id text',
  'ALTER TABLE tenants ADD COLUMN offline_purchase integer NOT NULL DEFAULT 0',
  'ALTER TABLE tenants ADD COLUMN referred_by text',   // affiliate id that referred this shop
]

let ready: Promise<void> | null = null
/** Create the schema and apply migrations. Idempotent; awaited once at startup. */
export function initDb(): Promise<void> {
  if (!ready) ready = (async () => {
    await exec(SCHEMA)
    for (const m of MIGRATIONS) { try { await client.execute(m) } catch { /* column already exists */ } }
  })()
  return ready
}
