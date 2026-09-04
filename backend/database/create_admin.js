/**
 * database/create_admin.js
 * Creates the admin user: nathy / natnaelzemene21@gmail.com
 * Password: Admin@123
 *
 * Usage: node database/create_admin.js
 */

import 'dotenv/config'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function createAdmin() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const email = 'natnaelzemene21@gmail.com'
    const plainPassword = 'Admin@123'
    const passwordHash = await bcrypt.hash(plainPassword, 12)

    // Upsert user with ADMIN role
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'ADMIN', 'ACTIVE')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role          = 'ADMIN',
             status        = 'ACTIVE'
       RETURNING id, email, role`,
      [email, passwordHash],
    )

    const user = rows[0]
    console.log(`[admin] User: ${user.email} | role: ${user.role} | id: ${user.id}`)

    // Upsert profile (display_name = Nathy, slug = nathy)
    await client.query(
      `INSERT INTO profiles (user_id, display_name, slug, is_published, is_verified)
       VALUES ($1, 'Nathy', 'nathy', TRUE, TRUE)
       ON CONFLICT (user_id) DO UPDATE
         SET display_name = 'Nathy',
             is_verified  = TRUE`,
      [user.id],
    )

    console.log('[admin] Profile set: display_name=Nathy, slug=nathy')

    await client.query('COMMIT')
    console.log('[admin] Admin user created successfully.')
    console.log('[admin] Login credentials:')
    console.log(`        Email   : ${email}`)
    console.log(`        Password: ${plainPassword}`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[admin] Failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

createAdmin().catch((err) => {
  console.error('[admin] Fatal:', err.message)
  process.exit(1)
})
