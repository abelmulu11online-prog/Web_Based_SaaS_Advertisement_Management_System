/**
 * tests/profile.test.js — Phase 4.4 Profile & Business Details API tests.
 *
 * Tests HTTP endpoints for profile and business details management:
 *  - GET   /api/profile
 *  - POST  /api/profile
 *  - PATCH /api/profile
 *  - GET   /api/profile/business
 *  - POST  /api/profile/business
 *
 * Covers:
 *  - Profile creation, retrieval, update
 *  - Business details upsert (hours + social links)
 *  - Authentication requirement (401)
 *  - Validation (422)
 *  - Duplicate handling (409)
 *  - Ownership security (cross-user protection)
 *  - Sensitive-field injection (role, user_id, id, password_hash, is_verified)
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
process.env.PORT = '0'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[profile.test] DATABASE_URL is not set.')
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
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr)
      req.write(bodyStr)
    }

    req.end()
  })
}

async function q(sql, params = []) {
  return pool.query(sql, params)
}

/**
 * Clean up all test data.
 * Deleting users cascades to profiles, which cascades to business_hours,
 * social_links, profile_images, and profile_services.
 */
async function cleanupTestData() {
  await q('DELETE FROM users WHERE email LIKE $1', ['ptest-profile-%@example.com'])
}

/**
 * Register a user and return the access token + user data.
 */
async function registerAndLogin(email, phone, password = 'ValidPassword123!') {
  await request('POST', '/api/auth/register', {
    body: { email, phone, password },
  })

  const loginRes = await request('POST', '/api/auth/login', {
    body: { identifier: email, password },
  })

  return {
    token: loginRes.body.data.accessToken,
    user: loginRes.body.data.user,
  }
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

before(async () => {
  server = http.createServer(app)
  await new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address()
      baseUrl = `http://localhost:${port}`
      resolve()
    })
  })

  await q('SELECT 1')
})

after(async () => {
  await cleanupTestData()
  await pool.end()
  await new Promise((resolve) => server.close(resolve))
})

beforeEach(async () => {
  await cleanupTestData()
})

// ── Profile Creation Tests ────────────────────────────────────────────────────

describe('POST /api/profile — Profile Creation', () => {
  it('creates a profile for an authenticated user and returns 201', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-create@example.com',
      '+12345670001',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Sunrise Coffee',
        slug: 'sunrise-coffee',
        description: 'Local coffee roaster',
        contact_email: 'hello@sunrisecoffee.example.com',
        website_url: 'https://sunrisecoffee.example.com',
        is_published: true,
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 201)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.message, 'Profile created successfully')
    assert.ok(res.body.data.id)
    assert.strictEqual(res.body.data.display_name, 'Sunrise Coffee')
    assert.strictEqual(res.body.data.slug, 'sunrise-coffee')
    assert.strictEqual(res.body.data.is_published, true)
    assert.strictEqual(res.body.data.is_verified, false)
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-shop',
      },
    })

    assert.strictEqual(res.statusCode, 401)
    assert.strictEqual(res.body.success, false)
  })

  it('returns 422 for invalid profile data (missing display_name)', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-invalid1@example.com',
      '+12345670002',
    )

    const res = await request('POST', '/api/profile', {
      body: { slug: 'test-shop' },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR')
  })

  it('returns 422 for invalid slug format', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-invalid2@example.com',
      '+12345670003',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'Invalid Slug With Spaces',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR')
  })

  it('returns 422 for invalid website URL', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-invalid3@example.com',
      '+12345670004',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-shop-url',
        website_url: 'not-a-url',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('returns 409 when user already has a profile (duplicate)', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-dup@example.com',
      '+12345670005',
    )

    // First creation
    await request('POST', '/api/profile', {
      body: {
        display_name: 'First Profile',
        slug: 'first-profile-dup',
      },
      headers: authHeader(token),
    })

    // Second attempt
    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Second Profile',
        slug: 'second-profile-dup',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 409)
    assert.strictEqual(res.body.error.code, 'DUPLICATE_PROFILE')
  })

  it('returns 409 when slug is already taken', async () => {
    const { token: tokenA } = await registerAndLogin(
      'ptest-profile-slug-a@example.com',
      '+12345670006',
    )
    const { token: tokenB } = await registerAndLogin(
      'ptest-profile-slug-b@example.com',
      '+12345670007',
    )

    // User A creates profile with slug
    await request('POST', '/api/profile', {
      body: { display_name: 'Shop A', slug: 'taken-slug' },
      headers: authHeader(tokenA),
    })

    // User B tries same slug
    const res = await request('POST', '/api/profile', {
      body: { display_name: 'Shop B', slug: 'taken-slug' },
      headers: authHeader(tokenB),
    })

    assert.strictEqual(res.statusCode, 409)
    assert.strictEqual(res.body.error.code, 'DUPLICATE_SLUG')
  })

  it('rejects role injection with 422', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-role@example.com',
      '+12345670008',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-shop-role',
        role: 'ADMIN',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects user_id injection with 422', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-uid@example.com',
      '+12345670009',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-shop-uid',
        user_id: '00000000-0000-0000-0000-000000000000',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects is_verified injection with 422', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-verify@example.com',
      '+12345670010',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-shop-verify',
        is_verified: true,
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects password_hash injection with 422', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-ph@example.com',
      '+12345670011',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-shop-ph',
        password_hash: 'fake-hash',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('never returns password_hash in the response', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-safe@example.com',
      '+12345670012',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Safe Shop',
        slug: 'safe-shop',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 201)
    assert.ok(!('password_hash' in res.body.data))
    assert.ok(!('password' in res.body.data))
  })

  it('returns 400 for non-existent category_id', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-bad-cat@example.com',
      '+12345670090',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-bad-cat',
        category_id: '00000000-0000-0000-0000-000000000000',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.body.error.code, 'INVALID_CATEGORY')
  })

  it('returns 400 for non-existent location_id', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-bad-loc@example.com',
      '+12345670091',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-bad-loc',
        location_id: '00000000-0000-0000-0000-000000000000',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.body.error.code, 'INVALID_LOCATION')
  })

  it('returns 400 for non-existent user_id (foreign key validation)', async () => {
    // Create a valid token for a non-existent user ID
    const fakeUserId = '00000000-0000-0000-0000-000000000001'
    const { generateToken } = await import('../src/utils/jwt.js')
    const token = generateToken({ id: fakeUserId, role: 'USER' })

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test Shop',
        slug: 'test-bad-user',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.body.error.code, 'INVALID_USER')
  })
})

// ── Profile Retrieval Tests ───────────────────────────────────────────────────

describe('GET /api/profile — Profile Retrieval', () => {
  it('retrieves the authenticated user\'s profile with 200', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-get@example.com',
      '+12345670020',
    )

    // Create profile first
    await request('POST', '/api/profile', {
      body: {
        display_name: 'Get Test Shop',
        slug: 'get-test-shop',
        description: 'A test shop',
      },
      headers: authHeader(token),
    })

    const res = await request('GET', '/api/profile', {
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.message, 'Profile retrieved successfully')
    assert.strictEqual(res.body.data.display_name, 'Get Test Shop')
    assert.strictEqual(res.body.data.slug, 'get-test-shop')
    assert.ok(res.body.data.business_hours)
    assert.ok(res.body.data.social_links)
    assert.ok(!('password_hash' in res.body.data))
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await request('GET', '/api/profile')

    assert.strictEqual(res.statusCode, 401)
  })

  it('returns 404 when user has no profile', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-none@example.com',
      '+12345670021',
    )

    const res = await request('GET', '/api/profile', {
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 404)
    assert.strictEqual(res.body.error.code, 'PROFILE_NOT_FOUND')
  })
})

// ── Profile Update Tests ──────────────────────────────────────────────────────

describe('PATCH /api/profile — Profile Update', () => {
  it('updates the authenticated user\'s profile with 200', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-update@example.com',
      '+12345670030',
    )

    // Create profile
    await request('POST', '/api/profile', {
      body: {
        display_name: 'Original Name',
        slug: 'original-slug-update',
      },
      headers: authHeader(token),
    })

    // Update
    const res = await request('PATCH', '/api/profile', {
      body: {
        display_name: 'Updated Name',
        description: 'Updated description',
        is_published: true,
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.display_name, 'Updated Name')
    assert.strictEqual(res.body.data.description, 'Updated description')
    assert.strictEqual(res.body.data.is_published, true)
  })

  it('returns 422 for invalid update data', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-update-invalid@example.com',
      '+12345670031',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'test-update-invalid' },
      headers: authHeader(token),
    })

    const res = await request('PATCH', '/api/profile', {
      body: { website_url: 'not-a-url' },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('returns 404 when user has no profile', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-update-none@example.com',
      '+12345670032',
    )

    const res = await request('PATCH', '/api/profile', {
      body: { display_name: 'New Name' },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 404)
  })

  it('returns 409 when updating to a taken slug', async () => {
    const { token: tokenA } = await registerAndLogin(
      'ptest-profile-slug-a2@example.com',
      '+12345670033',
    )
    const { token: tokenB } = await registerAndLogin(
      'ptest-profile-slug-b2@example.com',
      '+12345670034',
    )

    // Both create profiles
    await request('POST', '/api/profile', {
      body: { display_name: 'Shop A', slug: 'slug-a2' },
      headers: authHeader(tokenA),
    })
    await request('POST', '/api/profile', {
      body: { display_name: 'Shop B', slug: 'slug-b2' },
      headers: authHeader(tokenB),
    })

    // User A tries to take User B's slug
    const res = await request('PATCH', '/api/profile', {
      body: { slug: 'slug-b2' },
      headers: authHeader(tokenA),
    })

    assert.strictEqual(res.statusCode, 409)
    assert.strictEqual(res.body.error.code, 'DUPLICATE_SLUG')
  })

  it('rejects user_id injection in update body', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-update-uid@example.com',
      '+12345670035',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'test-update-uid' },
      headers: authHeader(token),
    })

    const res = await request('PATCH', '/api/profile', {
      body: {
        display_name: 'Hacked',
        user_id: '00000000-0000-0000-0000-000000000000',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects role injection in update body', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-update-role@example.com',
      '+12345670036',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'test-update-role' },
      headers: authHeader(token),
    })

    const res = await request('PATCH', '/api/profile', {
      body: { role: 'ADMIN' },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })
})

// ── Business Details Tests ────────────────────────────────────────────────────

describe('POST /api/profile/business — Business Details', () => {
  it('creates business hours and social links with 200', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-biz@example.com',
      '+12345670040',
    )

    // Create profile first
    await request('POST', '/api/profile', {
      body: { display_name: 'Biz Shop', slug: 'biz-shop' },
      headers: authHeader(token),
    })

    const res = await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 1, opens_at: '09:00', closes_at: '17:00', is_closed: false },
          { day_of_week: 0, is_closed: true },
        ],
        social_links: [
          { platform: 'FACEBOOK', url: 'https://facebook.com/bizshop' },
          { platform: 'INSTAGRAM', url: 'https://instagram.com/bizshop' },
        ],
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.data.business_hours.length, 2)
    assert.strictEqual(res.body.data.social_links.length, 2)
  })

  it('returns 422 for invalid business hours (invalid day_of_week)', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-biz-invalid@example.com',
      '+12345670041',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'biz-invalid' },
      headers: authHeader(token),
    })

    const res = await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 7, opens_at: '09:00', closes_at: '17:00' },
        ],
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('returns 422 for invalid social link platform', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-biz-platform@example.com',
      '+12345670042',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'biz-platform' },
      headers: authHeader(token),
    })

    const res = await request('POST', '/api/profile/business', {
      body: {
        social_links: [
          { platform: 'MYSPACE', url: 'https://myspace.com/test' },
        ],
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('returns 422 for invalid social link URL', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-biz-url@example.com',
      '+12345670043',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'biz-url' },
      headers: authHeader(token),
    })

    const res = await request('POST', '/api/profile/business', {
      body: {
        social_links: [
          { platform: 'FACEBOOK', url: 'not-a-url' },
        ],
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('returns 422 when business hours missing opens_at/closes_at and not closed', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-biz-hours@example.com',
      '+12345670044',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'biz-hours' },
      headers: authHeader(token),
    })

    const res = await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 1 },
        ],
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('returns 404 when user has no profile', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-biz-none@example.com',
      '+12345670045',
    )

    const res = await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 1, opens_at: '09:00', closes_at: '17:00' },
        ],
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 404)
  })

  it('replaces existing business hours on re-upsert', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-biz-replace@example.com',
      '+12345670046',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'biz-replace' },
      headers: authHeader(token),
    })

    // First upsert
    await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 1, opens_at: '09:00', closes_at: '17:00' },
          { day_of_week: 2, opens_at: '09:00', closes_at: '17:00' },
        ],
      },
      headers: authHeader(token),
    })

    // Second upsert — only one day
    const res = await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 3, opens_at: '10:00', closes_at: '18:00' },
        ],
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.business_hours.length, 1)
    assert.strictEqual(res.body.data.business_hours[0].day_of_week, 3)
  })
})

// ── GET /api/profile/business Tests ───────────────────────────────────────────

describe('GET /api/profile/business — Business Details Retrieval', () => {
  it('retrieves business details with 200', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-bizget@example.com',
      '+12345670050',
    )

    await request('POST', '/api/profile', {
      body: { display_name: 'Test', slug: 'bizget' },
      headers: authHeader(token),
    })

    await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 1, opens_at: '09:00', closes_at: '17:00' },
        ],
        social_links: [
          { platform: 'FACEBOOK', url: 'https://facebook.com/test' },
        ],
      },
      headers: authHeader(token),
    })

    const res = await request('GET', '/api/profile/business', {
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.business_hours.length, 1)
    assert.strictEqual(res.body.data.social_links.length, 1)
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await request('GET', '/api/profile/business')

    assert.strictEqual(res.statusCode, 401)
  })

  it('returns 404 when user has no profile', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-bizget-none@example.com',
      '+12345670051',
    )

    const res = await request('GET', '/api/profile/business', {
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 404)
  })
})

// ── Cross-User Security Tests ─────────────────────────────────────────────────

describe('Cross-User Security', () => {
  it('User A cannot modify User B\'s profile (ownership enforced via req.user.id)', async () => {
    // Create two users
    const userA = await registerAndLogin(
      'ptest-profile-cross-a@example.com',
      '+12345670060',
    )
    const userB = await registerAndLogin(
      'ptest-profile-cross-b@example.com',
      '+12345670061',
    )

    // User A creates a profile
    await request('POST', '/api/profile', {
      body: { display_name: 'User A Shop', slug: 'user-a-shop' },
      headers: authHeader(userA.token),
    })

    // User B creates a profile
    await request('POST', '/api/profile', {
      body: { display_name: 'User B Shop', slug: 'user-b-shop' },
      headers: authHeader(userB.token),
    })

    // User A tries to inject User B's user_id — rejected by schema
    const injectRes = await request('PATCH', '/api/profile', {
      body: {
        display_name: 'Hacked',
        user_id: userB.user.id,
      },
      headers: authHeader(userA.token),
    })

    assert.strictEqual(injectRes.statusCode, 422)

    // User A's GET returns only User A's profile
    const getRes = await request('GET', '/api/profile', {
      headers: authHeader(userA.token),
    })

    assert.strictEqual(getRes.statusCode, 200)
    assert.strictEqual(getRes.body.data.display_name, 'User A Shop')
    assert.notStrictEqual(getRes.body.data.slug, 'user-b-shop')
  })

  it('User A cannot modify User B\'s business details', async () => {
    const userA = await registerAndLogin(
      'ptest-profile-cross-biz-a@example.com',
      '+12345670062',
    )
    const userB = await registerAndLogin(
      'ptest-profile-cross-biz-b@example.com',
      '+12345670063',
    )

    // Both create profiles
    await request('POST', '/api/profile', {
      body: { display_name: 'Shop A', slug: 'cross-biz-a' },
      headers: authHeader(userA.token),
    })
    await request('POST', '/api/profile', {
      body: { display_name: 'Shop B', slug: 'cross-biz-b' },
      headers: authHeader(userB.token),
    })

    // User B adds business hours
    await request('POST', '/api/profile/business', {
      body: {
        business_hours: [
          { day_of_week: 1, opens_at: '09:00', closes_at: '17:00' },
        ],
      },
      headers: authHeader(userB.token),
    })

    // User A gets their own business details — should be empty
    const res = await request('GET', '/api/profile/business', {
      headers: authHeader(userA.token),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.business_hours.length, 0)
  })

  it('User A cannot inject profile ID to modify User B\'s data', async () => {
    const userA = await registerAndLogin(
      'ptest-profile-cross-id-a@example.com',
      '+12345670064',
    )
    const userB = await registerAndLogin(
      'ptest-profile-cross-id-b@example.com',
      '+12345670065',
    )

    // User B creates a profile and gets the profile ID
    const createB = await request('POST', '/api/profile', {
      body: { display_name: 'Shop B', slug: 'cross-id-b' },
      headers: authHeader(userB.token),
    })
    const profileBId = createB.body.data.id

    // User A tries to inject profile B's ID
    const res = await request('PATCH', '/api/profile', {
      body: {
        display_name: 'Hacked',
        id: profileBId,
      },
      headers: authHeader(userA.token),
    })

    // Schema rejects id field
    assert.strictEqual(res.statusCode, 422)
  })
})

// ── Sensitive Field Injection Tests ───────────────────────────────────────────

describe('Sensitive-Field Injection Security', () => {
  it('rejects status field in profile creation', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-inj-status@example.com',
      '+12345670070',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test',
        slug: 'inj-status',
        status: 'ACTIVE',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects created_at field in profile creation', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-inj-ts@example.com',
      '+12345670071',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test',
        slug: 'inj-ts',
        created_at: '2020-01-01T00:00:00Z',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects password field in profile creation', async () => {
    const { token } = await registerAndLogin(
      'ptest-profile-inj-pw@example.com',
      '+12345670072',
    )

    const res = await request('POST', '/api/profile', {
      body: {
        display_name: 'Test',
        slug: 'inj-pw',
        password: 'ShouldNotBeHere123!',
      },
      headers: authHeader(token),
    })

    assert.strictEqual(res.statusCode, 422)
  })
})
