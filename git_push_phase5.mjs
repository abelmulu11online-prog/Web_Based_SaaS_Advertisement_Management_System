/**
 * git_push_phase5.mjs — Git init, stage, commit, and push for Phase 5.
 *
 * Run from project root:
 *   node git_push_phase5.mjs
 *
 * What it does:
 *  1. git init
 *  2. git remote add origin
 *  3. git checkout -b feature/phase-5-advertisement-system
 *  4. Verify .gitignore covers .env / node_modules / dist
 *  5. git add  (only legitimate source files)
 *  6. git status dry-run — print what will be committed
 *  7. git commit -m "feat: implement phase 5 advertisement system"
 *  8. git push -u origin feature/phase-5-advertisement-system
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT   = path.dirname(fileURLToPath(import.meta.url))
const REMOTE = 'https://github.com/abelmulu11online-prog/Web_Based_SaaS_Advertisement_Management_System.git'
const BRANCH = 'feature/phase-5-advertisement-system'

// ── Helper ────────────────────────────────────────────────────────────────────

function git(args, opts = {}) {
  const r = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,   // shell:false so quoted args are not re-split
    ...opts,
  })
  const out = (r.stdout || '').trim()
  const err = (r.stderr || '').trim()
  if (out) console.log(out)
  if (err) console.error(err)
  return { ok: r.status === 0, stdout: out, stderr: err, status: r.status }
}

function step(label) {
  console.log(`\n${'─'.repeat(62)}`)
  console.log(`▶  ${label}`)
  console.log('─'.repeat(62))
}

function die(msg) {
  console.error(`\n❌  ${msg}`)
  process.exit(1)
}

// ── 1. git init ───────────────────────────────────────────────────────────────

step('1. Initialise git repository')
const isRepo = existsSync(path.join(ROOT, '.git'))

if (isRepo) {
  console.log('Git repo already exists — skipping init.')
} else {
  const r = git(['init'])
  if (!r.ok) die('git init failed')
  console.log('✅ git init done')
}

// ── 2. Configure user (needed for commits in fresh repos) ─────────────────────

step('2. Ensure git user identity')
const nameCheck = git(['config', 'user.name'])
if (!nameCheck.stdout) {
  git(['config', 'user.email', 'abelmulu11@gmail.com'])
  git(['config', 'user.name',  'Abel Mulu'])
  console.log('Set default git user identity for this repo.')
} else {
  console.log(`Using existing identity: ${nameCheck.stdout}`)
}

// ── 3. Set remote ─────────────────────────────────────────────────────────────

step('3. Set remote origin')
const remoteList = git(['remote', '-v'])
if (remoteList.stdout.includes('origin')) {
  console.log('Remote origin already set — updating URL.')
  git(['remote', 'set-url', 'origin', REMOTE])
} else {
  const r = git(['remote', 'add', 'origin', REMOTE])
  if (!r.ok) die('git remote add failed')
}
git(['remote', '-v'])

// ── 4. Create / switch branch ─────────────────────────────────────────────────

step(`4. Create/switch to branch: ${BRANCH}`)
const branchList = git(['branch'])
if (branchList.stdout.includes(BRANCH.replace('feature/', ''))) {
  git(['checkout', BRANCH])
  console.log(`Switched to existing branch ${BRANCH}`)
} else {
  const r = git(['checkout', '-b', BRANCH])
  if (!r.ok) die(`git checkout -b ${BRANCH} failed`)
  console.log(`✅ Created and checked out ${BRANCH}`)
}

// ── 5. Verify .gitignore guards ───────────────────────────────────────────────

step('5. Verify .gitignore protections')
const gitignore = existsSync(path.join(ROOT, '.gitignore'))
  ? readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
  : ''

const required = ['.env', 'node_modules', 'dist']
for (const pattern of required) {
  if (gitignore.includes(pattern)) {
    console.log(`  ✅  ${pattern} — covered`)
  } else {
    console.warn(`  ⚠️   ${pattern} — NOT found in .gitignore!`)
  }
}

// Double-check nothing sensitive is staged by accident
// Run git add first so we can inspect what is actually tracked
const addPreCheck = git(['add', '.'])
if (!addPreCheck.ok) die('git add . failed')
git(['reset', 'HEAD', '--', 'backend/.env', 'frontend/.env'])

// Ask git what is now staged
const trackedCheck = git(['ls-files', '--cached'])
const tracked = trackedCheck.stdout.split('\n').filter(Boolean)

// Only flag actual secret .env files — .env.example templates are safe and intentional
const dangerous = tracked.filter(f => {
  const base = f.split('/').pop()
  return (
    base === '.env' ||
    base.match(/^\.env\.(local|production|staging|test)$/) ||
    f.includes('/node_modules/') ||
    f.includes('\\node_modules\\')
  )
})
if (dangerous.length > 0) {
  die(`Sensitive files detected in staging area:\n  ${dangerous.join('\n  ')}\nCheck .gitignore.`)
}
console.log('  ✅  No .env secrets or node_modules detected in staging area.')

// ── 6. Show what will be committed ───────────────────────────────────────────

step('6. Files to be committed (git status)')
git(['status', '--short'])

// Abort if nothing to commit
const statusCheck = git(['status', '--porcelain'])
if (!statusCheck.stdout.trim()) {
  console.log('\n⚠️  Nothing to commit — working tree is clean.')
  process.exit(0)
}

// ── 7. Commit ─────────────────────────────────────────────────────────────────

step('7. Commit')
const commit = git(['commit', '-m', 'feat: implement phase 5 advertisement system'])
if (!commit.ok) die('git commit failed — see output above.')
console.log('✅ Committed: "feat: implement phase 5 advertisement system"')

// Show the commit hash
git(['log', '--oneline', '-1'])

// ── 8. Push ───────────────────────────────────────────────────────────────────

step(`8. Push to origin/${BRANCH}`)
const push = git(['push', '-u', 'origin', BRANCH], { timeout: 120_000 })
if (!push.ok) {
  console.error('\n❌  Push failed. Common reasons:')
  console.error('   • Not authenticated — run:  git config credential.helper manager')
  console.error('     or set a Personal Access Token in Windows Credential Manager.')
  console.error('   • Remote repo does not exist at the URL above.')
  console.error('   • Network issue.')
  process.exit(1)
}

// ── 9. Summary ───────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(62))
console.log('  PUSH COMPLETE')
console.log('═'.repeat(62))
console.log(`  Repository : ${REMOTE}`)
console.log(`  Branch     : ${BRANCH}`)
git(['log', '--oneline', '-1'])
console.log('═'.repeat(62))
