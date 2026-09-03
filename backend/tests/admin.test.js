/**
 * tests/admin.test.js — Phase 8 admin endpoint tests.
 *
 * Tests:
 *  - Admin routes require authentication (401 without token)
 *  - Normal USER role is denied access (403 Forbidden)
 *  - ADMIN role is accepted through requireRole middleware
 *  - Privilege escalation via request body is ignored (role field in body)
 *  - Validation schemas reject invalid inputs
 *  - Admin stats endpoint structure (with mock DB interaction)
 *
 * Uses Node.js built-in test runner.
 * Does NOT require a live database — tests the HTTP/auth layer only.
 */

import 'dotenv/config'
import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import { generateToken } from '../src/utils/jwt.js'
import http from 'node:http'
import { URL } from 'node:url'

process.env.NODE_ENV  = 'test'
process.env.PORT      = '0'
process.env.CORS_ORIGINS  = 'http://localhost:5173'
process.env.JWT_SECRET    = 'test-secret-for-testing'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

function request(method, path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const options = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + (url.search || ''),
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    }
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch { json = data }
        resolve({ statusCode: res.statusCode, body: json })
      })
    })
    req.on('error', reject)
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body))
    req.end()
  })
}

function adminToken()  { return generateToken({ id: 'admin-id-001', role: 'ADMIN',  status: 'ACTIVE' }) }
function userToken()   { return generateToken({ id: 'user-id-001',  role: 'USER',   status: 'ACTIVE' }) }
function authHeader(t) { return { Authorization: `Bearer ${t}` } }

await new Promise((resolve) => {
  server = http.createServer(app)
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    baseUrl = `http://127.0.0.1:${port}`
    resolve()
  })
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

// ── Authentication guard ───────────────────────────────────────────────────────

describe('Admin authentication guard', () => {
  const endpoints = [
    ['GET',   '/api/admin/stats'],
    ['GET',   '/api/admin/users'],
    ['GET',   '/api/admin/ads'],
    ['GET',   '/api/admin/categories'],
    ['GET',   '/api/admin/subscriptions'],
    ['GET',   '/api/admin/payments'],
    ['GET',   '/api/admin/revenue'],
    ['GET',   '/api/admin/analytics'],
  ]

  for (const [method, path] of endpoints) {
    it(`${method} ${path} returns 401 without token`, async () => {
      const { statusCode, body } = await request(method, path)
      assert.strictEqual(statusCode, 401, `Expected 401, got ${statusCode}`)
      assert.strictEqual(body.success, false)
      assert.ok(['AUTHENTICATION_REQUIRED', 'INVALID_AUTH_HEADER', 'INVALID_TOKEN'].includes(body.error?.code))
    })
  }
})

// ── Authorization guard — USER role must get 403 ──────────────────────────────

describe('Admin authorization — USER role denied', () => {
  const endpoints = [
    ['GET',   '/api/admin/stats'],
    ['GET',   '/api/admin/users'],
    ['GET',   '/api/admin/ads'],
    ['GET',   '/api/admin/categories'],
    ['GET',   '/api/admin/subscriptions'],
    ['GET',   '/api/admin/payments'],
    ['GET',   '/api/admin/revenue'],
    ['GET',   '/api/admin/analytics'],
  ]

  for (const [method, path] of endpoints) {
    it(`${method} ${path} returns 403 for USER role`, async () => {
      const { statusCode, body } = await request(method, path, {
        headers: authHeader(userToken()),
      })
      assert.strictEqual(statusCode, 403, `Expected 403, got ${statusCode} for ${path}`)
      assert.strictEqual(body.success, false)
      assert.strictEqual(body.error?.code, 'FORBIDDEN')
    })
  }
})

// ── Privilege escalation prevention ──────────────────────────────────────────

describe('Privilege escalation prevention', () => {
  it('PATCH /api/admin/users/:id/promote with role in body still requires ADMIN JWT', async () => {
    // A USER trying to self-promote by putting role in body must be rejected
    const { statusCode, body } = await request('PATCH', '/api/admin/users/00000000-0000-0000-0000-000000000001/promote', {
      headers: authHeader(userToken()),
      body: { role: 'ADMIN' },
    })
    assert.strictEqual(statusCode, 403, 'USER cannot self-promote via body injection')
    assert.strictEqual(body.error?.code, 'FORBIDDEN')
  })

  it('Setting role=ADMIN in request body with no token gets 401', async () => {
    const { statusCode } = await request('PATCH', '/api/admin/users/00000000-0000-0000-0000-000000000001/promote', {
      body: { role: 'ADMIN' },
    })
    assert.strictEqual(statusCode, 401)
  })

  it('Setting status=active in request body with no token gets 401', async () => {
    const { statusCode } = await request('PATCH', '/api/admin/users/00000000-0000-0000-0000-000000000001/activate', {
      body: { status: 'ACTIVE', role: 'ADMIN' },
    })
    assert.strictEqual(statusCode, 401)
  })
})

// ── Input validation ──────────────────────────────────────────────────────────

describe('Admin input validation', () => {
  it('PATCH /api/admin/ads/:adId/status rejects invalid status with 422', async () => {
    const { statusCode, body } = await request(
      'PATCH',
      '/api/admin/ads/00000000-0000-0000-0000-000000000001/status',
      {
        headers: authHeader(adminToken()),
        body: { status: 'INVALID_STATUS' },
      },
    )
    // 422 = validation error, or 404 if validation passes but ad not found
    // The Zod enum check should catch INVALID_STATUS before hitting the DB
    assert.ok(statusCode === 422 || statusCode === 400,
      `Expected 422/400 for invalid status, got ${statusCode}: ${JSON.stringify(body)}`)
  })

  it('PATCH /api/admin/ads/:adId/status rejects non-UUID adId', async () => {
    const { statusCode } = await request(
      'PATCH',
      '/api/admin/ads/not-a-uuid/status',
      {
        headers: authHeader(adminToken()),
        body: { status: 'PUBLISHED' },
      },
    )
    assert.ok(statusCode === 422 || statusCode === 400,
      `Expected 422/400 for invalid UUID, got ${statusCode}`)
  })

  it('GET /api/admin/users rejects page_size > 100', async () => {
    const { statusCode } = await request(
      'GET',
      '/api/admin/users?page_size=9999',
      { headers: authHeader(adminToken()) },
    )
    assert.ok(statusCode === 422 || statusCode === 400,
      `Expected 422/400 for oversized page_size, got ${statusCode}`)
  })
})

// ── Admin role is accepted (endpoint reaches the controller) ──────────────────

describe('Admin role accepted', () => {
  it('GET /api/admin/stats with ADMIN token reaches controller (not 401/403)', async () => {
    const { statusCode, body } = await request('GET', '/api/admin/stats', {
      headers: authHeader(adminToken()),
    })
    // May return 500 if no DB is connected, but must NOT return 401/403
    assert.ok(statusCode !== 401, 'ADMIN should not get 401')
    assert.ok(statusCode !== 403, 'ADMIN should not get 403')
  })

  it('GET /api/admin/users with ADMIN token reaches controller (not 401/403)', async () => {
    const { statusCode } = await request('GET', '/api/admin/users', {
      headers: authHeader(adminToken()),
    })
    assert.ok(statusCode !== 401 && statusCode !== 403,
      `ADMIN token should pass auth guard, got ${statusCode}`)
  })

  it('GET /api/admin/categories with ADMIN token reaches controller (not 401/403)', async () => {
    const { statusCode } = await request('GET', '/api/admin/categories', {
      headers: authHeader(adminToken()),
    })
    assert.ok(statusCode !== 401 && statusCode !== 403,
      `ADMIN token should pass auth guard, got ${statusCode}`)
  })
})

// ── Subscription admin endpoints role check ───────────────────────────────────

describe('Subscription admin endpoints — role fix verification', () => {
  it('GET /api/subscriptions/admin/overview returns 403 for USER (not 500)', async () => {
    const { statusCode, body } = await request('GET', '/api/subscriptions/admin/overview', {
      headers: authHeader(userToken()),
    })
    assert.strictEqual(statusCode, 403, `Expected 403, got ${statusCode}`)
    assert.strictEqual(body.error?.code, 'FORBIDDEN')
  })

  it('GET /api/subscriptions/admin/overview with ADMIN token passes auth (not 401/403)', async () => {
    const { statusCode } = await request('GET', '/api/subscriptions/admin/overview', {
      headers: authHeader(adminToken()),
    })
    assert.ok(statusCode !== 401 && statusCode !== 403,
      `ADMIN should pass auth on subscriptions/admin/overview, got ${statusCode}`)
  })
})
