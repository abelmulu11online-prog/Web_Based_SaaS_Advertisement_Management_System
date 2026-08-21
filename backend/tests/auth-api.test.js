/**
 * tests/auth-api.test.js — Phase 4.3 API-level authentication tests.
 *
 * Tests HTTP endpoints for authentication:
 *  - POST /api/auth/register
 *  - POST /api/auth/login
 *  - POST /api/auth/logout (501 Not Implemented)
 *  - POST /api/auth/refresh-token (501 Not Implemented)
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

// Load environment before importing app
process.env.NODE_ENV = 'test'
process.env.PORT = '0' // random available port
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:changeme@localhost:5432/local_discovery'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[auth-api.test] DATABASE_URL is not set.')
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
  await q('DELETE FROM users WHERE email LIKE $1', ['test-api-auth-%'])
  await q('DELETE FROM users WHERE phone LIKE $1', ['+1987654%'])
  await q('DELETE FROM users WHERE phone = $1', ['01234567890'])
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
  await new Promise((resolve) => server.close(resolve))
})

beforeEach(async () => {
  await cleanupTestUsers()
})

// ── Registration API Tests ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registers with email and returns 201', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        email: 'test-api-auth-1@example.com',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 201, 'Should return 201 Created')
    assert.strictEqual(response.body.success, true, 'Should return success: true')
    assert.strictEqual(response.body.message, 'Account created successfully', 'Should have correct message')
    assert.ok(response.body.data, 'Should have data')
    assert.ok(response.body.data.id, 'Should have user ID')
    assert.strictEqual(response.body.data.email, 'test-api-auth-1@example.com', 'Email should match')
    assert.strictEqual(response.body.data.role, 'USER', 'Role should be USER')
    assert.strictEqual(response.body.data.status, 'ACTIVE', 'Status should be ACTIVE')
    assert.ok(!response.body.data.password, 'Should not return password')
    assert.ok(!response.body.data.password_hash, 'Should not return password_hash')
  })

  it('registers with phone and returns 201', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        phone: '+19876543210',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 201, 'Should return 201 Created')
    assert.strictEqual(response.body.success, true, 'Should return success: true')
    assert.strictEqual(response.body.data.phone, '+19876543210', 'Phone should match')
    assert.strictEqual(response.body.data.role, 'USER', 'Role should be USER')
  })

  it('rejects missing email and phone with 422', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 422, 'Should return 422 Unprocessable Entity')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR code')
  })

  it('rejects weak password with 422', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        email: 'test-api-auth-2@example.com',
        password: 'weak',
      },
    })

    assert.strictEqual(response.statusCode, 422, 'Should return 422 Unprocessable Entity')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR', 'Should have VALIDATION_ERROR code')
  })

  it('rejects invalid email format with 422', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        email: 'invalid-email',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 422, 'Should return 422 Unprocessable Entity')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
  })

  it('rejects invalid phone format with 422', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        phone: '01234567890',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 422, 'Should return 422 Unprocessable Entity')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
  })

  it('rejects duplicate email with 409', async () => {
    // First registration
    await request('POST', '/api/auth/register', {
      body: {
        email: 'test-api-auth-dup@example.com',
        password: 'ValidPassword123!',
      },
    })

    // Duplicate registration
    const response = await request('POST', '/api/auth/register', {
      body: {
        email: 'test-api-auth-dup@example.com',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 409, 'Should return 409 Conflict')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'DUPLICATE_EMAIL', 'Should have DUPLICATE_EMAIL code')
  })

  it('rejects duplicate phone with 409', async () => {
    // First registration
    await request('POST', '/api/auth/register', {
      body: {
        phone: '+19876543211',
        password: 'ValidPassword123!',
      },
    })

    // Duplicate registration
    const response = await request('POST', '/api/auth/register', {
      body: {
        phone: '+19876543211',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 409, 'Should return 409 Conflict')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'DUPLICATE_PHONE', 'Should have DUPLICATE_PHONE code')
  })

  it('ignores client-provided role field', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        email: 'test-api-auth-3@example.com',
        password: 'ValidPassword123!',
        role: 'ADMIN',
      },
    })

    assert.strictEqual(response.statusCode, 422, 'Should return 422 - role field rejected')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
  })

  it('normalizes email to lowercase', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        email: 'TestAPIAuth@EXAMPLE.COM',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 201, 'Should return 201 Created')
    assert.strictEqual(response.body.data.email, 'testapiauth@example.com', 'Email should be lowercase')
  })

  it('removes spaces from phone number', async () => {
    const response = await request('POST', '/api/auth/register', {
      body: {
        phone: '+1 987 654 3212',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 201, 'Should return 201 Created')
    assert.strictEqual(response.body.data.phone, '+19876543212', 'Spaces should be removed')
  })
})

// ── Login API Tests ─────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Create a test user for login tests
    await request('POST', '/api/auth/register', {
      body: {
        email: 'test-api-login@example.com',
        phone: '+19876543213',
        password: 'ValidPassword123!',
      },
    })
  })

  it('authenticates with valid email and returns 200', async () => {
    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'test-api-login@example.com',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 200, 'Should return 200 OK')
    assert.strictEqual(response.body.success, true, 'Should return success: true')
    assert.strictEqual(response.body.message, 'Login successful', 'Should have correct message')
    assert.ok(response.body.data, 'Should have data')
    assert.ok(response.body.data.user, 'Should have user object')
    assert.ok(response.body.data.accessToken, 'Should have access token')
    assert.strictEqual(response.body.data.user.email, 'test-api-login@example.com', 'Email should match')
    assert.ok(!response.body.data.user.password, 'Should not return password')
    assert.ok(!response.body.data.user.password_hash, 'Should not return password_hash')
  })

  it('authenticates with valid phone and returns 200', async () => {
    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: '+19876543213',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 200, 'Should return 200 OK')
    assert.strictEqual(response.body.data.user.phone, '+19876543213', 'Phone should match')
  })

  it('rejects incorrect password with 401', async () => {
    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'test-api-login@example.com',
        password: 'WrongPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 401, 'Should return 401 Unauthorized')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'INVALID_CREDENTIALS', 'Should have INVALID_CREDENTIALS code')
  })

  it('rejects unknown account with generic 401', async () => {
    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'unknown@example.com',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 401, 'Should return 401 Unauthorized')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'INVALID_CREDENTIALS', 'Should have INVALID_CREDENTIALS code')
  })

  it('rejects missing identifier with 422', async () => {
    const response = await request('POST', '/api/auth/login', {
      body: {
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 422, 'Should return 422 Unprocessable Entity')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
  })

  it('rejects missing password with 422', async () => {
    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'test-api-login@example.com',
      },
    })

    assert.strictEqual(response.statusCode, 422, 'Should return 422 Unprocessable Entity')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
  })

  it('returns valid JWT access token', async () => {
    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'test-api-login@example.com',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 200, 'Should return 200 OK')
    const token = response.body.data.accessToken
    assert.strictEqual(token.split('.').length, 3, 'Should be a valid JWT (3 parts)')
  })

  it('rejects suspended account with 403', async () => {
    // Suspend the test user
    const user = await q('SELECT id FROM users WHERE email = $1', ['test-api-login@example.com'])
    await q('UPDATE users SET status = $1 WHERE id = $2', ['SUSPENDED', user.rows[0].id])

    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'test-api-login@example.com',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 403, 'Should return 403 Forbidden')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'ACCOUNT_SUSPENDED', 'Should have ACCOUNT_SUSPENDED code')
  })

  it('rejects deleted account with 403', async () => {
    // Mark the test user as deleted
    const user = await q('SELECT id FROM users WHERE email = $1', ['test-api-login@example.com'])
    await q('UPDATE users SET status = $1 WHERE id = $2', ['DELETED', user.rows[0].id])

    const response = await request('POST', '/api/auth/login', {
      body: {
        identifier: 'test-api-login@example.com',
        password: 'ValidPassword123!',
      },
    })

    assert.strictEqual(response.statusCode, 403, 'Should return 403 Forbidden')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'ACCOUNT_DELETED', 'Should have ACCOUNT_DELETED code')
  })
})

// ── Logout API Tests (Not Implemented) ───────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 501 Not Implemented', async () => {
    const response = await request('POST', '/api/auth/logout')

    assert.strictEqual(response.statusCode, 501, 'Should return 501 Not Implemented')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'NOT_IMPLEMENTED', 'Should have NOT_IMPLEMENTED code')
  })
})

// ── Refresh Token API Tests (Not Implemented) ───────────────────────────────

describe('POST /api/auth/refresh-token', () => {
  it('returns 501 Not Implemented', async () => {
    const response = await request('POST', '/api/auth/refresh-token', {
      body: {
        refreshToken: 'some-token',
      },
    })

    assert.strictEqual(response.statusCode, 501, 'Should return 501 Not Implemented')
    assert.strictEqual(response.body.success, false, 'Should return success: false')
    assert.strictEqual(response.body.error.code, 'NOT_IMPLEMENTED', 'Should have NOT_IMPLEMENTED code')
  })
})
