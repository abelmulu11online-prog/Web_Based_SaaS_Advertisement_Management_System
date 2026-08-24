/**
 * tests/advertisements.test.js — Phase 5 Advertisement System tests.
 *
 * Tests HTTP endpoints for advertisement management:
 *  - GET    /api/ads                    — list published ads (public)
 *  - GET    /api/ads/:id                — get published ad detail (public)
 *  - GET    /api/ads/me                 — list my ads (authenticated)
 *  - GET    /api/ads/me/:id             — get my ad by ID
 *  - POST   /api/ads                    — create ad (authenticated)
 *  - PATCH  /api/ads/:id                — update ad (owner only)
 *  - PATCH  /api/ads/:id/publish        — publish ad
 *  - PATCH  /api/ads/:id/pause          — pause ad
 *  - PATCH  /api/ads/:id/archive        — archive ad
 *  - DELETE /api/ads/:id                — delete ad
 *  - POST   /api/ads/:id/images         — add image
 *  - DELETE /api/ads/:id/images/:imgId  — delete image
 *
 * Also covers:
 *  - Authentication requirements
 *  - Ownership enforcement (cross-user security)
 *  - Status lifecycle transitions
 *  - Visibility rules (drafts/paused not publicly visible)
 *  - Search and filtering
 *  - Pagination
 *  - Sensitive field injection rejection
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

process.env.NODE_ENV = 'test'
process.env.PORT = '0'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret-ads'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[advertisements.test] DATABASE_URL is not set.')
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
      path: url.pathname + (url.search || ''),
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
        try { json = JSON.parse(data) } catch { json = data }
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

async function cleanupTestData() {
  await q(`DELETE FROM advertisement_images
    WHERE advertisement_id IN (
      SELECT id FROM advertisements WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE 'adtest-%'
      )
    )`)
  await q(`DELETE FROM advertisements WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'adtest-%'
  )`)
  await q(`DELETE FROM users WHERE email LIKE 'adtest-%'`)
}

async function registerAndLogin(email, password = 'AdTestPass123!') {
  await request('POST', '/api/auth/register', { body: { email, password } })
  const loginRes = await request('POST', '/api/auth/login', {
    body: { identifier: email, password },
  })
  return {
    token: loginRes.body.data.accessToken,
    user: loginRes.body.data.user,
  }
}

function auth(token) {
  return { Authorization: `Bearer ${token}` }
}

async function createAd(token, overrides = {}) {
  const body = {
    title: 'Test Advertisement Listing',
    description: 'This is a detailed description for the test advertisement listing.',
    price: 100,
    price_type: 'FIXED',
    contact_phone: '+1234567890',
    contact_email: 'adtest-contact@example.com',
    address: 'Test City, Test Country',
    latitude: 9.005,
    longitude: 38.763,
    ...overrides,
  }
  return request('POST', '/api/ads', { body, headers: auth(token) })
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

// ── CREATE ADVERTISEMENT ─────────────────────────────────────────────────────

describe('POST /api/ads — Create Advertisement', () => {
  it('creates an advertisement and returns 201 with DRAFT status', async () => {
    const { token } = await registerAndLogin('adtest-create@example.com')
    const res = await createAd(token)

    assert.strictEqual(res.statusCode, 201)
    assert.strictEqual(res.body.success, true)
    assert.strictEqual(res.body.data.status, 'DRAFT')
    assert.ok(res.body.data.id)
    assert.strictEqual(res.body.data.title, 'Test Advertisement Listing')
    assert.strictEqual(res.body.data.price, 100)
    assert.strictEqual(res.body.data.price_type, 'FIXED')
    assert.ok(!res.body.data.published_at)
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await request('POST', '/api/ads', {
      body: { title: 'Test', description: 'A description for testing purposes' },
    })
    assert.strictEqual(res.statusCode, 401)
  })

  it('returns 422 for missing title', async () => {
    const { token } = await registerAndLogin('adtest-notitle@example.com')
    const res = await request('POST', '/api/ads', {
      body: { description: 'Valid description here for test advertisement' },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 422)
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR')
  })

  it('returns 422 for title too short', async () => {
    const { token } = await registerAndLogin('adtest-shorttitle@example.com')
    const res = await request('POST', '/api/ads', {
      body: { title: 'AB', description: 'Valid description here for test advertisement' },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 422)
  })

  it('returns 422 for description too short', async () => {
    const { token } = await registerAndLogin('adtest-shortdesc@example.com')
    const res = await request('POST', '/api/ads', {
      body: { title: 'Valid Title Here', description: 'Too short' },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects status injection with 422', async () => {
    const { token } = await registerAndLogin('adtest-statusinject@example.com')
    const res = await request('POST', '/api/ads', {
      body: {
        title: 'Test Advertisement Listing',
        description: 'This is a detailed description for the test advertisement.',
        status: 'PUBLISHED',
      },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 422)
  })

  it('rejects user_id injection with 422', async () => {
    const { token } = await registerAndLogin('adtest-userinject@example.com')
    const res = await request('POST', '/api/ads', {
      body: {
        title: 'Test Advertisement Listing',
        description: 'This is a detailed description for the test advertisement.',
        user_id: '00000000-0000-0000-0000-000000000001',
      },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 422)
  })

  it('never returns user password in the response', async () => {
    const { token } = await registerAndLogin('adtest-nosecrets@example.com')
    const res = await createAd(token)
    assert.ok(!('password' in res.body.data))
    assert.ok(!('password_hash' in res.body.data))
  })
})

// ── LIFECYCLE: PUBLISH ────────────────────────────────────────────────────────

describe('PATCH /api/ads/:id/publish — Publish Advertisement', () => {
  it('publishes a DRAFT advertisement and sets published_at', async () => {
    const { token } = await registerAndLogin('adtest-publish@example.com')
    const createRes = await createAd(token)
    const id = createRes.body.data.id

    const res = await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(token) })

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.status, 'PUBLISHED')
    assert.ok(res.body.data.published_at)
  })

  it('returns 401 for unauthenticated publish attempt', async () => {
    const { token } = await registerAndLogin('adtest-publish-unauth@example.com')
    const { body: { data: { id } } } = await createAd(token)
    const res = await request('PATCH', `/api/ads/${id}/publish`)
    assert.strictEqual(res.statusCode, 401)
  })

  it('returns 404 when user tries to publish another user\'s ad', async () => {
    const userA = await registerAndLogin('adtest-pub-cross-a@example.com')
    const userB = await registerAndLogin('adtest-pub-cross-b@example.com')
    const { body: { data: { id } } } = await createAd(userA.token)

    const res = await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(userB.token) })
    assert.strictEqual(res.statusCode, 404)
  })

  it('returns 409 when trying to publish an already PUBLISHED ad', async () => {
    const { token } = await registerAndLogin('adtest-publish-twice@example.com')
    const { body: { data: { id } } } = await createAd(token)
    await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(token) })

    const res = await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 409)
    assert.strictEqual(res.body.error.code, 'INVALID_STATUS_TRANSITION')
  })
})

// ── LIFECYCLE: PAUSE ─────────────────────────────────────────────────────────

describe('PATCH /api/ads/:id/pause — Pause Advertisement', () => {
  it('pauses a PUBLISHED advertisement', async () => {
    const { token } = await registerAndLogin('adtest-pause@example.com')
    const { body: { data: { id } } } = await createAd(token)
    await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(token) })

    const res = await request('PATCH', `/api/ads/${id}/pause`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.status, 'PAUSED')
  })

  it('returns 409 when pausing a DRAFT ad', async () => {
    const { token } = await registerAndLogin('adtest-pause-draft@example.com')
    const { body: { data: { id } } } = await createAd(token)

    const res = await request('PATCH', `/api/ads/${id}/pause`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 409)
    assert.strictEqual(res.body.error.code, 'INVALID_STATUS_TRANSITION')
  })
})

// ── LIFECYCLE: ARCHIVE ────────────────────────────────────────────────────────

describe('PATCH /api/ads/:id/archive — Archive Advertisement', () => {
  it('archives a DRAFT advertisement', async () => {
    const { token } = await registerAndLogin('adtest-archive@example.com')
    const { body: { data: { id } } } = await createAd(token)

    const res = await request('PATCH', `/api/ads/${id}/archive`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.status, 'ARCHIVED')
  })

  it('archives a PUBLISHED advertisement', async () => {
    const { token } = await registerAndLogin('adtest-archive-pub@example.com')
    const { body: { data: { id } } } = await createAd(token)
    await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(token) })

    const res = await request('PATCH', `/api/ads/${id}/archive`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.status, 'ARCHIVED')
  })

  it('returns 409 when archiving an already ARCHIVED ad', async () => {
    const { token } = await registerAndLogin('adtest-archive-twice@example.com')
    const { body: { data: { id } } } = await createAd(token)
    await request('PATCH', `/api/ads/${id}/archive`, { headers: auth(token) })

    const res = await request('PATCH', `/api/ads/${id}/archive`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 409)
  })
})

// ── UPDATE ADVERTISEMENT ──────────────────────────────────────────────────────

describe('PATCH /api/ads/:id — Update Advertisement', () => {
  it('updates a DRAFT advertisement', async () => {
    const { token } = await registerAndLogin('adtest-update@example.com')
    const { body: { data: { id } } } = await createAd(token)

    const res = await request('PATCH', `/api/ads/${id}`, {
      body: { title: 'Updated Title Here', description: 'This is the updated detailed description for the test.' },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.data.title, 'Updated Title Here')
  })

  it('returns 409 when editing a PUBLISHED advertisement', async () => {
    const { token } = await registerAndLogin('adtest-update-pub@example.com')
    const { body: { data: { id } } } = await createAd(token)
    await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(token) })

    const res = await request('PATCH', `/api/ads/${id}`, {
      body: { title: 'Should Not Work Here' },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 409)
    assert.strictEqual(res.body.error.code, 'ADVERTISEMENT_NOT_EDITABLE')
  })

  it('returns 404 when editing another user\'s advertisement', async () => {
    const userA = await registerAndLogin('adtest-update-cross-a@example.com')
    const userB = await registerAndLogin('adtest-update-cross-b@example.com')
    const { body: { data: { id } } } = await createAd(userA.token)

    const res = await request('PATCH', `/api/ads/${id}`, {
      body: { title: 'Hacked Title Attempt' },
      headers: auth(userB.token),
    })
    assert.strictEqual(res.statusCode, 404)
  })
})

// ── DELETE ADVERTISEMENT ──────────────────────────────────────────────────────

describe('DELETE /api/ads/:id — Delete Advertisement', () => {
  it('deletes a DRAFT advertisement', async () => {
    const { token } = await registerAndLogin('adtest-delete@example.com')
    const { body: { data: { id } } } = await createAd(token)

    const res = await request('DELETE', `/api/ads/${id}`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 200)

    // Verify it no longer exists (try fetching as owner)
    const getRes = await request('GET', `/api/ads/me/${id}`, { headers: auth(token) })
    assert.strictEqual(getRes.statusCode, 404)
  })

  it('returns 409 when deleting a PUBLISHED advertisement', async () => {
    const { token } = await registerAndLogin('adtest-delete-pub@example.com')
    const { body: { data: { id } } } = await createAd(token)
    await request('PATCH', `/api/ads/${id}/publish`, { headers: auth(token) })

    const res = await request('DELETE', `/api/ads/${id}`, { headers: auth(token) })
    assert.strictEqual(res.statusCode, 409)
    assert.strictEqual(res.body.error.code, 'ADVERTISEMENT_NOT_DELETABLE')
  })

  it('returns 404 when deleting another user\'s advertisement', async () => {
    const userA = await registerAndLogin('adtest-delete-cross-a@example.com')
    const userB = await registerAndLogin('adtest-delete-cross-b@example.com')
    const { body: { data: { id } } } = await createAd(userA.token)

    const res = await request('DELETE', `/api/ads/${id}`, { headers: auth(userB.token) })
    assert.strictEqual(res.statusCode, 404)
  })
})

// ── PUBLIC VISIBILITY RULES ───────────────────────────────────────────────────

describe('Public Visibility — Only PUBLISHED ads are accessible', () => {
  it('DRAFT advertisement is NOT visible in public listing', async () => {
    const { token } = await registerAndLogin('adtest-vis-draft@example.com')
    const { body: { data: ad } } = await createAd(token, { title: 'Visibility Test Draft Ad' })

    const res = await request('GET', '/api/ads')
    const ids = (res.body.data?.advertisements || []).map((a) => a.id)
    assert.ok(!ids.includes(ad.id))
  })

  it('PUBLISHED advertisement IS visible in public listing', async () => {
    const { token } = await registerAndLogin('adtest-vis-pub@example.com')
    const { body: { data: ad } } = await createAd(token, { title: 'Visibility Test Published Ad' })
    await request('PATCH', `/api/ads/${ad.id}/publish`, { headers: auth(token) })

    const res = await request('GET', '/api/ads')
    const ids = (res.body.data?.advertisements || []).map((a) => a.id)
    assert.ok(ids.includes(ad.id))
  })

  it('PAUSED advertisement is NOT visible in public listing', async () => {
    const { token } = await registerAndLogin('adtest-vis-paused@example.com')
    const { body: { data: ad } } = await createAd(token)
    await request('PATCH', `/api/ads/${ad.id}/publish`, { headers: auth(token) })
    await request('PATCH', `/api/ads/${ad.id}/pause`, { headers: auth(token) })

    const res = await request('GET', '/api/ads')
    const ids = (res.body.data?.advertisements || []).map((a) => a.id)
    assert.ok(!ids.includes(ad.id))
  })

  it('ARCHIVED advertisement is NOT visible in public listing', async () => {
    const { token } = await registerAndLogin('adtest-vis-arch@example.com')
    const { body: { data: ad } } = await createAd(token)
    await request('PATCH', `/api/ads/${ad.id}/archive`, { headers: auth(token) })

    const res = await request('GET', '/api/ads')
    const ids = (res.body.data?.advertisements || []).map((a) => a.id)
    assert.ok(!ids.includes(ad.id))
  })

  it('DRAFT advertisement returns 404 on public detail endpoint', async () => {
    const { token } = await registerAndLogin('adtest-vis-detail@example.com')
    const { body: { data: ad } } = await createAd(token)

    const res = await request('GET', `/api/ads/${ad.id}`)
    assert.strictEqual(res.statusCode, 404)
    assert.strictEqual(res.body.error.code, 'ADVERTISEMENT_NOT_FOUND')
  })
})

// ── PUBLIC LISTING — GET /api/ads ─────────────────────────────────────────────

describe('GET /api/ads — Public Listing', () => {
  it('returns paginated advertisements with metadata', async () => {
    const res = await request('GET', '/api/ads')
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.success, true)
    assert.ok(Array.isArray(res.body.data.advertisements))
    assert.ok(res.body.data.pagination)
    assert.ok('total' in res.body.data.pagination)
    assert.ok('page' in res.body.data.pagination)
    assert.ok('total_pages' in res.body.data.pagination)
  })

  it('supports search by title', async () => {
    const { token } = await registerAndLogin('adtest-search-title@example.com')
    const uniqueTitle = `UniqueSearchTitle${Date.now()}`
    const { body: { data: ad } } = await createAd(token, { title: uniqueTitle })
    await request('PATCH', `/api/ads/${ad.id}/publish`, { headers: auth(token) })

    const res = await request('GET', `/api/ads?search=${encodeURIComponent(uniqueTitle)}`)
    const ids = res.body.data.advertisements.map((a) => a.id)
    assert.ok(ids.includes(ad.id))
  })

  it('supports pagination with page and page_size params', async () => {
    const res = await request('GET', '/api/ads?page=1&page_size=5')
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.body.data.pagination.page_size <= 5)
  })

  it('returns 422 for invalid page_size (> 100)', async () => {
    const res = await request('GET', '/api/ads?page_size=999')
    assert.strictEqual(res.statusCode, 422)
  })
})

// ── MY ADVERTISEMENTS — GET /api/ads/me ──────────────────────────────────────

describe('GET /api/ads/me — My Advertisements', () => {
  it('returns all advertisements for the authenticated user', async () => {
    const { token } = await registerAndLogin('adtest-mine@example.com')
    await createAd(token, { title: 'My First Advertisement Title' })
    await createAd(token, { title: 'My Second Advertisement Title' })

    const res = await request('GET', '/api/ads/me', { headers: auth(token) })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.body.data.advertisements.length >= 2)
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await request('GET', '/api/ads/me')
    assert.strictEqual(res.statusCode, 401)
  })

  it('only returns the authenticated user\'s advertisements', async () => {
    const userA = await registerAndLogin('adtest-mine-isol-a@example.com')
    const userB = await registerAndLogin('adtest-mine-isol-b@example.com')

    await createAd(userA.token, { title: 'User A Advertisement Title' })

    const res = await request('GET', '/api/ads/me', { headers: auth(userB.token) })
    const userAIds = (res.body.data?.advertisements || []).filter(
      (ad) => ad.user_id === userA.user.id
    )
    assert.strictEqual(userAIds.length, 0)
  })

  it('supports filtering by status', async () => {
    const { token } = await registerAndLogin('adtest-mine-status@example.com')
    await createAd(token, { title: 'Status Filter Test Advertisement' })

    const res = await request('GET', '/api/ads/me?status=DRAFT', { headers: auth(token) })
    assert.strictEqual(res.statusCode, 200)
    const nonDraft = res.body.data.advertisements.filter((a) => a.status !== 'DRAFT')
    assert.strictEqual(nonDraft.length, 0)
  })
})

// ── IMAGE MANAGEMENT ──────────────────────────────────────────────────────────

describe('Advertisement Images', () => {
  it('adds an image to an advertisement', async () => {
    const { token } = await registerAndLogin('adtest-img-add@example.com')
    const { body: { data: ad } } = await createAd(token)

    const res = await request('POST', `/api/ads/${ad.id}/images`, {
      body: { image_url: 'https://example.com/test-image.jpg', alt_text: 'Test image' },
      headers: auth(token),
    })
    assert.strictEqual(res.statusCode, 201)
    assert.strictEqual(res.body.data.image_url, 'https://example.com/test-image.jpg')
    assert.strictEqual(res.body.data.is_primary, true) // first image is always primary
  })

  it('first image is automatically set as primary', async () => {
    const { token } = await registerAndLogin('adtest-img-primary@example.com')
    const { body: { data: ad } } = await createAd(token)
    const imgRes = await request('POST', `/api/ads/${ad.id}/images`, {
      body: { image_url: 'https://example.com/first.jpg' },
      headers: auth(token),
    })
    assert.strictEqual(imgRes.body.data.is_primary, true)
  })

  it('deletes an image from an advertisement', async () => {
    const { token } = await registerAndLogin('adtest-img-del@example.com')
    const { body: { data: ad } } = await createAd(token)
    const imgRes = await request('POST', `/api/ads/${ad.id}/images`, {
      body: { image_url: 'https://example.com/del-test.jpg' },
      headers: auth(token),
    })
    const imageId = imgRes.body.data.id

    const delRes = await request('DELETE', `/api/ads/${ad.id}/images/${imageId}`, {
      headers: auth(token),
    })
    assert.strictEqual(delRes.statusCode, 200)
  })

  it('returns 404 when adding image to another user\'s advertisement', async () => {
    const userA = await registerAndLogin('adtest-img-cross-a@example.com')
    const userB = await registerAndLogin('adtest-img-cross-b@example.com')
    const { body: { data: ad } } = await createAd(userA.token)

    const res = await request('POST', `/api/ads/${ad.id}/images`, {
      body: { image_url: 'https://example.com/hack.jpg' },
      headers: auth(userB.token),
    })
    assert.strictEqual(res.statusCode, 404)
  })
})

// ── CROSS-USER SECURITY ───────────────────────────────────────────────────────

describe('Cross-User Security', () => {
  it('User A cannot publish User B\'s advertisement', async () => {
    const userA = await registerAndLogin('adtest-sec-a@example.com')
    const userB = await registerAndLogin('adtest-sec-b@example.com')
    const { body: { data: ad } } = await createAd(userA.token)

    const res = await request('PATCH', `/api/ads/${ad.id}/publish`, { headers: auth(userB.token) })
    assert.strictEqual(res.statusCode, 404)
    // Verify the ad is still a DRAFT
    const getRes = await request('GET', `/api/ads/me/${ad.id}`, { headers: auth(userA.token) })
    assert.strictEqual(getRes.body.data.status, 'DRAFT')
  })

  it('User A cannot delete User B\'s advertisement', async () => {
    const userA = await registerAndLogin('adtest-sec-del-a@example.com')
    const userB = await registerAndLogin('adtest-sec-del-b@example.com')
    const { body: { data: ad } } = await createAd(userA.token)

    const res = await request('DELETE', `/api/ads/${ad.id}`, { headers: auth(userB.token) })
    assert.strictEqual(res.statusCode, 404)

    // Ad should still exist
    const getRes = await request('GET', `/api/ads/me/${ad.id}`, { headers: auth(userA.token) })
    assert.strictEqual(getRes.statusCode, 200)
  })

  it('User A cannot view User B\'s DRAFT via public endpoint', async () => {
    const userA = await registerAndLogin('adtest-sec-view-a@example.com')
    const { body: { data: ad } } = await createAd(userA.token)

    const res = await request('GET', `/api/ads/${ad.id}`)
    assert.strictEqual(res.statusCode, 404)
  })
})
