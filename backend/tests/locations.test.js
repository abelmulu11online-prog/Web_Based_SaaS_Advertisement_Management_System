/**
 * tests/locations.test.js — Phase 7 GPS + Maps tests.
 *
 * Tests:
 *  ── Coordinate validation ────────────────────────────────────────────────────
 *  1.  Valid coordinates accepted on advertisement creation
 *  2.  Invalid latitude rejected  (> 90)
 *  3.  Invalid latitude rejected  (< -90)
 *  4.  Invalid longitude rejected (> 180)
 *  5.  Invalid longitude rejected (< -180)
 *  6.  Non-numeric coordinate rejected
 *
 *  ── Saving / updating location ───────────────────────────────────────────────
 *  7.  Advertisement with coordinates created successfully
 *  8.  Coordinates returned as numbers in response
 *  9.  Coordinates updated via PATCH
 *  10. Address field saved and returned
 *
 *  ── Public map pins endpoint ─────────────────────────────────────────────────
 *  11. GET /api/ads/map returns 200 for public access
 *  12. Only PUBLISHED ads with coordinates appear in map pins
 *  13. Map pins contain required fields: id, title, latitude, longitude
 *  14. DRAFT ad does not appear in map pins
 *
 *  ── Radius search (Haversine) ────────────────────────────────────────────────
 *  15. GET /api/ads?lat=&lng=&radius_km= returns ads within radius
 *  16. Ad outside radius is excluded from results
 *  17. Radius search results include distance_km field
 *  18. Radius search results sorted by distance_km ascending
 *
 *  ── Locations API endpoints ──────────────────────────────────────────────────
 *  19. GET /api/locations/nearby returns 200 with valid params
 *  20. GET /api/locations/nearby with missing lat returns error
 *  21. GET /api/locations/map-pins returns 200 for public access
 *
 *  ── Security ─────────────────────────────────────────────────────────────────
 *  22. Map pins do not expose contact_phone or contact_email
 *  23. DRAFT ad location not included in public map pins
 *  24. GET /api/locations/nearby accessible without authentication
 *
 * Uses Node.js built-in test runner — no extra dependencies.
 */
import 'dotenv/config'
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { URL } from 'node:url'
import pg from 'pg'

process.env.NODE_ENV     = 'test'
process.env.PORT         = '0'
process.env.CORS_ORIGINS = 'http://localhost:5173'
process.env.JWT_SECRET   = 'test-secret-locations'

const { default: app } = await import('../src/app.js')

let server
let baseUrl

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('[locations.test] DATABASE_URL not set — skipping.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DATABASE_URL })

// ── HTTP helper ──────────────────────────────────────────────────────────────

function request(method, path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl)
    const opts = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + (url.search || ''),
      method,
      headers:  { 'Content-Type': 'application/json', ...headers },
    }
    const req = http.request(opts, (res) => {
      let raw = ''
      res.on('data', (c) => (raw += c))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(raw) } catch { json = raw }
        resolve({ statusCode: res.statusCode, body: json })
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// ── Test data helpers ────────────────────────────────────────────────────────

async function createUserAndLogin(email) {
  await request('POST', '/api/auth/register', {
    body: { email, password: 'Test1234!' },
  })
  const res = await request('POST', '/api/auth/login', {
    body: { identifier: email, password: 'Test1234!' },
  })
  return {
    token:  res.body?.data?.accessToken,
    userId: res.body?.data?.user?.id,
  }
}

async function createAd(token, overrides = {}) {
  const res = await request('POST', '/api/ads', {
    body: {
      title:       'GPS Test Ad',
      description: 'Test advertisement for GPS and location functionality',
      price_type:  'FIXED',
      price:       50,
      ...overrides,
    },
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.body?.data
}

async function publishAd(token, adId) {
  await request('PATCH', `/api/ads/${adId}/publish`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── Reference coordinates ────────────────────────────────────────────────────

const ADDIS_LAT = 9.0054   // Addis Ababa city centre
const ADDIS_LNG = 38.7636

const NEAR_LAT  = 9.0450   // ~5 km NE — inside 10 km radius
const NEAR_LNG  = 38.8100

const FAR_LAT   = 7.9760   // ~120 km S — outside any test radius
const FAR_LNG   = 38.7700

// ── Suite ────────────────────────────────────────────────────────────────────

before(async () => {
  server = http.createServer(app)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  server.close()
  await pool.end()
})

describe('Phase 7 — GPS + Maps', () => {

  // ── Coordinate validation ─────────────────────────────────────────────────

  it('1. Valid latitude/longitude accepted on advertisement creation', async () => {
    const { token } = await createUserAndLogin(`loc1_${Date.now()}@test.com`)
    const res = await request('POST', '/api/ads', {
      body: {
        title: 'Coord Test', description: 'Valid coordinate advertisement for validation',
        price_type: 'FIXED', latitude: 9.0054, longitude: 38.7636, address: 'Addis Ababa',
      },
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.statusCode, 201)
    assert.ok(res.body.success)
    assert.ok(Math.abs(Number(res.body.data.latitude)  - 9.0054)  < 0.001)
    assert.ok(Math.abs(Number(res.body.data.longitude) - 38.7636) < 0.001)
  })

  it('2. Latitude > 90 is rejected with 422', async () => {
    const { token } = await createUserAndLogin(`loc2_${Date.now()}@test.com`)
    const res = await request('POST', '/api/ads', {
      body: { title: 'Bad', description: 'latitude out of range upper bound', latitude: 91, longitude: 38 },
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.statusCode, 422)
  })

  it('3. Latitude < -90 is rejected with 422', async () => {
    const { token } = await createUserAndLogin(`loc3_${Date.now()}@test.com`)
    const res = await request('POST', '/api/ads', {
      body: { title: 'Bad', description: 'latitude out of range lower bound', latitude: -91, longitude: 38 },
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.statusCode, 422)
  })

  it('4. Longitude > 180 is rejected with 422', async () => {
    const { token } = await createUserAndLogin(`loc4_${Date.now()}@test.com`)
    const res = await request('POST', '/api/ads', {
      body: { title: 'Bad', description: 'longitude out of range upper bound', latitude: 9, longitude: 181 },
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.statusCode, 422)
  })

  it('5. Longitude < -180 is rejected with 422', async () => {
    const { token } = await createUserAndLogin(`loc5_${Date.now()}@test.com`)
    const res = await request('POST', '/api/ads', {
      body: { title: 'Bad', description: 'longitude out of range lower bound', latitude: 9, longitude: -181 },
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.statusCode, 422)
  })

  it('6. Non-numeric string coordinate rejected with 422', async () => {
    const { token } = await createUserAndLogin(`loc6_${Date.now()}@test.com`)
    const res = await request('POST', '/api/ads', {
      body: { title: 'Bad', description: 'non-numeric string coordinate test', latitude: 'abc', longitude: 38 },
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.statusCode, 422)
  })

  // ── Saving / updating location ────────────────────────────────────────────

  it('7. Advertisement with coordinates created successfully', async () => {
    const { token } = await createUserAndLogin(`loc7_${Date.now()}@test.com`)
    const ad = await createAd(token, { latitude: ADDIS_LAT, longitude: ADDIS_LNG, address: 'Bole, Addis Ababa' })
    assert.ok(ad?.id)
    assert.ok(ad?.latitude  != null)
    assert.ok(ad?.longitude != null)
    assert.equal(ad.address, 'Bole, Addis Ababa')
  })

  it('8. Coordinates returned as numbers in response', async () => {
    const { token } = await createUserAndLogin(`loc8_${Date.now()}@test.com`)
    const ad = await createAd(token, { latitude: ADDIS_LAT, longitude: ADDIS_LNG })
    assert.ok(Math.abs(Number(ad.latitude)  - ADDIS_LAT) < 0.001)
    assert.ok(Math.abs(Number(ad.longitude) - ADDIS_LNG) < 0.001)
  })

  it('9. Coordinates updated via PATCH', async () => {
    const { token } = await createUserAndLogin(`loc9_${Date.now()}@test.com`)
    const ad = await createAd(token, { latitude: ADDIS_LAT, longitude: ADDIS_LNG })
    const res = await request('PATCH', `/api/ads/${ad.id}`, {
      body: { latitude: NEAR_LAT, longitude: NEAR_LNG },
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.statusCode, 200)
    assert.ok(Math.abs(Number(res.body.data.latitude)  - NEAR_LAT) < 0.001)
    assert.ok(Math.abs(Number(res.body.data.longitude) - NEAR_LNG) < 0.001)
  })

  it('10. Address field saved and returned correctly', async () => {
    const { token } = await createUserAndLogin(`loc10_${Date.now()}@test.com`)
    const ad = await createAd(token, { address: 'Gondar City Centre' })
    assert.equal(ad.address, 'Gondar City Centre')
  })

  // ── Public map pins ───────────────────────────────────────────────────────

  it('11. GET /api/ads/map returns 200 without authentication', async () => {
    const res = await request('GET', '/api/ads/map')
    assert.equal(res.statusCode, 200)
    assert.ok(res.body.success)
    assert.ok(Array.isArray(res.body.data))
  })

  it('12. Only PUBLISHED ads with coordinates appear in map pins', async () => {
    const { token } = await createUserAndLogin(`loc12_${Date.now()}@test.com`)
    const draftAd  = await createAd(token, { latitude: ADDIS_LAT, longitude: ADDIS_LNG })
    const pubAd    = await createAd(token, { latitude: NEAR_LAT,  longitude: NEAR_LNG  })
    const noCoordAd = await createAd(token)
    await publishAd(token, pubAd.id)

    const res    = await request('GET', '/api/ads/map')
    const pinIds = res.body.data.map((p) => p.id)

    assert.ok(!pinIds.includes(draftAd.id),   'DRAFT must not be in map pins')
    assert.ok(pinIds.includes(pubAd.id),       'PUBLISHED+coords must be in map pins')
    assert.ok(!pinIds.includes(noCoordAd.id),  'Ad without coords must not be in map pins')
  })

  it('13. Map pins have required fields: id, title, latitude, longitude', async () => {
    const { token } = await createUserAndLogin(`loc13_${Date.now()}@test.com`)
    const ad = await createAd(token, { latitude: ADDIS_LAT, longitude: ADDIS_LNG })
    await publishAd(token, ad.id)

    const res = await request('GET', '/api/ads/map')
    const pin = res.body.data.find((p) => p.id === ad.id)
    assert.ok(pin,              'Pin should exist')
    assert.ok(pin.id)
    assert.ok(pin.title)
    assert.ok(pin.latitude  != null)
    assert.ok(pin.longitude != null)
  })

  it('14. DRAFT ad does not appear in map pins', async () => {
    const { token } = await createUserAndLogin(`loc14_${Date.now()}@test.com`)
    const ad = await createAd(token, { latitude: ADDIS_LAT, longitude: ADDIS_LNG })
    const res = await request('GET', '/api/ads/map')
    assert.ok(!res.body.data.map((p) => p.id).includes(ad.id))
  })

  // ── Radius search ─────────────────────────────────────────────────────────

  it('15. Radius search returns ads within radius', async () => {
    const { token } = await createUserAndLogin(`loc15_${Date.now()}@test.com`)
    const ad = await createAd(token, {
      title: 'Near Addis Radius Test',
      description: 'Advertisement near Addis Ababa for radius inclusion test',
      latitude: NEAR_LAT, longitude: NEAR_LNG,
    })
    await publishAd(token, ad.id)

    const res = await request('GET', `/api/ads?lat=${ADDIS_LAT}&lng=${ADDIS_LNG}&radius_km=10`)
    assert.equal(res.statusCode, 200)
    const ids = res.body.data.advertisements.map((a) => a.id)
    assert.ok(ids.includes(ad.id), 'Near ad should be in 10km results')
  })

  it('16. Ad outside radius is excluded', async () => {
    const { token } = await createUserAndLogin(`loc16_${Date.now()}@test.com`)
    const ad = await createAd(token, {
      title: 'Far Away Radius Test',
      description: 'Advertisement far from Addis Ababa for radius exclusion test',
      latitude: FAR_LAT, longitude: FAR_LNG,
    })
    await publishAd(token, ad.id)

    const res = await request('GET', `/api/ads?lat=${ADDIS_LAT}&lng=${ADDIS_LNG}&radius_km=10`)
    const ids = res.body.data.advertisements.map((a) => a.id)
    assert.ok(!ids.includes(ad.id), 'Far ad must be excluded from 10km radius')
  })

  it('17. Radius search results include distance_km', async () => {
    const { token } = await createUserAndLogin(`loc17_${Date.now()}@test.com`)
    const ad = await createAd(token, {
      title: 'Distance Field Test',
      description: 'Test that distance_km is present in geo radius search results',
      latitude: NEAR_LAT, longitude: NEAR_LNG,
    })
    await publishAd(token, ad.id)

    const res   = await request('GET', `/api/ads?lat=${ADDIS_LAT}&lng=${ADDIS_LNG}&radius_km=25`)
    const found = res.body.data.advertisements.find((a) => a.id === ad.id)
    assert.ok(found, 'Ad should be in results')
    assert.ok(found.distance_km != null,      'distance_km should be present')
    assert.equal(typeof found.distance_km, 'number')
    assert.ok(found.distance_km >= 0 && found.distance_km <= 25)
  })

  it('18. Radius search results sorted by distance_km ascending', async () => {
    const { token } = await createUserAndLogin(`loc18_${Date.now()}@test.com`)
    const closeAd = await createAd(token, {
      title: 'Sort Test Close', description: 'Close ad for sort order verification test',
      latitude: NEAR_LAT, longitude: NEAR_LNG,
    })
    const midAd = await createAd(token, {
      title: 'Sort Test Mid', description: 'Medium ad for sort order verification test',
      latitude: 9.0800, longitude: 38.8500,
    })
    await publishAd(token, closeAd.id)
    await publishAd(token, midAd.id)

    const res = await request('GET', `/api/ads?lat=${ADDIS_LAT}&lng=${ADDIS_LNG}&radius_km=50`)
    const geoAds = res.body.data.advertisements.filter((a) => a.distance_km != null)

    for (let i = 1; i < geoAds.length; i++) {
      assert.ok(
        geoAds[i].distance_km >= geoAds[i - 1].distance_km,
        `Sort order violated at index ${i}: ${geoAds[i - 1].distance_km} > ${geoAds[i].distance_km}`,
      )
    }
  })

  // ── Locations endpoints ───────────────────────────────────────────────────

  it('19. GET /api/locations/nearby returns 200 with valid params', async () => {
    const res = await request('GET', `/api/locations/nearby?lat=${ADDIS_LAT}&lng=${ADDIS_LNG}&radius_km=5`)
    assert.equal(res.statusCode, 200)
    assert.ok(res.body.success)
    assert.ok(Array.isArray(res.body.data))
  })

  it('20. GET /api/locations/nearby with missing lat returns an error', async () => {
    const res = await request('GET', '/api/locations/nearby?lng=38.7636&radius_km=10')
    assert.ok(
      [400, 422, 500].includes(res.statusCode),
      `Expected error status for missing lat, got ${res.statusCode}`,
    )
  })

  it('21. GET /api/locations/map-pins returns 200 for public access', async () => {
    const res = await request('GET', '/api/locations/map-pins')
    assert.equal(res.statusCode, 200)
    assert.ok(res.body.success)
    assert.ok(Array.isArray(res.body.data))
  })

  // ── Security ──────────────────────────────────────────────────────────────

  it('22. Map pins do not expose contact_phone or contact_email', async () => {
    const { token } = await createUserAndLogin(`loc22_${Date.now()}@test.com`)
    const ad = await createAd(token, {
      latitude: ADDIS_LAT, longitude: ADDIS_LNG,
      contact_phone: '+251912345678', contact_email: 'private@test.com',
    })
    await publishAd(token, ad.id)

    const res = await request('GET', '/api/ads/map')
    const pin = res.body.data.find((p) => p.id === ad.id)
    assert.ok(pin)
    assert.ok(!('contact_phone' in pin), 'contact_phone must not be exposed in map pins')
    assert.ok(!('contact_email' in pin), 'contact_email must not be exposed in map pins')
  })

  it('23. DRAFT ad location not accessible via public map pins', async () => {
    const { token } = await createUserAndLogin(`loc23_${Date.now()}@test.com`)
    const ad = await createAd(token, { latitude: ADDIS_LAT, longitude: ADDIS_LNG })
    // Never published

    const res = await request('GET', '/api/ads/map')
    assert.ok(!res.body.data.map((p) => p.id).includes(ad.id))
  })

  it('24. GET /api/locations/nearby is publicly accessible (no auth required)', async () => {
    const res = await request('GET', `/api/locations/nearby?lat=${ADDIS_LAT}&lng=${ADDIS_LNG}&radius_km=5`)
    assert.equal(res.statusCode, 200)
  })

})
