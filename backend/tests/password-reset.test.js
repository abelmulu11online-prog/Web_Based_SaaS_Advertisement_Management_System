/**
 * tests/password-reset.test.js — Password reset workflow tests.
 *
 * Tests password reset token generation, validation, and API endpoints.
 * Uses Node.js built-in test runner with mocked email service.
 */
import 'dotenv/config'
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { URL } from 'node:url'
import { Buffer } from 'node:buffer'
import pg from 'pg'

// Load environment before importing app
process.env.NODE_ENV = 'test'
process.env.PORT = '0' // random available port
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:changeme@localhost:5432/local_discovery'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret'
process.env.EMAIL_VERIFICATION_EXPIRES_IN = '24h'
process.env.PASSWORD_RESET_EXPIRES_IN = '1h'
process.env.FRONTEND_URL = 'http://localhost:5173'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[password-reset.test] DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DATABASE_URL })

// ── Helpers ───────────────────────────────────────────────────────────────────

function request(method, path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        const body = data ? JSON.parse(data) : null
        resolve({ statusCode: res.statusCode, headers: res.headers, body })
      })
    })

    req.on('error', reject)

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body))
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

async function q(sql, params = []) {
  return pool.query(sql, params)
}

async function cleanupTestUsers() {
  await q('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-pw-reset-%'])
  await q('DELETE FROM users WHERE email LIKE $1', ['test-pw-reset-%'])
}

// ── Setup/Teardown ───────────────────────────────────────────────────────────

before(async () => {
  // Start server on random port
  server = http.createServer(app)
  await new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address()
      baseUrl = `http://localhost:${port}`
      resolve()
    })
  })

  // Ensure database is ready
  await q('SELECT 1')

  // Ensure refresh_tokens table exists for login tests
  await q(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Create indexes
  await q('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash)')
  await q('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id)')
})

after(async () => {
  await cleanupTestUsers()
  await pool.end()
  server.close()
})

beforeEach(async () => {
  await cleanupTestUsers()
})

// ── Forgot Password Endpoint ──────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('returns safe success response for existing email', async () => {
    const email = 'test-pw-reset-existing@example.com'
    const password = 'SecurePass123!'

    // Register user
    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Request password reset
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      body: { email },
    })

    assert.strictEqual(forgotRes.statusCode, 200)
    assert.strictEqual(forgotRes.body.success, true)
    assert.ok(forgotRes.body.message.includes('password reset email'))
  })

  it('returns same safe response for non-existent email (enumeration protection)', async () => {
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      body: { email: 'nonexistent@example.com' },
    })

    assert.strictEqual(forgotRes.statusCode, 200)
    assert.strictEqual(forgotRes.body.success, true)
    assert.ok(forgotRes.body.message.includes('password reset email'))
  })

  it('generates and stores password reset token for existing account', async () => {
    const email = 'test-pw-reset-token@example.com'
    const password = 'SecurePass123!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Request password reset
    await request('POST', '/api/auth/forgot-password', {
      body: { email },
    })

    // Check that reset token was created
    const tokenResult = await q(
      'SELECT * FROM password_reset_tokens WHERE user_id = $1',
      [registerRes.body.data.id],
    )

    assert.strictEqual(tokenResult.rows.length, 1)
    assert.ok(tokenResult.rows[0].token_hash)
    assert.ok(tokenResult.rows[0].expires_at)
    assert.strictEqual(tokenResult.rows[0].used_at, null)
  })

  it('stores token hash, not raw token', async () => {
    const email = 'test-pw-reset-hash@example.com'
    const password = 'SecurePass123!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Request password reset
    await request('POST', '/api/auth/forgot-password', {
      body: { email },
    })

    const tokenResult = await q(
      'SELECT token_hash FROM password_reset_tokens WHERE user_id = $1',
      [registerRes.body.data.id],
    )

    assert.strictEqual(tokenResult.rows.length, 1)
    const tokenHash = tokenResult.rows[0].token_hash

    // Token hash should be a 64-character hex string (SHA-256)
    assert.strictEqual(tokenHash.length, 64)
    assert.ok(/^[a-f0-9]{64}$/.test(tokenHash))
  })

  it('invalidates previous tokens when requesting new reset', async () => {
    const email = 'test-pw-reset-invalidate@example.com'
    const password = 'SecurePass123!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // First reset request
    await request('POST', '/api/auth/forgot-password', {
      body: { email },
    })

    // Second reset request
    await request('POST', '/api/auth/forgot-password', {
      body: { email },
    })

    // Check that exactly one unused token remains after second request
    const remainingTokens = await q(
      'SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [registerRes.body.data.id],
    )
    assert.strictEqual(parseInt(remainingTokens.rows[0].count, 10), 1, 'Second reset should leave exactly one unused token')
  })

  it('does not generate token for deleted account', async () => {
    const email = 'test-pw-reset-deleted@example.com'
    const password = 'SecurePass123!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Delete account
    await q('UPDATE users SET status = $1 WHERE id = $2', ['DELETED', registerRes.body.data.id])

    // Request password reset
    await request('POST', '/api/auth/forgot-password', {
      body: { email },
    })

    // Check that no reset token was created
    const tokenResult = await q(
      'SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1',
      [registerRes.body.data.id],
    )

    assert.strictEqual(parseInt(tokenResult.rows[0].count, 10), 0)
  })

  it('rejects invalid email format with 422', async () => {
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      body: { email: 'invalid-email' },
    })

    assert.strictEqual(forgotRes.statusCode, 422)
    assert.strictEqual(forgotRes.body.error.code, 'VALIDATION_ERROR')
  })

  it('rejects missing email with 422', async () => {
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      body: {},
    })

    assert.strictEqual(forgotRes.statusCode, 422)
    assert.strictEqual(forgotRes.body.error.code, 'VALIDATION_ERROR')
  })
})

// ── Reset Password Endpoint ───────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  let userId
  let rawToken

  beforeEach(async () => {
    // Create a test user
    const email = 'test-pw-reset-endpoint@example.com'
    const password = 'SecurePass123!'
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })
    userId = registerRes.body.data.id

    // Create a reset token directly in database for testing
    // Use the actual token hashing function to ensure consistency
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    rawToken = 'test-reset-token-123'
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt],
    )
  })

  it('resets password with valid token', async () => {
    try {
      const newPassword = 'NewSecurePass456!'

      const resetRes = await request('POST', '/api/auth/reset-password', {
        body: { token: rawToken, password: newPassword },
      })

      assert.strictEqual(resetRes.statusCode, 200)
      assert.strictEqual(resetRes.body.success, true)
      assert.strictEqual(resetRes.body.message, 'Password reset successfully')

      // Check database - password should be updated
      const userResult = await q(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId],
      )
      assert.strictEqual(userResult.rows.length, 1)
      assert.ok(userResult.rows[0].password_hash)

      // Check token is marked as used
      const tokenResult = await q(
        'SELECT used_at FROM password_reset_tokens WHERE user_id = $1',
        [userId],
      )
      assert.strictEqual(tokenResult.rows.length, 1)
      assert.ok(tokenResult.rows[0].used_at)
    } catch (err) {
      console.error('FULL ERROR STACK TRACE:', err)
      throw err
    }
  })

  it('rejects missing token with 422', async () => {
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { password: 'NewSecurePass456!' },
    })

    assert.strictEqual(resetRes.statusCode, 422)
    assert.strictEqual(resetRes.body.error.code, 'VALIDATION_ERROR')
  })

  it('rejects missing password with 422', async () => {
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken },
    })

    assert.strictEqual(resetRes.statusCode, 422)
    assert.strictEqual(resetRes.body.error.code, 'VALIDATION_ERROR')
  })

  it('rejects weak password with 422', async () => {
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken, password: 'weak' },
    })

    assert.strictEqual(resetRes.statusCode, 422)
    assert.strictEqual(resetRes.body.error.code, 'VALIDATION_ERROR')
  })

  it('rejects invalid token with 400', async () => {
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: 'invalid-token', password: 'NewSecurePass456!' },
    })

    assert.strictEqual(resetRes.statusCode, 400)
    assert.strictEqual(resetRes.body.error.code, 'INVALID_TOKEN')
  })

  it('rejects already-used token with 400', async () => {
    // First use
    await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken, password: 'NewSecurePass456!' },
    })

    // Create another token for second attempt
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const rawToken2 = 'test-reset-token-456'
    const tokenHash2 = hashToken(rawToken2)
    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash2, new Date(Date.now() + 60 * 60 * 1000)],
    )

    // Mark it as used
    await q('UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1', [tokenHash2])

    // Second use attempt
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken2, password: 'AnotherSecurePass789!' },
    })

    assert.strictEqual(resetRes.statusCode, 400)
    assert.strictEqual(resetRes.body.error.code, 'TOKEN_ALREADY_USED')
  })

  it('rejects expired token with 400', async () => {
    // Create an expired token
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const expiredToken = 'expired-reset-token'
    const tokenHash = hashToken(expiredToken)
    const expiresAt = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt],
    )

    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: expiredToken, password: 'NewSecurePass456!' },
    })

    assert.strictEqual(resetRes.statusCode, 400)
    assert.strictEqual(resetRes.body.error.code, 'TOKEN_EXPIRED')
  })

  it('invalidates all other unused tokens after successful reset', async () => {
    // Create multiple unused tokens
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const token1 = 'reset-token-1'
    const token2 = 'reset-token-2'
    const token3 = 'reset-token-3'
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, hashToken(token1), expiresAt],
    )
    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, hashToken(token2), expiresAt],
    )
    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, hashToken(token3), expiresAt],
    )

    // Use token1 to reset password
    await request('POST', '/api/auth/reset-password', {
      body: { token: token1, password: 'NewSecurePass456!' },
    })

    // Check that all other tokens are invalidated
    const unusedTokens = await q(
      'SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [userId],
    )

    assert.strictEqual(parseInt(unusedTokens.rows[0].count, 10), 0)
  })
})

// ── Token Security ─────────────────────────────────────────────────────────────

describe('Password Reset Token Security', () => {
  it('generates cryptographically secure tokens', async () => {
    const { generateToken } = await import('../src/services/passwordResetToken.service.js')
    
    const token1 = generateToken()
    const token2 = generateToken()

    // Tokens should be different
    assert.notStrictEqual(token1, token2)

    // Tokens should be 64 hex characters (32 bytes)
    assert.strictEqual(token1.length, 64)
    assert.ok(/^[a-f0-9]{64}$/.test(token1))
  })

  it('hashes tokens consistently', async () => {
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    
    const token = 'test-reset-token-123'
    const hash1 = hashToken(token)
    const hash2 = hashToken(token)

    assert.strictEqual(hash1, hash2)
    assert.strictEqual(hash1.length, 64)
    assert.ok(/^[a-f0-9]{64}$/.test(hash1))
  })

  it('hash is different from raw token', async () => {
    const { generateToken, hashToken } = await import('../src/services/passwordResetToken.service.js')
    
    const token = generateToken()
    const hash = hashToken(token)

    assert.notStrictEqual(token, hash)
  })

  it('calculates expiration correctly', async () => {
    const { calculateExpiration } = await import('../src/services/passwordResetToken.service.js')
    
    const expiresAt = calculateExpiration()
    const now = new Date()

    assert.ok(expiresAt > now)
    
    // Should be approximately 1 hour in the future
    const diffMs = expiresAt - now
    const diffHours = diffMs / (1000 * 60 * 60)
    assert.ok(diffHours >= 0.9 && diffHours <= 1.1)
  })

  it('detects expired tokens', async () => {
    const { isTokenExpired } = await import('../src/services/passwordResetToken.service.js')
    
    const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    assert.strictEqual(isTokenExpired(pastDate), true)
    assert.strictEqual(isTokenExpired(futureDate), false)
  })

  it('detects used tokens', async () => {
    const { isTokenUsed } = await import('../src/services/passwordResetToken.service.js')
    
    assert.strictEqual(isTokenUsed(null), false)
    assert.strictEqual(isTokenUsed(new Date()), true)
  })
})

// ── Password Authentication Regression ────────────────────────────────────────

describe('Password Authentication Regression', () => {
  it('old password is rejected after reset', async () => {
    const email = 'test-pw-reset-regression@example.com'
    const oldPassword = 'OldSecurePass123!'
    const newPassword = 'NewSecurePass456!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password: oldPassword },
    })

    // Create reset token
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const rawToken = 'test-regression-token'
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [registerRes.body.data.id, tokenHash, expiresAt],
    )

    // Reset password
    await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken, password: newPassword },
    })

    // Try to login with old password
    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password: oldPassword },
    })

    assert.strictEqual(loginRes.statusCode, 401)
    assert.strictEqual(loginRes.body.error.code, 'INVALID_CREDENTIALS')
  })

  it('new password is accepted after reset', async () => {
    const email = 'test-pw-reset-newpass@example.com'
    const oldPassword = 'OldSecurePass123!'
    const newPassword = 'NewSecurePass456!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password: oldPassword },
    })

    assert.strictEqual(registerRes.statusCode, 201, 'Registration should succeed')

    // Create reset token
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const rawToken = 'test-newpass-token'
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [registerRes.body.data.id, tokenHash, expiresAt],
    )

    // Reset password
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken, password: newPassword },
    })

    assert.strictEqual(resetRes.statusCode, 200, 'Password reset should succeed')

    // Try to login with new password
    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password: newPassword },
    })

    assert.strictEqual(loginRes.statusCode, 200, 'Login with new password should succeed')
    assert.strictEqual(loginRes.body.success, true)
    assert.ok(loginRes.body.data.accessToken)
  })
})

// ── Account Security ───────────────────────────────────────────────────────────

describe('Account Security', () => {
  it('deleted account cannot reset password', async () => {
    const email = 'test-pw-reset-security-del@example.com'
    const password = 'SecurePass123!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Delete account
    await q('UPDATE users SET status = $1 WHERE id = $2', ['DELETED', registerRes.body.data.id])

    // Create reset token
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const rawToken = 'test-deleted-token'
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [registerRes.body.data.id, tokenHash, expiresAt],
    )

    // Try to reset password
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken, password: 'NewSecurePass456!' },
    })

    assert.strictEqual(resetRes.statusCode, 403)
    assert.strictEqual(resetRes.body.error.code, 'ACCOUNT_DELETED')
  })

  it('suspended account can reset password (project policy)', async () => {
    const email = 'test-pw-reset-security-susp@example.com'
    const password = 'SecurePass123!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Suspend account
    await q('UPDATE users SET status = $1 WHERE id = $2', ['SUSPENDED', registerRes.body.data.id])

    // Create reset token
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const rawToken = 'test-suspended-token'
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [registerRes.body.data.id, tokenHash, expiresAt],
    )

    // Try to reset password
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken, password: 'NewSecurePass456!' },
    })

    // Should succeed - suspended accounts can reset password to regain access
    assert.strictEqual(resetRes.statusCode, 200)
    assert.strictEqual(resetRes.body.success, true)
  })
})

// ── Cross-Flow Testing ─────────────────────────────────────────────────────────

describe('Cross-Flow Integration', () => {
  it('login → reset → login with new password', async () => {
    const email = 'test-pw-reset-crossflow@example.com'
    const password = 'InitialPass123!'
    const newPassword = 'ResetPass456!'

    // Register
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })
    assert.strictEqual(registerRes.statusCode, 201)

    // Login with initial password
    const loginRes1 = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })
    assert.strictEqual(loginRes1.statusCode, 200)

    // Request password reset
    await request('POST', '/api/auth/forgot-password', {
      body: { email },
    })

    // Get the reset token from database
    const tokenResult = await q(
      'SELECT token_hash FROM password_reset_tokens WHERE user_id = $1',
      [registerRes.body.data.id],
    )
    assert.strictEqual(tokenResult.rows.length, 1)

    // For testing, use a known token with proper hashing
    const { hashToken } = await import('../src/services/passwordResetToken.service.js')
    const rawToken = 'test-crossflow-token'
    const tokenHash = hashToken(rawToken)
    await q(
      'UPDATE password_reset_tokens SET token_hash = $1 WHERE user_id = $2',
      [tokenHash, registerRes.body.data.id],
    )

    // Reset password
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawToken, password: newPassword },
    })
    assert.strictEqual(resetRes.statusCode, 200)

    // Login with new password
    const loginRes2 = await request('POST', '/api/auth/login', {
      body: { identifier: email, password: newPassword },
    })
    assert.strictEqual(loginRes2.statusCode, 200)
    assert.strictEqual(loginRes2.body.success, true)

    // Old password should not work
    const loginRes3 = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })
    assert.strictEqual(loginRes3.statusCode, 401)
  })
})
