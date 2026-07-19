import pg from 'pg'

// Postgres pool. Set DATABASE_URL (see .env.example). Works with any managed
// Postgres — Neon, Supabase, Railway, RDS — or a local instance.
const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false }
})

export const q = (text: string, params?: unknown[]) => pool.query(text, params)
