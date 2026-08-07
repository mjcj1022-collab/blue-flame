import { run, get, uid, initDb } from './db.js'
import { hashPassword } from './auth.js'

// Seeds a Blue Flame tenant and the two demo users. Safe to re-run.
async function seed() {
  await initDb()
  let tenant = await get<{ id: string }>('SELECT id FROM tenants WHERE slug = ?', 'blue-flame')
  if (!tenant) {
    const id = uid()
    await run('INSERT INTO tenants (id, name, slug) VALUES (?,?,?)', id, 'Blue Flame', 'blue-flame')
    tenant = { id }
  }

  for (const [email, pw, role] of [['mike', 'mike123', 'admin'], ['liliya', 'liliya123', 'associate']] as const) {
    const exists = await get('SELECT id FROM users WHERE tenant_id = ? AND email = ?', tenant.id, email)
    if (!exists) {
      await run('INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES (?,?,?,?,?)',
        uid(), tenant.id, email, hashPassword(pw), role)
      console.log(`seeded user ${email} (${role})`)
    }
  }
  console.log('Seed complete. Tenant:', tenant.id)
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
