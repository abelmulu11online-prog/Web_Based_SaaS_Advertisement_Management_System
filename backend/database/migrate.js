/**
 * database/migrate.js — Lightweight SQL migration runner.
 *
 * How it works:
 *  1. Creates a `schema_migrations` table if it doesn't exist.
 *  2. Reads all *.sql files from the migrations/ directory, sorted by name.
 *  3. Skips migrations already recorded in `schema_migrations`.
 *  4. Runs each pending migration in a transaction.
 *  5. Records successful migrations so they are never run again.
 *
 * Usage:
 *   node database/migrate.js           — run all pending migrations
 *   node database/migrate.js --status  — list applied / pending migrations
 */

import 'dotenv/config'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Database connection ───────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('[migrate] DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL      PRIMARY KEY,
      filename    TEXT        NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

async function getAppliedMigrations(client) {
  const result = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY id',
  )
  return new Set(result.rows.map((r) => r.filename))
}

function getMigrationFiles() {
  const dir = path.join(__dirname, 'migrations')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort() // lexicographic — relies on numeric prefix (001_, 002_, ...)
    .map((f) => ({ filename: f, filepath: path.join(dir, f) }))
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function runMigrations() {
  const client = await pool.connect()

  try {
    await ensureMigrationsTable(client)
    const applied = await getAppliedMigrations(client)
    const files = getMigrationFiles()

    const pending = files.filter((f) => !applied.has(f.filename))

    if (pending.length === 0) {
      console.log('[migrate] No pending migrations. Database is up to date.')
      return
    }

    console.log(`[migrate] Running ${pending.length} pending migration(s)...`)

    for (const { filename, filepath } of pending) {
      const sql = fs.readFileSync(filepath, 'utf8')

      console.log(`[migrate]   → ${filename}`)

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename],
        )
        await client.query('COMMIT')
        console.log(`[migrate]   ✓ ${filename}`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`[migrate]   ✗ ${filename} — FAILED`)
        console.error(`[migrate]   Error: ${err.message}`)
        process.exit(1)
      }
    }

    console.log('[migrate] All migrations applied successfully.')
  } finally {
    client.release()
    await pool.end()
  }
}

async function showStatus() {
  const client = await pool.connect()

  try {
    await ensureMigrationsTable(client)
    const applied = await getAppliedMigrations(client)
    const files = getMigrationFiles()

    console.log('\nMigration Status:')
    console.log('─'.repeat(60))

    if (files.length === 0) {
      console.log('  No migration files found in database/migrations/')
    }

    for (const { filename } of files) {
      const status = applied.has(filename) ? '✓ applied' : '○ pending'
      console.log(`  ${status}  ${filename}`)
    }

    console.log('─'.repeat(60))
    console.log(
      `  ${applied.size} applied, ${files.length - applied.size} pending\n`,
    )
  } finally {
    client.release()
    await pool.end()
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

if (args.includes('--status')) {
  showStatus().catch((err) => {
    console.error('[migrate] Fatal:', err.message)
    process.exit(1)
  })
} else {
  runMigrations().catch((err) => {
    console.error('[migrate] Fatal:', err.message)
    process.exit(1)
  })
}
