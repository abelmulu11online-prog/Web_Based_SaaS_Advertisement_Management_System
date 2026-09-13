/**
 * database/seed.js — Reference data seeder.
 *
 * Seeds categories and services only.
 * Safe to run repeatedly — uses INSERT ... ON CONFLICT DO NOTHING.
 *
 * Usage:
 *   node database/seed.js
 */

import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('[seed] DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })

// ── Seed data ─────────────────────────────────────────────────────────────────

/**
 * Each entry: { slug, name, description, icon, parentSlug? }
 * Parent entries must come before their children.
 */
const CATEGORIES = [
  // ── Top-level ─────────────────────────────────────────────────────────────
  { slug: 'home-services',        name: 'Home Services',       description: 'Maintenance, repair, and improvement services for your home', icon: '🏠' },
  { slug: 'food-beverage',        name: 'Food & Beverage',     description: 'Restaurants, cafes, bakeries, and food vendors', icon: '🍽️' },
  { slug: 'professional',         name: 'Professional Services', description: 'Lawyers, accountants, consultants, and specialists', icon: '💼' },
  { slug: 'beauty-wellness',      name: 'Beauty & Wellness',   description: 'Salons, spas, fitness, and personal care', icon: '💇' },
  { slug: 'education',            name: 'Education & Tutoring', description: 'Tutors, instructors, and training providers', icon: '📚' },
  { slug: 'tech',                 name: 'Technology & Repair', description: 'Computer, phone, and electronics repair and services', icon: '💻' },
  { slug: 'transport',            name: 'Transport & Logistics', description: 'Drivers, movers, delivery, and logistics', icon: '🚗' },
  { slug: 'creative',             name: 'Creative & Media',    description: 'Photography, design, video, and content creation', icon: '🎨' },
  { slug: 'construction',         name: 'Construction & Trades', description: 'Builders, contractors, and skilled tradespeople', icon: '🔨' },
  { slug: 'retail',               name: 'Retail & Shops',      description: 'Local shops, boutiques, and physical stores', icon: '🛍️' },

  // ── Home Services sub-categories ─────────────────────────────────────────
  { slug: 'plumbing',             name: 'Plumbing',            parentSlug: 'home-services' },
  { slug: 'electrical',           name: 'Electrical',          parentSlug: 'home-services' },
  { slug: 'cleaning',             name: 'Cleaning',            parentSlug: 'home-services' },
  { slug: 'painting',             name: 'Painting & Decorating', parentSlug: 'home-services' },
  { slug: 'gardening',            name: 'Gardening & Landscaping', parentSlug: 'home-services' },
  { slug: 'security-systems',     name: 'Security Systems',    parentSlug: 'home-services' },

  // ── Food & Beverage sub-categories ───────────────────────────────────────
  { slug: 'restaurants',          name: 'Restaurants',         parentSlug: 'food-beverage' },
  { slug: 'cafes',                name: 'Cafes & Coffee Shops', parentSlug: 'food-beverage' },
  { slug: 'bakeries',             name: 'Bakeries & Pastries', parentSlug: 'food-beverage' },
  { slug: 'catering',             name: 'Catering',            parentSlug: 'food-beverage' },
  { slug: 'street-food',          name: 'Street Food & Vendors', parentSlug: 'food-beverage' },

  // ── Professional sub-categories ──────────────────────────────────────────
  { slug: 'legal',                name: 'Legal Services',      parentSlug: 'professional' },
  { slug: 'accounting',           name: 'Accounting & Finance', parentSlug: 'professional' },
  { slug: 'consulting',           name: 'Business Consulting', parentSlug: 'professional' },
  { slug: 'medical',              name: 'Medical & Healthcare', parentSlug: 'professional' },

  // ── Beauty & Wellness sub-categories ─────────────────────────────────────
  { slug: 'hair-salons',          name: 'Hair Salons & Barbers', parentSlug: 'beauty-wellness' },
  { slug: 'spas',                 name: 'Spas & Massage',      parentSlug: 'beauty-wellness' },
  { slug: 'fitness',              name: 'Fitness & Gyms',      parentSlug: 'beauty-wellness' },
  { slug: 'nail-salons',          name: 'Nail Salons',         parentSlug: 'beauty-wellness' },

  // ── Technology sub-categories ─────────────────────────────────────────────
  { slug: 'phone-repair',         name: 'Phone Repair',        parentSlug: 'tech' },
  { slug: 'computer-repair',      name: 'Computer & Laptop Repair', parentSlug: 'tech' },
  { slug: 'web-development',      name: 'Web Development',     parentSlug: 'tech' },
  { slug: 'software-development', name: 'Software Development', parentSlug: 'tech' },

  // ── Creative sub-categories ───────────────────────────────────────────────
  { slug: 'photography',          name: 'Photography',         parentSlug: 'creative' },
  { slug: 'graphic-design',       name: 'Graphic Design',      parentSlug: 'creative' },
  { slug: 'videography',          name: 'Videography',         parentSlug: 'creative' },

  // ── Construction sub-categories ──────────────────────────────────────────
  { slug: 'building-construction', name: 'Building & Construction', parentSlug: 'construction' },
  { slug: 'tiling-flooring',      name: 'Tiling & Flooring',   parentSlug: 'construction' },
  { slug: 'roofing',              name: 'Roofing',             parentSlug: 'construction' },
  { slug: 'welding',              name: 'Welding & Metalwork', parentSlug: 'construction' },
]

/**
 * { slug, name, description, categorySlug }
 */
const SERVICES = [
  // Plumbing
  { slug: 'pipe-repair',           name: 'Pipe Repair',                  categorySlug: 'plumbing' },
  { slug: 'drain-cleaning',        name: 'Drain Cleaning',               categorySlug: 'plumbing' },
  { slug: 'water-heater-install',  name: 'Water Heater Installation',    categorySlug: 'plumbing' },
  { slug: 'bathroom-plumbing',     name: 'Bathroom Plumbing',            categorySlug: 'plumbing' },
  { slug: 'leak-detection',        name: 'Leak Detection & Repair',      categorySlug: 'plumbing' },

  // Electrical
  { slug: 'house-wiring',          name: 'House Wiring',                 categorySlug: 'electrical' },
  { slug: 'electrical-repair',     name: 'Electrical Repair',            categorySlug: 'electrical' },
  { slug: 'solar-installation',    name: 'Solar Panel Installation',     categorySlug: 'electrical' },
  { slug: 'generator-installation',name: 'Generator Installation',       categorySlug: 'electrical' },

  // Cleaning
  { slug: 'home-cleaning',         name: 'Home Cleaning',                categorySlug: 'cleaning' },
  { slug: 'office-cleaning',       name: 'Office Cleaning',              categorySlug: 'cleaning' },
  { slug: 'deep-cleaning',         name: 'Deep Cleaning',                categorySlug: 'cleaning' },
  { slug: 'laundry-service',       name: 'Laundry Service',              categorySlug: 'cleaning' },

  // Phone repair
  { slug: 'screen-replacement',    name: 'Screen Replacement',           categorySlug: 'phone-repair' },
  { slug: 'battery-replacement',   name: 'Battery Replacement',          categorySlug: 'phone-repair' },
  { slug: 'software-unlocking',    name: 'Software Unlocking',           categorySlug: 'phone-repair' },
  { slug: 'water-damage-repair',   name: 'Water Damage Repair',          categorySlug: 'phone-repair' },

  // Photography
  { slug: 'portrait-photography',  name: 'Portrait Photography',         categorySlug: 'photography' },
  { slug: 'event-photography',     name: 'Event Photography',            categorySlug: 'photography' },
  { slug: 'product-photography',   name: 'Product Photography',          categorySlug: 'photography' },
  { slug: 'real-estate-photography', name: 'Real Estate Photography',    categorySlug: 'photography' },

  // Web development
  { slug: 'website-design',        name: 'Website Design',               categorySlug: 'web-development' },
  { slug: 'ecommerce-development', name: 'E-commerce Development',       categorySlug: 'web-development' },
  { slug: 'website-maintenance',   name: 'Website Maintenance',          categorySlug: 'web-development' },

  // Hair salons
  { slug: 'haircut',               name: 'Haircut',                      categorySlug: 'hair-salons' },
  { slug: 'hair-coloring',         name: 'Hair Coloring',                categorySlug: 'hair-salons' },
  { slug: 'beard-trim',            name: 'Beard Trim',                   categorySlug: 'hair-salons' },

  // Catering
  { slug: 'event-catering',        name: 'Event Catering',               categorySlug: 'catering' },
  { slug: 'wedding-catering',      name: 'Wedding Catering',             categorySlug: 'catering' },
  { slug: 'office-catering',       name: 'Office Catering',              categorySlug: 'catering' },
]

// ── Seeder ────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Insert categories (parents first, then children)
    console.log('[seed] Seeding categories...')

    // Build a slug → id map as we insert
    const categoryIdBySlug = {}

    for (const cat of CATEGORIES) {
      const parentId = cat.parentSlug ? categoryIdBySlug[cat.parentSlug] : null

      const result = await client.query(
        `INSERT INTO categories (name, slug, description, icon, parent_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE
           SET name        = EXCLUDED.name,
               description = EXCLUDED.description,
               icon        = EXCLUDED.icon
         RETURNING id`,
        [cat.name, cat.slug, cat.description || null, cat.icon || null, parentId],
      )

      categoryIdBySlug[cat.slug] = result.rows[0].id
    }

    console.log(`[seed]   ✓ ${CATEGORIES.length} categories`)

    // 2. Insert services
    console.log('[seed] Seeding services...')

    for (const svc of SERVICES) {
      const categoryId = categoryIdBySlug[svc.categorySlug]
      if (!categoryId) {
        console.warn(`[seed]   ⚠ Category not found for service "${svc.slug}" (categorySlug: ${svc.categorySlug})`)
        continue
      }

      await client.query(
        `INSERT INTO services (name, slug, description, category_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE
           SET name        = EXCLUDED.name,
               description = EXCLUDED.description,
               category_id = EXCLUDED.category_id`,
        [svc.name, svc.slug, svc.description || null, categoryId],
      )
    }

    console.log(`[seed]   ✓ ${SERVICES.length} services`)

    await client.query('COMMIT')
    console.log('[seed] Seed completed successfully.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[seed] Seed failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('[seed] Fatal:', err.message)
  process.exit(1)
})
