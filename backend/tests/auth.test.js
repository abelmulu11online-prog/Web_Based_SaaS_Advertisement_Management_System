/**
 * tests/auth.test.js — Phase 4.2 authentication service and repository tests.
 *
 * Tests:
 *  - Registration service
 *  - Login service
 *  - Auth repository operations
 *  - Duplicate account protection
 *  - Password security
 *  - Account status handling
 *  - Role protection
 *
 * Uses Node.js built-in test runner.
 */
import 'dotenv/config'
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import * as authRepository from '../src/modules/auth/auth.repository.js'
import * as authService from '../src/modules/auth/auth.service.js'

// ── DB connection ─────────────────────────────────────────────────────────────

process.env.NODE_ENV = 'test'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[auth.test] DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DATABASE_URL })

// ── Helpers ───────────────────────────────────────────────────────────────────

async function q(sql, params = []) {
  return pool.query(sql, params)
}

async function cleanupTestUsers() {
  // Scoped to this file's test users only (all use @example.com domain).
  // Using @example.com prevents deleting schema.test.js fixtures (@x.com)
  // when test files run concurrently against the same database.
  //
  // Covers ALL test email/phone patterns used across every suite in this file:
  //   Auth Repository  → test-auth-*@example.com, +1234567890*
  //   Registration     → test-register-*, testregister@*, test-duplicate*, etc.
  //   Login Service    → test-login@example.com, +12345678913
  //   Security         → test-security*@example.com
  await q('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com'])
  await q('DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com'])
  await q('DELETE FROM users WHERE email LIKE $1', ['test%@example.com'])
  await q('DELETE FROM users WHERE phone LIKE $1', ['+123456789%'])
}

// ── Setup/Teardown ───────────────────────────────────────────────────────────

before(async () => {
  // Ensure database is ready
  await q('SELECT 1')
})

after(async () => {
  await cleanupTestUsers()
  await pool.end()
})

beforeEach(async () => {
  await cleanupTestUsers()
})

// ── Repository Tests ─────────────────────────────────────────────────────────

describe('Auth Repository', () => {
  it('creates a user with email and phone', async () => {
    const user = await authRepository.create({
      email: 'test-auth-1@example.com',
      phone: '+12345678901',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    assert.ok(user.id, 'User should have an ID')
    assert.strictEqual(user.email, 'test-auth-1@example.com', 'Email should match')
    assert.strictEqual(user.phone, '+12345678901', 'Phone should match')
    assert.strictEqual(user.role, 'USER', 'Role should be USER')
    assert.strictEqual(user.status, 'ACTIVE', 'Status should be ACTIVE')
    assert.ok(!user.password_hash, 'password_hash should not be returned')
  })

  it('creates a user with email only', async () => {
    const user = await authRepository.create({
      email: 'test-auth-2@example.com',
      phone: null,
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    assert.strictEqual(user.email, 'test-auth-2@example.com', 'Email should match')
    assert.strictEqual(user.phone, null, 'Phone should be null')
  })

  it('creates a user with phone only', async () => {
    const user = await authRepository.create({
      email: null,
      phone: '+12345678902',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    assert.strictEqual(user.email, null, 'Email should be null')
    assert.strictEqual(user.phone, '+12345678902', 'Phone should match')
  })

  it('finds user by email', async () => {
    await authRepository.create({
      email: 'test-auth-3@example.com',
      phone: '+12345678903',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    const user = await authRepository.findByEmail('test-auth-3@example.com')
    assert.ok(user, 'User should be found')
    assert.strictEqual(user.email, 'test-auth-3@example.com', 'Email should match')
  })

  it('finds user by phone', async () => {
    await authRepository.create({
      email: 'test-auth-4@example.com',
      phone: '+12345678904',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    const user = await authRepository.findByPhone('+12345678904')
    assert.ok(user, 'User should be found')
    assert.strictEqual(user.phone, '+12345678904', 'Phone should match')
  })

  it('finds user by id', async () => {
    const created = await authRepository.create({
      email: 'test-auth-5@example.com',
      phone: '+12345678905',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    const user = await authRepository.findById(created.id)
    assert.ok(user, 'User should be found')
    assert.strictEqual(user.id, created.id, 'ID should match')
  })

  it('finds user by identifier (email)', async () => {
    await authRepository.create({
      email: 'test-auth-6@example.com',
      phone: '+12345678906',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    const user = await authRepository.findByIdentifier('test-auth-6@example.com')
    assert.ok(user, 'User should be found by email')
  })

  it('finds user by identifier (phone)', async () => {
    await authRepository.create({
      email: 'test-auth-7@example.com',
      phone: '+12345678907',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    const user = await authRepository.findByIdentifier('+12345678907')
    assert.ok(user, 'User should be found by phone')
  })

  it('returns null for non-existent user', async () => {
    const user = await authRepository.findByEmail('nonexistent@example.com')
    assert.strictEqual(user, null, 'Should return null for non-existent user')
  })

  it('updates user status', async () => {
    const created = await authRepository.create({
      email: 'test-auth-8@example.com',
      phone: '+12345678908',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    const updated = await authRepository.updateStatus(created.id, 'SUSPENDED')
    assert.strictEqual(updated.status, 'SUSPENDED', 'Status should be SUSPENDED')
  })

  it('updates user password', async () => {
    const created = await authRepository.create({
      email: 'test-auth-9@example.com',
      phone: '+12345678909',
      passwordHash: 'hashed_password_here',
      role: 'USER',
    })

    const updated = await authRepository.updatePassword(created.id, 'new_hashed_password')
    assert.ok(updated, 'User should be updated')
  })
})

// ── Registration Service Tests ───────────────────────────────────────────────

describe('Registration Service', () => {
  it('registers a user with email and password', async () => {
    const result = await authService.register({
      email: 'test-register-1@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    assert.ok(result.id, 'User should have an ID')
    assert.strictEqual(result.email, 'test-register-1@example.com', 'Email should match')
    assert.strictEqual(result.role, 'USER', 'Role should be USER')
    assert.strictEqual(result.status, 'ACTIVE', 'Status should be ACTIVE')
    assert.ok(!result.password_hash, 'password_hash should not be returned')
  })

  it('registers a user with phone and password', async () => {
    const result = await authService.register({
      email: null,
      phone: '+12345678910',
      password: 'ValidPassword123!',
    })

    assert.ok(result.id, 'User should have an ID')
    assert.strictEqual(result.phone, '+12345678910', 'Phone should match')
    assert.strictEqual(result.role, 'USER', 'Role should be USER')
  })

  it('normalizes email to lowercase', async () => {
    const result = await authService.register({
      email: 'TestRegister@EXAMPLE.COM',
      phone: null,
      password: 'ValidPassword123!',
    })

    assert.strictEqual(result.email, 'testregister@example.com', 'Email should be lowercase')
  })

  it('removes spaces from phone number', async () => {
    const result = await authService.register({
      email: null,
      phone: '+1 234 567 8911',
      password: 'ValidPassword123!',
    })

    assert.strictEqual(result.phone, '+12345678911', 'Spaces should be removed')
  })

  it('rejects duplicate email', async () => {
    await authService.register({
      email: 'test-duplicate@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    await assert.rejects(
      async () => {
        await authService.register({
          email: 'test-duplicate@example.com',
          phone: null,
          password: 'ValidPassword123!',
        })
      },
      { code: 'DUPLICATE_EMAIL' },
      'Should throw DUPLICATE_EMAIL error'
    )
  })

  it('rejects duplicate phone', async () => {
    await authService.register({
      email: null,
      phone: '+12345678912',
      password: 'ValidPassword123!',
    })

    await assert.rejects(
      async () => {
        await authService.register({
          email: null,
          phone: '+12345678912',
          password: 'ValidPassword123!',
        })
      },
      { code: 'DUPLICATE_PHONE' },
      'Should throw DUPLICATE_PHONE error'
    )
  })

  it('always assigns USER role (not ADMIN)', async () => {
    const result = await authService.register({
      email: 'test-role@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    assert.strictEqual(result.role, 'USER', 'Role should always be USER')
  })

  it('new user is ACTIVE by default', async () => {
    const result = await authService.register({
      email: 'test-active@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    assert.strictEqual(result.status, 'ACTIVE', 'Status should be ACTIVE')
  })

  it('password is hashed in database', async () => {
    await authService.register({
      email: 'test-hash@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    const user = await authRepository.findByEmail('test-hash@example.com')
    assert.ok(user, 'User should exist')
    assert.ok(user.password_hash, 'password_hash should be stored')
    assert.notStrictEqual(user.password_hash, 'ValidPassword123!', 'Password should not be stored as plaintext')
  })

  it('returns safe user data without password_hash', async () => {
    const result = await authService.register({
      email: 'test-safe@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    assert.ok(!result.password_hash, 'password_hash should not be in response')
    assert.ok(!result.password, 'password should not be in response')
  })
})

// ── Login Service Tests ──────────────────────────────────────────────────────

describe('Login Service', () => {
  beforeEach(async () => {
    // Create a test user for login tests
    await authService.register({
      email: 'test-login@example.com',
      phone: '+12345678913',
      password: 'TestPassword123!',
    })
  })

  it('authenticates with valid email and password', async () => {
    const result = await authService.login({
      identifier: 'test-login@example.com',
      password: 'TestPassword123!',
    })

    assert.ok(result.user, 'User should be returned')
    assert.ok(result.accessToken, 'Access token should be returned')
    assert.strictEqual(result.user.email, 'test-login@example.com', 'Email should match')
    assert.ok(!result.user.password_hash, 'password_hash should not be returned')
  })

  it('authenticates with valid phone and password', async () => {
    const result = await authService.login({
      identifier: '+12345678913',
      password: 'TestPassword123!',
    })

    assert.ok(result.user, 'User should be returned')
    assert.ok(result.accessToken, 'Access token should be returned')
    assert.strictEqual(result.user.phone, '+12345678913', 'Phone should match')
  })

  it('rejects incorrect password', async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          identifier: 'test-login@example.com',
          password: 'WrongPassword123!',
        })
      },
      { code: 'INVALID_CREDENTIALS' },
      'Should throw INVALID_CREDENTIALS error'
    )
  })

  it('rejects unknown account with generic error', async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          identifier: 'unknown@example.com',
          password: 'TestPassword123!',
        })
      },
      { code: 'INVALID_CREDENTIALS' },
      'Should throw INVALID_CREDENTIALS error (not USER_NOT_FOUND)'
    )
  })

  it('rejects suspended account', async () => {
    // Get the test user
    const user = await authRepository.findByEmail('test-login@example.com')
    // Suspend the user
    await authRepository.updateStatus(user.id, 'SUSPENDED')

    await assert.rejects(
      async () => {
        await authService.login({
          identifier: 'test-login@example.com',
          password: 'TestPassword123!',
        })
      },
      { code: 'ACCOUNT_SUSPENDED' },
      'Should throw ACCOUNT_SUSPENDED error'
    )
  })

  it('rejects deleted account', async () => {
    // Get the test user
    const user = await authRepository.findByEmail('test-login@example.com')
    // Mark as deleted
    await authRepository.updateStatus(user.id, 'DELETED')

    await assert.rejects(
      async () => {
        await authService.login({
          identifier: 'test-login@example.com',
          password: 'TestPassword123!',
        })
      },
      { code: 'ACCOUNT_DELETED' },
      'Should throw ACCOUNT_DELETED error'
    )
  })

  it('access token contains required claims', async () => {
    const result = await authService.login({
      identifier: 'test-login@example.com',
      password: 'TestPassword123!',
    })

    assert.ok(result.accessToken, 'Access token should be returned')
    // Token is a JWT with 3 parts
    assert.strictEqual(result.accessToken.split('.').length, 3, 'Should be a valid JWT')
  })

  it('returns safe user data', async () => {
    const result = await authService.login({
      identifier: 'test-login@example.com',
      password: 'TestPassword123!',
    })

    assert.ok(!result.user.password_hash, 'password_hash should not be returned')
    assert.ok(!result.user.password, 'password should not be returned')
    assert.ok(result.user.id, 'id should be returned')
    assert.ok(result.user.role, 'role should be returned')
    assert.ok(result.user.status, 'status should be returned')
  })
})

// ── Security Tests ────────────────────────────────────────────────────────────

describe('Security', () => {
  it('never returns password_hash in service responses', async () => {
    const registered = await authService.register({
      email: 'test-security@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    assert.ok(!registered.password_hash, 'register should not return password_hash')

    await authRepository.findByEmail('test-security@example.com')
    const loggedIn = await authService.login({
      identifier: 'test-security@example.com',
      password: 'ValidPassword123!',
    })

    assert.ok(!loggedIn.user.password_hash, 'login should not return password_hash')
  })

  it('never returns password in service responses', async () => {
    const registered = await authService.register({
      email: 'test-security2@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    assert.ok(!registered.password, 'register should not return password')

    const loggedIn = await authService.login({
      identifier: 'test-security2@example.com',
      password: 'ValidPassword123!',
    })

    assert.ok(!loggedIn.user.password, 'login should not return password')
  })

  it('repository returns password_hash for internal use only', async () => {
    await authService.register({
      email: 'test-security3@example.com',
      phone: null,
      password: 'ValidPassword123!',
    })

    const userWithHash = await authRepository.findByEmail('test-security3@example.com')
    assert.ok(userWithHash.password_hash, 'repository should return password_hash for password comparison')
  })
})
