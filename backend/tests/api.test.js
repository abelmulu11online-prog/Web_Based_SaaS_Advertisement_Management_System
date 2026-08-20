/**
 * tests/api.test.js — Foundation API tests.
 *
 * Tests the core API foundation requirements:
 *  - Health endpoint shape and codes
 *  - 404 for unknown routes
 *  - Malformed JSON handling
 *  - Response format consistency
 *
 * Uses Node.js built-in test runner (node:test) — no extra dependencies.
 * Run with: node --test tests/**\/*.test.js
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

// Load environment before importing app
process.env.NODE_ENV = 'test'
process.env.PORT = '0' // random available port
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:changeme@localhost:5432/local_discovery'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

// ── Helpers ──────────────────────────────────────────────────────────────────

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
        let json = null
        try {
          json = JSON.parse(data)
        } catch {
          json = data
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json })
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body))
    }

    req.end()
  })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 or 503 with the correct response shape', async () => {
    const { statusCode, body } = await request('GET', '/api/health')

    // Must be 200 (healthy) or 503 (DB unreachable)
    assert.ok(
      statusCode === 200 || statusCode === 503,
      `Expected 200 or 503, got ${statusCode}`,
    )

    // Success field must be boolean
    assert.equal(typeof body.success, 'boolean')

    // Message must be a string
    assert.equal(typeof body.message, 'string')

    // Data must have status and database fields
    assert.ok(body.data, 'Response must have a data field')
    assert.ok(body.data.status, 'data.status must be present')
    assert.ok(body.data.database, 'data.database must be present')
  })

  it('returns correct status when database is connected (200)', async () => {
    const { statusCode, body } = await request('GET', '/api/health')

    if (statusCode === 200) {
      assert.equal(body.success, true)
      assert.equal(body.data.database, 'connected')
      assert.equal(body.data.status, 'ok')
      assert.equal(body.message, 'API is healthy')
    } else {
      // DB is not available — still check shape is correct
      assert.equal(body.success, false)
      assert.equal(body.data.database, 'disconnected')
      assert.equal(body.message, 'API is degraded')
    }
  })
})

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const { statusCode, body } = await request('GET', '/api/nonexistent')

    assert.equal(statusCode, 404)
    assert.equal(body.success, false)
    assert.equal(typeof body.message, 'string')
    assert.ok(body.message.length > 0, 'message should not be empty')
    assert.ok(body.error, 'error field must be present')
    assert.equal(body.error.code, 'NOT_FOUND')
  })

  it('returns 404 for completely unknown paths', async () => {
    const { statusCode, body } = await request('POST', '/totally/unknown/path')

    assert.equal(statusCode, 404)
    assert.equal(body.success, false)
  })
})

describe('Malformed JSON handling', () => {
  it('returns 400 for invalid JSON in request body', async () => {
    const { statusCode, body } = await request('POST', '/api/auth/login', {
      body: '{ this is not valid json }',
      headers: { 'Content-Type': 'application/json' },
    })

    // Must not crash — should return 400
    assert.equal(statusCode, 400)
    assert.equal(body.success, false)
    assert.ok(body.message, 'Should have a message field')
  })
})

describe('Response format consistency', () => {
  it('health success response has success/message/data fields', async () => {
    const { body } = await request('GET', '/api/health')

    assert.ok('success' in body, 'Must have success field')
    assert.ok('message' in body, 'Must have message field')
    assert.ok('data' in body, 'Must have data field')
  })

  it('404 response has success/message/error fields', async () => {
    const { body } = await request('GET', '/api/does-not-exist')

    assert.ok('success' in body, 'Must have success field')
    assert.ok('message' in body, 'Must have message field')
    assert.ok('error' in body, 'Must have error field')
    assert.ok('code' in body.error, 'error must have code field')
  })
})

describe('Security headers', () => {
  it('includes helmet security headers', async () => {
    const { headers } = await request('GET', '/api/health')

    // Helmet sets x-content-type-options by default
    assert.ok(
      headers['x-content-type-options'],
      'x-content-type-options header should be present (helmet)',
    )
  })
})
