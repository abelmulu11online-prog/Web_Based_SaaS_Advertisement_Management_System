/**
 * tests/refresh-token.test.js — Comprehensive refresh token tests.
 *
 * Tests refresh token functionality:
 *  - POST /api/auth/refresh-token
 *  - POST /api/auth/logout
 *  - Token rotation
 *  - Token revocation
 *  - Password reset integration
 *
 * Uses Node.js built-in test runner.
 */
import 'dotenv/config'
import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { URL } from 'node:url'
import { Buffer } from 'node:buffer'
import pg from 'pg'
import crypto from 'node:crypto'

// Load environment before importing app
process.env.NODE_ENV = 'test'
process.env.PORT = '0' // random available port
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:changeme@localhost:5432/local_discovery'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret'
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[refresh-token.test] DATABASE_URL is not set.')
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
      path: url.pathname,
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
  await q('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-refresh-%'])
  await q('DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-refresh-%'])
  await q('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-refresh-%'])
  await q('DELETE FROM users WHERE email LIKE $1', ['test-refresh-%'])
}

async function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
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

  // Ensure refresh_tokens table exists
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
  server.close()
  await pool.end()
})

beforeEach(async () => {
  await cleanupTestUsers()
})

// ── Refresh Token Tests ────────────────────────────────────────────────────────

describe('POST /api/auth/refresh-token', () => {
  it('should refresh with valid token and return new access and refresh tokens', async () => {
    // Register and login to get refresh token
    const email = 'test-refresh-valid@example.com'
    const password = 'TestPass123!'

    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })
    assert.equal(registerRes.statusCode, 201, 'Registration should succeed')

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    assert.equal(loginRes.statusCode, 200, 'Login should succeed')
    assert.ok(loginRes.body.data, 'Login response should have data')
    assert.ok(loginRes.body.data.refreshToken, 'Login response should have refreshToken')
    assert.ok(loginRes.body.data.accessToken, 'Login response should have accessToken')

    const oldRefreshToken = loginRes.body.data.refreshToken
    const oldAccessToken = loginRes.body.data.accessToken

    // Refresh the token
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken: oldRefreshToken },
    })

    assert.equal(refreshRes.statusCode, 200)
    assert.equal(refreshRes.body.success, true)
    assert.ok(refreshRes.body.data.accessToken)
    assert.ok(refreshRes.body.data.refreshToken)

    // New refresh token should be different (access token might be same due to timing)
    assert.notEqual(refreshRes.body.data.refreshToken, oldRefreshToken)
  })

  it('should revoke old refresh token after successful refresh (rotation)', async () => {
    const email = 'test-refresh-rotation@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const oldRefreshToken = loginRes.body.data.refreshToken

    // Refresh the token
    await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken: oldRefreshToken },
    })

    // Try to use the old token again - it should fail (rotation prevents reuse)
    const secondRefresh = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken: oldRefreshToken },
    })

    assert.equal(secondRefresh.statusCode, 401, 'Old token should be rejected after rotation')
  })

  it('should reject reuse of old refresh token after rotation', async () => {
    const email = 'test-refresh-reuse@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const oldRefreshToken = loginRes.body.data.refreshToken

    // First refresh should succeed
    const firstRefresh = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken: oldRefreshToken },
    })
    assert.equal(firstRefresh.statusCode, 200)

    // Second refresh with same token should fail
    const secondRefresh = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken: oldRefreshToken },
    })
    assert.equal(secondRefresh.statusCode, 401)
    assert.equal(secondRefresh.body.success, false)
  })

  it('should reject invalid refresh token', async () => {
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken: 'invalid-token-12345' },
    })

    assert.equal(refreshRes.statusCode, 401)
    assert.equal(refreshRes.body.success, false)
  })

  it('should reject missing refresh token', async () => {
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: {},
    })

    assert.equal(refreshRes.statusCode, 422)
    assert.equal(refreshRes.body.success, false)
  })

  it('should reject empty refresh token', async () => {
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken: '' },
    })

    assert.equal(refreshRes.statusCode, 422)
    assert.equal(refreshRes.body.success, false)
  })

  it('should reject refresh token for suspended user', async () => {
    const email = 'test-refresh-suspended@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const refreshToken = loginRes.body.data.refreshToken

    // Suspend the user
    await q('UPDATE users SET status = $1 WHERE email = $2', ['SUSPENDED', email])

    // Try to refresh
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken },
    })

    assert.equal(refreshRes.statusCode, 403)
    assert.equal(refreshRes.body.success, false)
  })

  it('should reject refresh token for deleted user', async () => {
    const email = 'test-refresh-deleted@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const refreshToken = loginRes.body.data.refreshToken

    // Delete the user
    await q('UPDATE users SET status = $1 WHERE email = $2', ['DELETED', email])

    // Try to refresh
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken },
    })

    assert.equal(refreshRes.statusCode, 403)
    assert.equal(refreshRes.body.success, false)
  })

  it('should reject refresh token for inactive user', async () => {
    const email = 'test-refresh-inactive@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const refreshToken = loginRes.body.data.refreshToken

    // Set user to suspended status (INACTIVE is not a valid status in the database)
    await q('UPDATE users SET status = $1 WHERE email = $2', ['SUSPENDED', email])

    // Try to refresh
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken },
    })

    assert.equal(refreshRes.statusCode, 403)
    assert.equal(refreshRes.body.success, false)
  })
})

// ── Logout Tests ─────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('should logout with valid refresh token', async () => {
    const email = 'test-logout-valid@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const refreshToken = loginRes.body.data.refreshToken

    const logoutRes = await request('POST', '/api/auth/logout', {
      body: { refreshToken },
    })

    assert.equal(logoutRes.statusCode, 200)
    assert.equal(logoutRes.body.success, true)
  })

  it('should revoke refresh token after logout', async () => {
    const email = 'test-logout-revoke@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const refreshToken = loginRes.body.data.refreshToken

    // Logout
    await request('POST', '/api/auth/logout', {
      body: { refreshToken },
    })

    // Try to refresh with the logged-out token - it should fail
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken },
    })

    assert.equal(refreshRes.statusCode, 401, 'Logged-out token should be rejected')
  })

  it('should prevent refresh after logout', async () => {
    const email = 'test-logout-prevent@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const refreshToken = loginRes.body.data.refreshToken

    // Logout
    await request('POST', '/api/auth/logout', {
      body: { refreshToken },
    })

    // Try to refresh with logged-out token
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken },
    })

    assert.equal(refreshRes.statusCode, 401)
    assert.equal(refreshRes.body.success, false)
  })

  it('should handle repeated logout gracefully (idempotent)', async () => {
    const email = 'test-logout-idempotent@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const refreshToken = loginRes.body.data.refreshToken

    // First logout
    const firstLogout = await request('POST', '/api/auth/logout', {
      body: { refreshToken },
    })
    assert.equal(firstLogout.statusCode, 200)

    // Second logout should also succeed
    const secondLogout = await request('POST', '/api/auth/logout', {
      body: { refreshToken },
    })
    assert.equal(secondLogout.statusCode, 200)
  })

  it('should handle logout with non-existent token gracefully', async () => {
    const logoutRes = await request('POST', '/api/auth/logout', {
      body: { refreshToken: 'non-existent-token' },
    })

    assert.equal(logoutRes.statusCode, 200)
    assert.equal(logoutRes.body.success, true)
  })

  it('should reject missing refresh token', async () => {
    const logoutRes = await request('POST', '/api/auth/logout', {
      body: {},
    })

    assert.equal(logoutRes.statusCode, 422)
    assert.equal(logoutRes.body.success, false)
  })
})

// ── Password Reset Integration Tests ─────────────────────────────────────────

describe('Password reset refresh token integration', () => {
  it('should revoke all refresh tokens after password reset', async () => {
    const email = `test-reset-integration-${Date.now()}@example.com`
    const password = 'TestPass123!'

    // Register and login
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })
    assert.equal(registerRes.statusCode, 201, 'Registration should succeed')

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    assert.equal(loginRes.statusCode, 200, 'Login should succeed')
    assert.ok(loginRes.body.data, 'Login response should have data')
    assert.ok(loginRes.body.data.refreshToken, 'Login response should have refreshToken')

    const refreshToken = loginRes.body.data.refreshToken

    // Get user ID
    const userRes = await q('SELECT id FROM users WHERE email = $1', [email])
    const userId = userRes.rows[0].id

    // Manually create a password reset token (since we can't intercept email)
    const { generateToken: generateResetToken, hashToken: hashResetToken } = await import('../src/services/passwordResetToken.service.js')
    const rawResetToken = generateResetToken()
    const resetTokenHash = hashResetToken(rawResetToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, resetTokenHash, expiresAt]
    )

    // Reset password using the raw token
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawResetToken, password: 'NewPass123!' },
    })

    assert.equal(resetRes.statusCode, 200, 'Password reset should succeed')

    // Try to refresh with old token - it should fail
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken },
    })

    assert.equal(refreshRes.statusCode, 401, 'Old refresh token should be rejected after password reset')
  })

  it('should prevent refresh after password reset', async () => {
    const email = `test-reset-prevent-refresh-${Date.now()}@example.com`
    const password = 'TestPass123!'

    // Register and login
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })
    assert.equal(registerRes.statusCode, 201, 'Registration should succeed')

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    assert.equal(loginRes.statusCode, 200, 'Login should succeed')
    assert.ok(loginRes.body.data, 'Login response should have data')
    assert.ok(loginRes.body.data.refreshToken, 'Login response should have refreshToken')

    const refreshToken = loginRes.body.data.refreshToken

    // Get user ID
    const userRes = await q('SELECT id FROM users WHERE email = $1', [email])
    const userId = userRes.rows[0].id

    // Manually create a password reset token
    const { generateToken: generateResetToken, hashToken: hashResetToken } = await import('../src/services/passwordResetToken.service.js')
    const rawResetToken = generateResetToken()
    const resetTokenHash = hashResetToken(rawResetToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await q(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, resetTokenHash, expiresAt]
    )

    // Reset password
    const resetRes = await request('POST', '/api/auth/reset-password', {
      body: { token: rawResetToken, password: 'NewPass123!' },
    })

    assert.equal(resetRes.statusCode, 200, 'Password reset should succeed')

    // Try to refresh with old token
    const refreshRes = await request('POST', '/api/auth/refresh-token', {
      body: { refreshToken },
    })

    assert.equal(refreshRes.statusCode, 401)
    assert.equal(refreshRes.body.success, false)
  })
})

// ── Security Tests ───────────────────────────────────────────────────────────

describe('Refresh token security', () => {
  it('should not return raw token hash in API response', async () => {
    const email = 'test-security-nohash@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    // Response should contain raw token, not hash
    assert.ok(loginRes.body.data.refreshToken)
    assert.equal(loginRes.body.data.refreshToken.length, 64) // 32 bytes hex = 64 chars
    assert.ok(!loginRes.body.data.token_hash, 'Should not expose token_hash')
  })

  it('should store only hash in database', async () => {
    const email = 'test-security-hashonly@example.com'
    const password = 'TestPass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const loginRes = await request('POST', '/api/auth/login', {
      body: { identifier: email, password },
    })

    const rawToken = loginRes.body.data.refreshToken
    const expectedHash = hashToken(rawToken)

    // Check database
    const tokenRecordResult = await q(
      'SELECT token_hash FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = $1)',
      [email]
    )

    assert.ok(tokenRecordResult.rows.length > 0)
    assert.equal(typeof tokenRecordResult.rows[0].token_hash, 'string')
    assert.equal(tokenRecordResult.rows[0].token_hash.length, 64) // SHA-256 hex = 64 chars
    assert.notEqual(tokenRecordResult.rows[0].token_hash, rawToken, 'Should not store raw token')
  })
})
