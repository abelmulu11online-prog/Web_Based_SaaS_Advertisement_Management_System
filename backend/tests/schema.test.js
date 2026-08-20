/**
 * tests/schema.test.js — Database schema integrity tests.
 *
 * Verifies:
 *  - All tables exist
 *  - Primary keys work
 *  - Foreign keys are enforced
 *  - Unique constraints work
 *  - CHECK constraints work
 *  - Cascade deletes work where expected
 *  - RESTRICT behavior works where expected
 *  - All core relationships work end-to-end
 *
 * Uses Node.js built-in test runner. Requires a live database.
 * Each test group cleans up after itself to stay isolated.
 */

import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'

// ── DB connection ─────────────────────────────────────────────────────────────

process.env.NODE_ENV = 'test'

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:root@localhost:5432/local_discovery'

const pool = new pg.Pool({ connectionString: DATABASE_URL })

// ── Helpers ───────────────────────────────────────────────────────────────────

async function q(sql, params = []) {
  return pool.query(sql, params)
}

async function one(sql, params = []) {
  const r = await q(sql, params)
  return r.rows[0]
}

/** Returns true when an async fn throws an error matching the code/message */
async function throws(fn, check) {
  try {
    await fn()
    return false
  } catch (err) {
    if (typeof check === 'string') return err.message.includes(check)
    if (check instanceof RegExp) return check.test(err.message)
    return true
  }
}

// ── Teardown helpers ──────────────────────────────────────────────────────────

async function cleanAll() {
  // Delete in dependency order (children first)
  await q('DELETE FROM profile_images')
  await q('DELETE FROM social_links')
  await q('DELETE FROM business_hours')
  await q('DELETE FROM profile_services')
  await q('DELETE FROM profiles')
  await q('DELETE FROM services    WHERE slug LIKE \'test-%\'')
  await q('DELETE FROM categories  WHERE slug LIKE \'test-%\'')
  await q('DELETE FROM locations')
  await q('DELETE FROM users       WHERE email LIKE \'test-%\'')
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

before(async () => {
  await cleanAll()
})

after(async () => {
  await cleanAll()
  await pool.end()
})

// ── 1. Tables exist ───────────────────────────────────────────────────────────

describe('Tables exist', () => {
  const EXPECTED_TABLES = [
    'users', 'profiles', 'categories', 'services',
    'profile_services', 'locations', 'business_hours',
    'social_links', 'profile_images', 'schema_migrations',
  ]

  for (const table of EXPECTED_TABLES) {
    it(`table "${table}" exists`, async () => {
      const row = await one(
        `SELECT to_regclass($1::text) AS oid`,
        [`public.${table}`],
      )
      assert.ok(row.oid !== null, `Table "${table}" does not exist`)
    })
  }
})

// ── 2. UUID primary keys & gen_random_uuid() ─────────────────────────────────

describe('UUID primary keys', () => {
  it('users.id is auto-generated UUID', async () => {
    const row = await one(
      `INSERT INTO users (email, password_hash) VALUES ('test-uuid@x.com', 'h') RETURNING id`,
    )
    assert.match(row.id, /^[0-9a-f-]{36}$/)
    await q(`DELETE FROM users WHERE id = $1`, [row.id])
  })

  it('categories.id is auto-generated UUID', async () => {
    const row = await one(
      `INSERT INTO categories (name, slug) VALUES ('Test Cat', 'test-uuid-cat') RETURNING id`,
    )
    assert.match(row.id, /^[0-9a-f-]{36}$/)
    await q(`DELETE FROM categories WHERE id = $1`, [row.id])
  })
})

// ── 3. users table ────────────────────────────────────────────────────────────

describe('users table', () => {
  it('email must be unique', async () => {
    await q(`INSERT INTO users (email, password_hash) VALUES ('test-dup@x.com', 'h')`)
    const threw = await throws(
      () => q(`INSERT INTO users (email, password_hash) VALUES ('test-dup@x.com', 'h')`),
      'unique',
    )
    assert.ok(threw, 'Should reject duplicate email')
    await q(`DELETE FROM users WHERE email = 'test-dup@x.com'`)
  })

  it('phone must be unique', async () => {
    await q(`INSERT INTO users (phone, password_hash) VALUES ('+1111111111', 'h')`)
    const threw = await throws(
      () => q(`INSERT INTO users (phone, password_hash) VALUES ('+1111111111', 'h')`),
      'unique',
    )
    assert.ok(threw)
    await q(`DELETE FROM users WHERE phone = '+1111111111'`)
  })

  it('must have at least email or phone', async () => {
    const threw = await throws(
      () => q(`INSERT INTO users (password_hash) VALUES ('h')`),
    )
    assert.ok(threw, 'Should reject row with neither email nor phone')
  })

  it('role CHECK constraint rejects invalid value', async () => {
    const threw = await throws(
      () => q(`INSERT INTO users (email, password_hash, role) VALUES ('test-role@x.com', 'h', 'SUPERUSER')`),
    )
    assert.ok(threw)
  })

  it('status CHECK constraint rejects invalid value', async () => {
    const threw = await throws(
      () => q(`INSERT INTO users (email, password_hash, status) VALUES ('test-status@x.com', 'h', 'BANNED')`),
    )
    assert.ok(threw)
  })

  it('default role is USER', async () => {
    const row = await one(
      `INSERT INTO users (email, password_hash) VALUES ('test-role-default@x.com', 'h') RETURNING role`,
    )
    assert.equal(row.role, 'USER')
    await q(`DELETE FROM users WHERE email = 'test-role-default@x.com'`)
  })
})

// ── 4. categories table ───────────────────────────────────────────────────────

describe('categories table', () => {
  it('slug must be unique', async () => {
    await q(`INSERT INTO categories (name, slug) VALUES ('Test A', 'test-slug-dup')`)
    const threw = await throws(
      () => q(`INSERT INTO categories (name, slug) VALUES ('Test B', 'test-slug-dup')`),
      'unique',
    )
    assert.ok(threw)
    await q(`DELETE FROM categories WHERE slug = 'test-slug-dup'`)
  })

  it('parent_id self-reference works', async () => {
    const parent = await one(
      `INSERT INTO categories (name, slug) VALUES ('Test Parent', 'test-parent-cat') RETURNING id`,
    )
    const child = await one(
      `INSERT INTO categories (name, slug, parent_id) VALUES ('Test Child', 'test-child-cat', $1) RETURNING id, parent_id`,
      [parent.id],
    )
    assert.equal(child.parent_id, parent.id)
    // Clean up (child first, then parent — FK constraint)
    await q(`DELETE FROM categories WHERE id = $1`, [child.id])
    await q(`DELETE FROM categories WHERE id = $1`, [parent.id])
  })

  it('invalid parent_id is rejected', async () => {
    const threw = await throws(
      () =>
        q(`INSERT INTO categories (name, slug, parent_id) VALUES ('Orphan', 'test-orphan-cat', gen_random_uuid())`),
    )
    assert.ok(threw, 'Should reject non-existent parent_id')
  })

  it('is_active defaults to TRUE', async () => {
    const row = await one(
      `INSERT INTO categories (name, slug) VALUES ('Test Active', 'test-active-cat') RETURNING is_active`,
    )
    assert.equal(row.is_active, true)
    await q(`DELETE FROM categories WHERE slug = 'test-active-cat'`)
  })
})

// ── 5. locations table ────────────────────────────────────────────────────────

describe('locations table', () => {
  it('inserts a full location row', async () => {
    const row = await one(`
      INSERT INTO locations (country, region, city, address, latitude, longitude)
      VALUES ('Ethiopia', 'Addis Ababa', 'Addis Ababa', '123 Main St', 9.0320, 38.7469)
      RETURNING id, latitude, longitude
    `)
    assert.match(row.id, /^[0-9a-f-]{36}$/)
    assert.equal(parseFloat(row.latitude), 9.032)
    await q(`DELETE FROM locations WHERE id = $1`, [row.id])
  })

  it('rejects latitude out of range', async () => {
    const threw = await throws(
      () =>
        q(`INSERT INTO locations (latitude, longitude) VALUES (95, 38)`),
    )
    assert.ok(threw, 'latitude > 90 should be rejected')
  })

  it('rejects longitude out of range', async () => {
    const threw = await throws(
      () =>
        q(`INSERT INTO locations (latitude, longitude) VALUES (9, 200)`),
    )
    assert.ok(threw, 'longitude > 180 should be rejected')
  })
})

// ── 6. Full profile lifecycle ─────────────────────────────────────────────────

describe('Profile → User relationship', () => {
  // Each test creates its own isolated fixtures using a unique suffix
  async function makeFixtures(suffix) {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ($1, 'h') RETURNING id`, [`test-profile-${suffix}@x.com`])
    const c = await one(`INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id`, [`Test Prof Cat ${suffix}`, `test-prof-cat-${suffix}`])
    const l = await one(`INSERT INTO locations (city, latitude, longitude) VALUES ('Addis Ababa', 9.03, 38.74) RETURNING id`)
    const p = await one(`
      INSERT INTO profiles (user_id, display_name, slug, category_id, location_id)
      VALUES ($1, 'Test Provider', $2, $3, $4) RETURNING id
    `, [u.id, `test-provider-${suffix}`, c.id, l.id])
    return { userId: u.id, categoryId: c.id, locationId: l.id, profileId: p.id }
  }

  it('profile is linked to user', async () => {
    const { userId, profileId } = await makeFixtures('linked')
    const row = await one(`SELECT user_id FROM profiles WHERE id = $1`, [profileId])
    assert.equal(row.user_id, userId)
    await q(`DELETE FROM users WHERE id = $1`, [userId])
    await q(`DELETE FROM categories WHERE slug = 'test-prof-cat-linked'`)
  })

  it('slug must be unique', async () => {
    const { userId, profileId } = await makeFixtures('slug-uniq')
    const u2 = await one(`INSERT INTO users (email, password_hash) VALUES ('test-profile-slug-uniq2@x.com', 'h') RETURNING id`)
    const threw = await throws(
      () => one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P2', 'test-provider-slug-uniq') RETURNING id`, [u2.id]),
      'unique',
    )
    assert.ok(threw)
    await q(`DELETE FROM users WHERE id = $1`, [u2.id])
    await q(`DELETE FROM users WHERE id = $1`, [userId])
    await q(`DELETE FROM categories WHERE slug = 'test-prof-cat-slug-uniq'`)
  })

  it('is_published defaults to FALSE', async () => {
    const { userId, profileId } = await makeFixtures('pub-default')
    const row = await one(`SELECT is_published FROM profiles WHERE id = $1`, [profileId])
    assert.equal(row.is_published, false)
    await q(`DELETE FROM users WHERE id = $1`, [userId])
    await q(`DELETE FROM categories WHERE slug = 'test-prof-cat-pub-default'`)
  })

  it('is_verified defaults to FALSE', async () => {
    const { userId, profileId } = await makeFixtures('ver-default')
    const row = await one(`SELECT is_verified FROM profiles WHERE id = $1`, [profileId])
    assert.equal(row.is_verified, false)
    await q(`DELETE FROM users WHERE id = $1`, [userId])
    await q(`DELETE FROM categories WHERE slug = 'test-prof-cat-ver-default'`)
  })

  it('profile → category relationship works', async () => {
    const { userId, categoryId, profileId } = await makeFixtures('cat-rel')
    const row = await one(`
      SELECT p.display_name, c.name AS category_name
      FROM profiles p JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1
    `, [profileId])
    assert.equal(row.category_name, 'Test Prof Cat cat-rel')
    await q(`DELETE FROM users WHERE id = $1`, [userId])
    await q(`DELETE FROM categories WHERE id = $1`, [categoryId])
  })

  it('profile → location relationship works', async () => {
    const { userId, locationId, profileId } = await makeFixtures('loc-rel')
    const row = await one(`
      SELECT p.display_name, l.city
      FROM profiles p JOIN locations l ON l.id = p.location_id
      WHERE p.id = $1
    `, [profileId])
    assert.equal(row.city, 'Addis Ababa')
    await q(`DELETE FROM users WHERE id = $1`, [userId])
    await q(`DELETE FROM categories WHERE slug = 'test-prof-cat-loc-rel'`)
    await q(`DELETE FROM locations WHERE id = $1`, [locationId])
  })

  it('deleting user cascades to profile', async () => {
    const { userId, profileId } = await makeFixtures('cascade')
    await q(`DELETE FROM users WHERE id = $1`, [userId])
    const row = await one(`SELECT id FROM profiles WHERE id = $1`, [profileId])
    assert.equal(row, undefined, 'Profile should be deleted when user is deleted')
    await q(`DELETE FROM categories WHERE slug = 'test-prof-cat-cascade'`)
  })
})

// ── 7. RESTRICT on category delete ───────────────────────────────────────────

describe('Category delete restriction', () => {
  it('cannot delete a category that has profiles', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-restrict@x.com', 'h') RETURNING id`)
    const c = await one(`INSERT INTO categories (name, slug) VALUES ('Test Restrict', 'test-restrict-cat') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug, category_id) VALUES ($1, 'P', 'test-restrict-slug', $2) RETURNING id`, [u.id, c.id])

    const threw = await throws(
      () => q(`DELETE FROM categories WHERE id = $1`, [c.id]),
    )
    assert.ok(threw, 'Should RESTRICT category delete when profiles reference it')

    // Clean up — delete profile first, then category
    await q(`DELETE FROM profiles  WHERE id = $1`, [p.id])
    await q(`DELETE FROM categories WHERE id = $1`, [c.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })
})

// ── 8. Profile ↔ Services many-to-many ───────────────────────────────────────

describe('Profile ↔ Services (many-to-many)', () => {
  it('a profile can be associated with multiple services', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-svc@x.com', 'h') RETURNING id`)
    const c = await one(`INSERT INTO categories (name, slug) VALUES ('Test Svc Cat', 'test-svc-cat') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug, category_id) VALUES ($1, 'P', 'test-svc-slug', $2) RETURNING id`, [u.id, c.id])
    const s1 = await one(`INSERT INTO services (name, slug, category_id) VALUES ('Test Svc 1', 'test-svc-1', $1) RETURNING id`, [c.id])
    const s2 = await one(`INSERT INTO services (name, slug, category_id) VALUES ('Test Svc 2', 'test-svc-2', $1) RETURNING id`, [c.id])

    await q(`INSERT INTO profile_services (profile_id, service_id) VALUES ($1, $2), ($1, $3)`, [p.id, s1.id, s2.id])

    const result = await q(`SELECT service_id FROM profile_services WHERE profile_id = $1 ORDER BY created_at`, [p.id])
    assert.equal(result.rows.length, 2)

    // Cleanup cascade — deleting profile removes profile_services
    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    const after = await q(`SELECT * FROM profile_services WHERE profile_id = $1`, [p.id])
    assert.equal(after.rows.length, 0, 'profile_services should cascade on profile delete')

    await q(`DELETE FROM services WHERE id IN ($1, $2)`, [s1.id, s2.id])
    await q(`DELETE FROM categories WHERE id = $1`, [c.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })

  it('duplicate profile_service entry is rejected', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-dup-svc@x.com', 'h') RETURNING id`)
    const c = await one(`INSERT INTO categories (name, slug) VALUES ('Test Dup Svc Cat', 'test-dup-svc-cat') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug, category_id) VALUES ($1, 'P', 'test-dup-svc-slug', $2) RETURNING id`, [u.id, c.id])
    const s = await one(`INSERT INTO services (name, slug, category_id) VALUES ('Test Dup Svc', 'test-dup-svc', $1) RETURNING id`, [c.id])

    await q(`INSERT INTO profile_services (profile_id, service_id) VALUES ($1, $2)`, [p.id, s.id])
    const threw = await throws(
      () => q(`INSERT INTO profile_services (profile_id, service_id) VALUES ($1, $2)`, [p.id, s.id]),
      'duplicate',
    )
    assert.ok(threw)

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    await q(`DELETE FROM services WHERE id = $1`, [s.id])
    await q(`DELETE FROM categories WHERE id = $1`, [c.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })
})

// ── 9. Business hours ─────────────────────────────────────────────────────────

describe('Business hours', () => {
  it('can insert a full week of hours for a profile', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-hours@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-hours-slug') RETURNING id`, [u.id])

    for (let day = 0; day <= 6; day++) {
      await q(`INSERT INTO business_hours (profile_id, day_of_week, opens_at, closes_at) VALUES ($1, $2, '09:00', '18:00')`, [p.id, day])
    }

    const result = await q(`SELECT * FROM business_hours WHERE profile_id = $1 ORDER BY day_of_week`, [p.id])
    assert.equal(result.rows.length, 7)

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })

  it('unique(profile_id, day_of_week) constraint is enforced', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-hours-dup@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-hours-dup-slug') RETURNING id`, [u.id])

    await q(`INSERT INTO business_hours (profile_id, day_of_week, opens_at, closes_at) VALUES ($1, 1, '09:00', '18:00')`, [p.id])
    const threw = await throws(
      () => q(`INSERT INTO business_hours (profile_id, day_of_week, opens_at, closes_at) VALUES ($1, 1, '10:00', '19:00')`, [p.id]),
      'unique',
    )
    assert.ok(threw)

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })

  it('day_of_week CHECK rejects values outside 0-6', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-day-check@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-day-check-slug') RETURNING id`, [u.id])

    const threw = await throws(
      () => q(`INSERT INTO business_hours (profile_id, day_of_week) VALUES ($1, 7)`, [p.id]),
    )
    assert.ok(threw, 'day_of_week = 7 should be rejected')

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })

  it('business_hours cascade-delete with profile', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-hours-cascade@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-hours-cascade-slug') RETURNING id`, [u.id])
    await q(`INSERT INTO business_hours (profile_id, day_of_week) VALUES ($1, 0)`, [p.id])

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    const result = await q(`SELECT * FROM business_hours WHERE profile_id = $1`, [p.id])
    assert.equal(result.rows.length, 0, 'Hours should be deleted when profile is deleted')

    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })
})

// ── 10. Social links ──────────────────────────────────────────────────────────

describe('Social links', () => {
  it('one row per platform per profile', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-social@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-social-slug') RETURNING id`, [u.id])

    await q(`INSERT INTO social_links (profile_id, platform, url) VALUES ($1, 'INSTAGRAM', 'https://instagram.com/test')`, [p.id])
    const threw = await throws(
      () => q(`INSERT INTO social_links (profile_id, platform, url) VALUES ($1, 'INSTAGRAM', 'https://instagram.com/test2')`, [p.id]),
      'unique',
    )
    assert.ok(threw, 'Duplicate platform per profile should be rejected')

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })

  it('platform CHECK constraint rejects unknown platforms', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-platform@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-platform-slug') RETURNING id`, [u.id])

    const threw = await throws(
      () => q(`INSERT INTO social_links (profile_id, platform, url) VALUES ($1, 'MYSPACE', 'https://myspace.com/test')`, [p.id]),
    )
    assert.ok(threw, 'Unknown platform should be rejected')

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })

  it('social_links cascade-delete with profile', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-social-cascade@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-social-cascade-slug') RETURNING id`, [u.id])
    await q(`INSERT INTO social_links (profile_id, platform, url) VALUES ($1, 'FACEBOOK', 'https://fb.com/test')`, [p.id])

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    const result = await q(`SELECT * FROM social_links WHERE profile_id = $1`, [p.id])
    assert.equal(result.rows.length, 0)

    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })
})

// ── 11. Profile images ────────────────────────────────────────────────────────

describe('Profile images', () => {
  it('can insert multiple images for a profile', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-img@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-img-slug') RETURNING id`, [u.id])

    await q(`INSERT INTO profile_images (profile_id, image_url, sort_order, is_primary) VALUES ($1, 'https://cdn.x.com/1.jpg', 0, TRUE)`, [p.id])
    await q(`INSERT INTO profile_images (profile_id, image_url, sort_order) VALUES ($1, 'https://cdn.x.com/2.jpg', 1)`, [p.id])
    await q(`INSERT INTO profile_images (profile_id, image_url, sort_order) VALUES ($1, 'https://cdn.x.com/3.jpg', 2)`, [p.id])

    const result = await q(`SELECT * FROM profile_images WHERE profile_id = $1 ORDER BY sort_order`, [p.id])
    assert.equal(result.rows.length, 3)
    assert.equal(result.rows[0].is_primary, true)
    assert.equal(result.rows[1].is_primary, false)

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })

  it('profile_images cascade-delete with profile', async () => {
    const u = await one(`INSERT INTO users (email, password_hash) VALUES ('test-img-cascade@x.com', 'h') RETURNING id`)
    const p = await one(`INSERT INTO profiles (user_id, display_name, slug) VALUES ($1, 'P', 'test-img-cascade-slug') RETURNING id`, [u.id])
    await q(`INSERT INTO profile_images (profile_id, image_url) VALUES ($1, 'https://cdn.x.com/x.jpg')`, [p.id])

    await q(`DELETE FROM profiles WHERE id = $1`, [p.id])
    const result = await q(`SELECT * FROM profile_images WHERE profile_id = $1`, [p.id])
    assert.equal(result.rows.length, 0)

    await q(`DELETE FROM users WHERE id = $1`, [u.id])
  })
})

// ── 12. Seed data sanity checks ───────────────────────────────────────────────

describe('Seed data', () => {
  it('top-level categories exist', async () => {
    const result = await q(`SELECT slug FROM categories WHERE parent_id IS NULL AND is_active = TRUE ORDER BY slug`)
    assert.ok(result.rows.length >= 5, `Expected at least 5 top-level categories, got ${result.rows.length}`)
  })

  it('plumbing is a child of home-services', async () => {
    const row = await one(`
      SELECT c.slug, p.slug AS parent_slug
      FROM categories c
      JOIN categories p ON p.id = c.parent_id
      WHERE c.slug = 'plumbing'
    `)
    assert.ok(row, 'plumbing category should exist')
    assert.equal(row.parent_slug, 'home-services')
  })

  it('services are linked to their categories', async () => {
    const result = await q(`
      SELECT s.slug, c.slug AS category_slug
      FROM services s JOIN categories c ON c.id = s.category_id
      WHERE s.slug = 'pipe-repair'
    `)
    assert.ok(result.rows.length === 1)
    assert.equal(result.rows[0].category_slug, 'plumbing')
  })

  it('at least 20 services are seeded', async () => {
    const row = await one(`SELECT COUNT(*)::int AS cnt FROM services`)
    assert.ok(row.cnt >= 20, `Expected >= 20 services, got ${row.cnt}`)
  })
})
