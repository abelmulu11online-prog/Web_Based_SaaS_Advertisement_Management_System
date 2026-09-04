// check_tables.mjs
import { config } from 'dotenv'
import pg from 'pg'

config({ path: './backend/.env' })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const r = await pool.query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name
`)
console.log('EXISTING TABLES:')
r.rows.forEach(row => console.log(' -', row.table_name))

const needed = ['profile_reviews', 'user_subscriptions', 'subscription_plans']
for (const t of needed) {
  const exists = r.rows.some(row => row.table_name === t)
  console.log(t + ':', exists ? 'EXISTS ✓' : 'MISSING ✗')
}

await pool.end()
