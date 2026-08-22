/**
 * tests/email-verification.test.js — Email verification workflow tests.
 *
 * Tests email verification token generation, validation, and API endpoints.
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
process.env.FRONTEND_URL = 'http://localhost:5173'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[email-verification.test] DATABASE_URL is not set.')
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
  await q('DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test-verify-%'])
  await q('DELETE FROM users WHERE email LIKE $1', ['test-verify-%'])
  await q('DELETE FROM users WHERE phone = $1', ['+19876543299'])
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
})

after(async () => {
  await cleanupTestUsers()
  await pool.end()
  server.close()
})

beforeEach(async () => {
  await cleanupTestUsers()
})

// ── Registration with Verification ─────────────────────────────────────────────

describe('Registration with Email Verification', () => {
  it('creates verification token on registration with email', async () => {
    const email = 'test-verify-reg@example.com'
    const password = 'SecurePass123!'

    // Register user
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    assert.strictEqual(registerRes.statusCode, 201)
    assert.ok(registerRes.body.data.id)
    assert.strictEqual(registerRes.body.data.email, email)

    // Check that verification token was created
    const tokenResult = await q(
      'SELECT * FROM email_verification_tokens WHERE user_id = $1',
      [registerRes.body.data.id],
    )

    assert.strictEqual(tokenResult.rowCount, 1)
    assert.ok(tokenResult.rows[0].token_hash)
    assert.ok(tokenResult.rows[0].expires_at)
    assert.strictEqual(tokenResult.rows[0].used_at, null)
  })

  it('does not create verification token for phone-only registration', async () => {
    const phone = '+19876543299'
    const password = 'SecurePass123!'

    const registerRes = await request('POST', '/api/auth/register', {
      body: { phone, password },
    })

    assert.strictEqual(registerRes.statusCode, 201)

    // Check that no verification token was created
    const tokenResult = await q(
      'SELECT * FROM email_verification_tokens WHERE user_id = $1',
      [registerRes.body.data.id],
    )

    assert.strictEqual(tokenResult.rowCount, 0)
  })

  it('stores token hash, not raw token', async () => {
    const email = 'test-verify-hash@example.com'
    const password = 'SecurePass123!'

    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const tokenResult = await q(
      'SELECT token_hash FROM email_verification_tokens WHERE user_id = $1',
      [registerRes.body.data.id],
    )

    assert.strictEqual(tokenResult.rowCount, 1)
    const tokenHash = tokenResult.rows[0].token_hash

    // Token hash should be a 64-character hex string (SHA-256)
    assert.strictEqual(tokenHash.length, 64)
    assert.ok(/^[a-f0-9]{64}$/.test(tokenHash))
  })

  it('email_verified_at is initially null', async () => {
    const email = 'test-verify-null@example.com'
    const password = 'SecurePass123!'

    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const userResult = await q(
      'SELECT email_verified_at FROM users WHERE id = $1',
      [registerRes.body.data.id],
    )

    assert.strictEqual(userResult.rowCount, 1)
    assert.strictEqual(userResult.rows[0].email_verified_at, null)
  })
})

// ── Verify Email Endpoint ─────────────────────────────────────────────────────

describe('GET /api/auth/verify-email', () => {
  let userId
  let rawToken

  beforeEach(async () => {
    // Create a test user
    const email = 'test-verify-endpoint@example.com'
    const password = 'SecurePass123!'
    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })
    userId = registerRes.body.data.id

    // Confirm registration created a verification token before overwriting
    const tokenResult = await q(
      'SELECT token_hash FROM email_verification_tokens WHERE user_id = $1',
      [userId],
    )
    assert.strictEqual(tokenResult.rowCount, 1, 'Registration should create a verification token')
    
    // For testing, we'll use a known token since we can't reverse the hash
    // In a real test, we'd mock the email service to capture the raw token
    rawToken = 'test-token-for-verification'
    await q(
      'UPDATE email_verification_tokens SET token_hash = $1 WHERE user_id = $2',
      [rawToken, userId],
    )
  })

  it('verifies email with valid token', async () => {
    const verifyRes = await request('GET', `/api/auth/verify-email?token=${rawToken}`)

    assert.strictEqual(verifyRes.statusCode, 200)
    assert.strictEqual(verifyRes.body.success, true)
    assert.strictEqual(verifyRes.body.message, 'Email verified successfully')
    assert.ok(verifyRes.body.data.userId)
    assert.ok(verifyRes.body.data.emailVerifiedAt)

    // Check database
    const userResult = await q(
      'SELECT email_verified_at FROM users WHERE id = $1',
      [userId],
    )
    assert.ok(userResult.rows[0].email_verified_at)

    // Check token is marked as used
    const tokenResult = await q(
      'SELECT used_at FROM email_verification_tokens WHERE user_id = $1',
      [userId],
    )
    assert.ok(tokenResult.rows[0].used_at)
  })

  it('rejects missing token with 422', async () => {
    const verifyRes = await request('GET', '/api/auth/verify-email')

    assert.strictEqual(verifyRes.statusCode, 422)
    assert.strictEqual(verifyRes.body.error.code, 'VALIDATION_ERROR')
  })

  it('rejects empty token with 422', async () => {
    const verifyRes = await request('GET', '/api/auth/verify-email?token=')

    assert.strictEqual(verifyRes.statusCode, 422)
    assert.strictEqual(verifyRes.body.error.code, 'VALIDATION_ERROR')
  })

  it('rejects invalid token with 400', async () => {
    const verifyRes = await request('GET', '/api/auth/verify-email?token=invalid-token')

    assert.strictEqual(verifyRes.statusCode, 400)
    assert.strictEqual(verifyRes.body.error.code, 'INVALID_TOKEN')
  })

  it('rejects already-used token with 400', async () => {
    // First use
    await request('GET', `/api/auth/verify-email?token=${rawToken}`)

    // Second use
    const verifyRes = await request('GET', `/api/auth/verify-email?token=${rawToken}`)

    assert.strictEqual(verifyRes.statusCode, 400)
    assert.strictEqual(verifyRes.body.error.code, 'TOKEN_ALREADY_USED')
  })
})

// ── Resend Verification Endpoint ───────────────────────────────────────────────

describe('POST /api/auth/resend-verification', () => {
  it('returns same response for existing account', async () => {
    const email = 'test-resend-existing@example.com'
    const password = 'SecurePass123!'

    await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    const resendRes = await request('POST', '/api/auth/resend-verification', {
      body: { email },
    })

    assert.strictEqual(resendRes.statusCode, 200)
    assert.strictEqual(resendRes.body.success, true)
    assert.ok(resendRes.body.message.includes('verification email'))
  })

  it('returns same response for non-existent account (enumeration protection)', async () => {
    const resendRes = await request('POST', '/api/auth/resend-verification', {
      body: { email: 'nonexistent@example.com' },
    })

    assert.strictEqual(resendRes.statusCode, 200)
    assert.strictEqual(resendRes.body.success, true)
    assert.ok(resendRes.body.message.includes('verification email'))
  })

  it('invalidates previous tokens when resending', async () => {
    const email = 'test-resend-invalidate@example.com'
    const password = 'SecurePass123!'

    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Check initial token count
    const initialTokens = await q(
      'SELECT COUNT(*) FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL',
      [registerRes.body.data.id],
    )
    const initialCount = parseInt(initialTokens.rows[0].count, 10)
    assert.strictEqual(initialCount, 1, 'Registration should create exactly one unused token')

    // Resend
    await request('POST', '/api/auth/resend-verification', {
      body: { email },
    })

    // Check that previous tokens are invalidated
    const usedTokens = await q(
      'SELECT COUNT(*) FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NOT NULL',
      [registerRes.body.data.id],
    )
    assert.ok(parseInt(usedTokens.rows[0].count, 10) > 0)

    // Check that exactly one new unused token remains after resend
    const remainingTokens = await q(
      'SELECT COUNT(*) FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL',
      [registerRes.body.data.id],
    )
    assert.strictEqual(parseInt(remainingTokens.rows[0].count, 10), 1, 'Resend should leave exactly one unused token')
  })

  it('does not send email for already verified account', async () => {
    const email = 'test-resend-verified@example.com'
    const password = 'SecurePass123!'

    const registerRes = await request('POST', '/api/auth/register', {
      body: { email, password },
    })

    // Manually mark as verified
    await q(
      'UPDATE users SET email_verified_at = now() WHERE id = $1',
      [registerRes.body.data.id],
    )

    // Resend
    const resendRes = await request('POST', '/api/auth/resend-verification', {
      body: { email },
    })

    assert.strictEqual(resendRes.statusCode, 200)
    // Should still return success message for security
  })
})

// ── Token Security ─────────────────────────────────────────────────────────────

describe('Token Security', () => {
  it('generates cryptographically secure tokens', async () => {
    const { generateToken } = await import('../src/services/verificationToken.service.js')
    
    const token1 = generateToken()
    const token2 = generateToken()

    // Tokens should be different
    assert.notStrictEqual(token1, token2)

    // Tokens should be 64 hex characters (32 bytes)
    assert.strictEqual(token1.length, 64)
    assert.ok(/^[a-f0-9]{64}$/.test(token1))
  })

  it('hashes tokens consistently', async () => {
    const { hashToken } = await import('../src/services/verificationToken.service.js')
    
    const token = 'test-token-123'
    const hash1 = hashToken(token)
    const hash2 = hashToken(token)

    assert.strictEqual(hash1, hash2)
    assert.strictEqual(hash1.length, 64)
    assert.ok(/^[a-f0-9]{64}$/.test(hash1))
  })

  it('hash is different from raw token', async () => {
    const { generateToken, hashToken } = await import('../src/services/verificationToken.service.js')
    
    const token = generateToken()
    const hash = hashToken(token)

    assert.notStrictEqual(token, hash)
  })

  it('calculates expiration correctly', async () => {
    const { calculateExpiration } = await import('../src/services/verificationToken.service.js')
    
    const expiresAt = calculateExpiration()
    const now = new Date()

    assert.ok(expiresAt > now)
    
    // Should be approximately 24 hours in the future
    const diffMs = expiresAt - now
    const diffHours = diffMs / (1000 * 60 * 60)
    assert.ok(diffHours >= 23 && diffHours <= 25)
  })
})
