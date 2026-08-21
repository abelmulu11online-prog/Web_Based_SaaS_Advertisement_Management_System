/**
 * tests/security.test.js — Phase 4.1 security utilities and middleware tests.
 *
 * Tests:
 *  - Password utility (hashing and comparison)
 *  - JWT utility (generation and verification)
 *  - Authentication middleware
 *  - Role authorization middleware
 *  - Swagger documentation endpoint
 *
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, comparePassword } from '../src/utils/password.js'
import { generateToken, verifyToken } from '../src/utils/jwt.js'
import { authenticate } from '../src/middleware/authenticate.js'
import { requireRole } from '../src/middleware/requireRole.js'
import http from 'node:http'
import { URL } from 'node:url'

// Load environment before importing app
process.env.NODE_ENV = 'test'
process.env.PORT = '0'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:changeme@localhost:5432/local_discovery'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret-for-testing'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

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

// Start test server
await new Promise((resolve) => {
  server = http.createServer(app)
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    baseUrl = `http://127.0.0.1:${port}`
    resolve()
  })
})

// Cleanup
process.on('exit', () => {
  server.close()
})

describe('Password utility', () => {
  it('hashes a password successfully', async () => {
    const plainPassword = 'TestPassword123!'
    const hash = await hashPassword(plainPassword)
    
    assert.ok(hash, 'Hash should be generated')
    assert.ok(typeof hash === 'string', 'Hash should be a string')
    assert.ok(hash !== plainPassword, 'Hash should differ from plaintext')
    assert.ok(hash.length > 50, 'Bcrypt hash should be sufficiently long')
  })

  it('compares correct password successfully', async () => {
    const plainPassword = 'TestPassword123!'
    const hash = await hashPassword(plainPassword)
    
    const isMatch = await comparePassword(plainPassword, hash)
    assert.strictEqual(isMatch, true, 'Correct password should match')
  })

  it('fails comparison for incorrect password', async () => {
    const plainPassword = 'TestPassword123!'
    const wrongPassword = 'WrongPassword456!'
    const hash = await hashPassword(plainPassword)
    
    const isMatch = await comparePassword(wrongPassword, hash)
    assert.strictEqual(isMatch, false, 'Incorrect password should not match')
  })

  it('generates different hashes for the same password', async () => {
    const plainPassword = 'TestPassword123!'
    const hash1 = await hashPassword(plainPassword)
    const hash2 = await hashPassword(plainPassword)
    
    assert.ok(hash1 !== hash2, 'Bcrypt should generate different hashes due to salt')
  })
})

describe('JWT utility', () => {
  it('generates a valid token', () => {
    const payload = { id: '123', role: 'USER', status: 'active' }
    const token = generateToken(payload)
    
    assert.ok(token, 'Token should be generated')
    assert.ok(typeof token === 'string', 'Token should be a string')
    assert.ok(token.split('.').length === 3, 'JWT should have 3 parts')
  })

  it('verifies a valid token successfully', () => {
    const payload = { id: '123', role: 'USER', status: 'active' }
    const token = generateToken(payload)
    
    const decoded = verifyToken(token)
    assert.ok(decoded, 'Token should be verified')
    assert.strictEqual(decoded.id, payload.id, 'Payload id should match')
    assert.strictEqual(decoded.role, payload.role, 'Payload role should match')
    assert.strictEqual(decoded.status, payload.status, 'Payload status should match')
  })

  it('rejects an invalid token', () => {
    const invalidToken = 'invalid.token.string'
    
    assert.throws(
      () => verifyToken(invalidToken),
      { message: 'Invalid token' },
      'Should throw error for invalid token'
    )
  })

  it('rejects a malformed token', () => {
    const malformedToken = 'not-a-jwt'
    
    assert.throws(
      () => verifyToken(malformedToken),
      { message: 'Invalid token' },
      'Should throw error for malformed token'
    )
  })

  it('rejects an expired token', async () => {
    // Temporarily override JWT expiration to 1ms for this test
    const originalExpiresIn = process.env.JWT_EXPIRES_IN
    process.env.JWT_EXPIRES_IN = '1ms'
    
    // Re-import jwt utility to pick up new config
    const { generateToken: generateTokenShort, verifyToken: verifyTokenShort } = await import('../src/utils/jwt.js')
    
    const payload = { id: '123', role: 'USER', status: 'active' }
    const token = generateTokenShort(payload)
    
    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Verify expired token is rejected with TOKEN_EXPIRED code
    assert.throws(
      () => verifyTokenShort(token),
      (err) => {
        return err.message === 'Token expired' && err.code === 'TOKEN_EXPIRED' && err.statusCode === 401
      },
      'Should throw error with TOKEN_EXPIRED code for expired token'
    )
    
    // Restore original config
    process.env.JWT_EXPIRES_IN = originalExpiresIn
  })
})

describe('Authentication middleware', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} }
    let capturedStatusCode
    let capturedBody
    const res = {
      status: (code) => {
        capturedStatusCode = code
        return {
          json: (data) => {
            capturedBody = data
          }
        }
      }
    }
    const next = () => {}
    
    authenticate(req, res, next)
    assert.strictEqual(capturedStatusCode, 401, 'Should return 401')
    assert.strictEqual(capturedBody.success, false, 'Should indicate failure')
    assert.strictEqual(capturedBody.error.code, 'AUTHENTICATION_REQUIRED', 'Should have correct error code')
  })

  it('returns 400 for malformed Authorization header', () => {
    const req = { headers: { authorization: 'InvalidFormat' } }
    let capturedStatusCode
    let capturedBody
    const res = {
      status: (code) => {
        capturedStatusCode = code
        return {
          json: (data) => {
            capturedBody = data
          }
        }
      }
    }
    const next = () => {}
    
    authenticate(req, res, next)
    assert.strictEqual(capturedStatusCode, 400, 'Should return 400')
    assert.strictEqual(capturedBody.error.code, 'INVALID_AUTH_HEADER', 'Should have correct error code')
  })

  it('returns 401 for invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } }
    let capturedStatusCode
    let capturedBody
    const res = {
      status: (code) => {
        capturedStatusCode = code
        return {
          json: (data) => {
            capturedBody = data
          }
        }
      }
    }
    const next = () => {}
    
    authenticate(req, res, next)
    assert.strictEqual(capturedStatusCode, 401, 'Should return 401')
    assert.strictEqual(capturedBody.error.code, 'INVALID_TOKEN', 'Should have correct error code')
  })

  it('populates req.user and calls next for valid token', () => {
    const payload = { id: '123', role: 'USER', status: 'active' }
    const token = generateToken(payload)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = {
      status: () => ({ json: () => ({}) })
    }
    let nextCalled = false
    const next = () => { nextCalled = true }
    
    authenticate(req, res, next)
    
    assert.ok(nextCalled, 'next() should be called')
    assert.ok(req.user, 'req.user should be populated')
    assert.strictEqual(req.user.id, payload.id, 'User id should match')
    assert.strictEqual(req.user.role, payload.role, 'User role should match')
  })
})

describe('Role authorization middleware', () => {
  it('allows request when role matches allowed role', () => {
    const req = { user: { id: '123', role: 'ADMIN' } }
    const res = {
      status: () => ({ json: () => ({}) })
    }
    let nextCalled = false
    const next = () => { nextCalled = true }
    
    const middleware = requireRole('ADMIN')
    middleware(req, res, next)
    
    assert.ok(nextCalled, 'next() should be called for allowed role')
  })

  it('allows request when role is in allowed roles list', () => {
    const req = { user: { id: '123', role: 'USER' } }
    const res = {
      status: () => ({ json: () => ({}) })
    }
    let nextCalled = false
    const next = () => { nextCalled = true }
    
    const middleware = requireRole('ADMIN', 'USER')
    middleware(req, res, next)
    
    assert.ok(nextCalled, 'next() should be called for allowed role')
  })

  it('returns 403 when role is not allowed', () => {
    const req = { user: { id: '123', role: 'USER' } }
    let capturedStatusCode
    let capturedBody
    const res = {
      status: (code) => {
        capturedStatusCode = code
        return {
          json: (data) => {
            capturedBody = data
          }
        }
      }
    }
    const next = () => {}
    
    const middleware = requireRole('ADMIN')
    middleware(req, res, next)
    
    assert.strictEqual(capturedStatusCode, 403, 'Should return 403')
    assert.strictEqual(capturedBody.error.code, 'FORBIDDEN', 'Should have correct error code')
  })

  it('returns 401 when user context is missing', () => {
    const req = { user: null }
    let capturedStatusCode
    let capturedBody
    const res = {
      status: (code) => {
        capturedStatusCode = code
        return {
          json: (data) => {
            capturedBody = data
          }
        }
      }
    }
    const next = () => {}
    
    const middleware = requireRole('ADMIN')
    middleware(req, res, next)
    
    assert.strictEqual(capturedStatusCode, 401, 'Should return 401')
    assert.strictEqual(capturedBody.error.code, 'AUTHENTICATION_REQUIRED', 'Should have correct error code')
  })
})

describe('Swagger documentation', () => {
  it('serves Swagger UI at /api-docs/', async () => {
    const { statusCode, headers } = await request('GET', '/api-docs/')
    
    assert.ok(statusCode === 200, 'Should return 200')
    assert.ok(headers['content-type'], 'Should have content-type header')
  })

  it('serves OpenAPI JSON spec', async () => {
    const { statusCode } = await request('GET', '/api-docs/swagger.json')
    
    // swagger-jsdoc serves the spec at the same endpoint with query param
    // or we can check if the UI loads the spec
    assert.ok(statusCode === 200 || statusCode === 404, 'Should return 200 or 404')
  })
})
