/**
 * run_phase5.mjs — Phase 5 verification runner.
 *
 * Run from the project root:
 *   node run_phase5.mjs
 *
 * Requires: backend/.env with DATABASE_URL set.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND   = path.join(__dirname, 'backend')
const ENV_FILE  = path.join(BACKEND, '.env')

// ── Load backend/.env manually (dotenv not available at root) ────────────────
if (existsSync(ENV_FILE)) {
  const lines = readFileSync(ENV_FILE, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
  console.log(`✅ Loaded backend/.env`)
} else {
  console.log(`⚠️  No backend/.env found — will use existing environment variables.`)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(label, args, opts = {}) {
  console.log(`\n${'─'.repeat(62)}`)
  console.log(`▶  ${label}`)
  console.log('─'.repeat(62))

  const result = spawnSync(process.execPath, args, {
    cwd: BACKEND,
    encoding: 'utf8',
    env: { ...process.env },
    timeout: opts.timeout || 60_000,
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error)  console.error('Spawn error:', result.error.message)

  const ok = result.status === 0
  console.log(`\n${ok ? '✅ PASS' : '❌ FAIL'} — ${label}`)
  return ok
}

// ── Pre-flight ────────────────────────────────────────────────────────────────

console.log('\n🔍  Pre-flight checks...')

// 1. node_modules
const nodeModulesOk = existsSync(path.join(BACKEND, 'node_modules', 'pg', 'package.json'))
console.log(`   node_modules/pg : ${nodeModulesOk ? '✅ present' : '❌ missing — run npm install in backend/'}`)

// 2. DATABASE_URL
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error(`
❌  DATABASE_URL is not set.

Steps to fix:
  1. Copy  backend/.env.example  →  backend/.env
  2. Edit  backend/.env  and set:
       DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
  3. Ensure PostgreSQL is running and the database exists.
  4. Re-run:  node run_phase5.mjs
`)
  process.exit(1)
}

const safeUrl = dbUrl.replace(/:([^:@]+)@/, ':***@')
console.log(`   DATABASE_URL    : ${safeUrl}`)

if (!nodeModulesOk) {
  console.error('\n❌  node_modules missing. Run:  cd backend && npm install')
  process.exit(1)
}

// ── Run steps ─────────────────────────────────────────────────────────────────

const results = {}

// Step 1: Migration
results.migration = run(
  'Database migration  (node database/migrate.js)',
  ['database/migrate.js'],
)

// Step 2: Seed (only if migration passed)
if (results.migration) {
  results.seed = run(
    'Database seed  (node database/seed.js)',
    ['database/seed.js'],
  )
} else {
  console.log('\n⏭   Skipping seed — migration failed.')
  results.seed = false
}

// Step 3: Phase 5 advertisement tests
results.adTests = run(
  'Phase 5 advertisement tests  (tests/advertisements.test.js)',
  ['--test', '--test-concurrency=1', 'tests/advertisements.test.js'],
  { timeout: 120_000 },
)

// Step 4: Full backend test suite
const allTestFiles = [
  'tests/auth.test.js',
  'tests/auth-api.test.js',
  'tests/profile.test.js',
  'tests/email-verification.test.js',
  'tests/password-reset.test.js',
  'tests/refresh-token.test.js',
  'tests/schema.test.js',
  'tests/security.test.js',
  'tests/api.test.js',
  'tests/advertisements.test.js',
].filter(f => existsSync(path.join(BACKEND, f)))

results.fullTests = run(
  `Full backend test suite  (${allTestFiles.length} files)`,
  ['--test', '--test-concurrency=1', ...allTestFiles],
  { timeout: 300_000 },
)

// ── Frontend build ────────────────────────────────────────────────────────────

const FRONTEND = path.join(__dirname, 'frontend')
const viteBin  = path.join(FRONTEND, 'node_modules', '.bin', 'vite')
const viteCmd  = existsSync(viteBin + '.cmd') ? viteBin + '.cmd'
               : existsSync(viteBin)          ? viteBin
               : null

if (viteCmd) {
  console.log(`\n${'─'.repeat(62)}`)
  console.log('▶  Frontend build  (vite build)')
  console.log('─'.repeat(62))

  const fbResult = spawnSync(viteCmd, ['build'], {
    cwd: FRONTEND,
    encoding: 'utf8',
    shell: false,
    timeout: 120_000,
  })

  if (fbResult.stdout) process.stdout.write(fbResult.stdout)
  if (fbResult.stderr) process.stderr.write(fbResult.stderr)

  results.frontend = fbResult.status === 0
  console.log(`\n${results.frontend ? '✅ PASS' : '❌ FAIL'} — Frontend build`)
} else {
  console.log('\n⚠️   Vite not found in frontend/node_modules — skipping frontend build.')
  console.log('     Run:  cd frontend && npm install  then retry.')
  results.frontend = null
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(62))
console.log('  PHASE 5 VERIFICATION SUMMARY')
console.log('═'.repeat(62))
console.log(`  Database migration   : ${results.migration  ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  Database seed        : ${results.seed       ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  Backend deps         : ✅ PASS  (node_modules present)`)
console.log(`  Advertisement tests  : ${results.adTests    ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  Full backend tests   : ${results.fullTests  ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  Frontend build       : ${
  results.frontend === null ? '⏭  SKIPPED (run npm install in frontend/)' :
  results.frontend           ? '✅ PASS' : '❌ FAIL'
}`)
console.log('═'.repeat(62))

const critical = [results.migration, results.seed, results.adTests, results.fullTests]
const allCriticalPassed = critical.every(Boolean)

if (!allCriticalPassed) {
  console.log('\n⚠️   One or more critical steps failed. Check output above for details.')
  process.exit(1)
} else {
  console.log('\n🎉  All critical Phase 5 verification steps passed.')
}
