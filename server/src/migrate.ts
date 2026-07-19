import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { q, pool } from './db.js'

// Applies schema.sql. Run once after setting DATABASE_URL: `npm run migrate`.
const schemaPath = fileURLToPath(new URL('../schema.sql', import.meta.url))
const sql = readFileSync(schemaPath, 'utf8')

await q(sql)
console.log('Blue Flame schema applied.')
await pool.end()
