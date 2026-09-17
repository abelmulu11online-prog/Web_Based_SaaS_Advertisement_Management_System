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

    const admins = [
      { email: 'natnaelzemene21@gmail.com', name: 'Nathy', slug: 'nathy' },
      { email: 'abelmulu88@gmail.com', name: 'Abel', slug: 'abel' },
    ]
    const plainPassword = 'Admin@123'
    const passwordHash = await bcrypt.hash(plainPassword, 12)

    for (const adm of admins) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, role, status, email_verified_at)
         VALUES ($1, $2, 'ADMIN', 'ACTIVE', NOW())
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               role          = 'ADMIN',
               status        = 'ACTIVE',
               email_verified_at = COALESCE(users.email_verified_at, NOW())
         RETURNING id, email, role`,
        [adm.email, passwordHash],
      )

      const user = rows[0]
      console.log(`[admin] User: ${user.email} | role: ${user.role} | id: ${user.id}`)

      await client.query(
        `INSERT INTO profiles (user_id, display_name, slug, is_published, is_verified)
         VALUES ($1, $2, $3, TRUE, TRUE)
         ON CONFLICT (user_id) DO UPDATE
           SET display_name = $2,
               is_verified  = TRUE`,
        [user.id, adm.name, adm.slug],
      )
    }

    await client.query('COMMIT')
    console.log('[admin] Admin users created/updated successfully.')
    console.log('[admin] Login credentials:')
    for (const adm of admins) {
      console.log(`        Email   : ${adm.email}`)
    }
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
