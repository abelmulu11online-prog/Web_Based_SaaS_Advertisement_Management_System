/**
 * database/seed_images.js
 *
 * Updates existing seed profiles with real avatar_url and cover_url images
 * sourced from Unsplash (free, no-auth CDN URLs).
 *
 * Usage:
 *   node database/seed_images.js
 */

import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('[seed_images] DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })

// Unsplash CDN: w=400 for avatar, w=1200&h=400&fit=crop for cover
const U = (id, w = 400, h = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`

const UC = (id) => U(id, 1200, 400)  // cover image helper

// ── Profile image data ────────────────────────────────────────────────────────
// slug → { avatar_url, cover_url }
const PROFILE_IMAGES = {

  // ── Home Services ──────────────────────────────────────────────────────────
  'abebe-plumbing': {
    avatar_url: U('1558618666-fcd25c85cd64'),
    cover_url:  UC('1504328345936-525aa2d8b9d6'),
  },
  'tigist-electrical': {
    avatar_url: U('1621905251189-08b45d6a269e'),
    cover_url:  UC('1558449028-90aed4338d28'),
  },
  'samuel-cleaning-co': {
    avatar_url: U('1581578731548-c64695cc6952'),
    cover_url:  UC('1527515862127-a4fc93a693f8'),
  },
  'meron-painting': {
    avatar_url: U('1562259929-b4e1fd3aef09'),
    cover_url:  UC('1586023492125-27264f3ec1e9'),
  },
  'yonas-garden-landscape': {
    avatar_url: U('1416879595882-3373a0480b5b'),
    cover_url:  UC('1558904541-efa843a96f01'),
  },

  // ── Food & Beverage ────────────────────────────────────────────────────────
  'selam-habesha-kitchen': {
    avatar_url: U('1567620905732-2d1ec7ab7445'),
    cover_url:  UC('1504674900247-0877df9cc836'),
  },
  'dawit-specialty-coffee': {
    avatar_url: U('1495474472287-4d71bcdd2085'),
    cover_url:  UC('1442512595331-8f998af22731'),
  },
  'hiwot-artisan-bakery': {
    avatar_url: U('1509440159596-0249088772ff'),
    cover_url:  UC('1517686469429-8bdb88b9f907'),
  },
  'girma-events-catering': {
    avatar_url: U('1555244162-803834f70033'),
    cover_url:  UC('1414235077428-338989a2e8c0'),
  },
  'fikirte-street-bites': {
    avatar_url: U('1504544750208-dc0358e63f7f'),
    cover_url:  UC('1568901346375-23c9450c58cd'),
  },

  // ── Professional Services ──────────────────────────────────────────────────
  'belay-law-office': {
    avatar_url: U('1589829545856-d10d557cf95f'),
    cover_url:  UC('1436450412741-6b79e17512d4'),
  },
  'rahel-tax-finance': {
    avatar_url: U('1554224155-6726b3ff858f'),
    cover_url:  UC('1450101499163-c8848c66ca85'),
  },
  'daniel-business-solutions': {
    avatar_url: U('1542744094-3a31f272c490'),
    cover_url:  UC('1497366216548-37526070297c'),
  },
  'almaz-general-clinic': {
    avatar_url: U('1576091160550-2173dba999ef'),
    cover_url:  UC('1519494026892-476f6045a2f1'),
  },

  // ── Beauty & Wellness ──────────────────────────────────────────────────────
  'seble-beauty-salon': {
    avatar_url: U('1522337360788-8b13dee7a37e'),
    cover_url:  UC('1560066984-138dadb4c035'),
  },
  'biruk-kings-barber': {
    avatar_url: U('1503951914875-452162b0f3f1'),
    cover_url:  UC('1599351431202-1d0a0a1df55a'),
  },
  'tsehay-wellness-spa': {
    avatar_url: U('1600334129128-685c5582fd35'),
    cover_url:  UC('1540555700478-4be289fbecef'),
  },
  'kidus-fitness-center': {
    avatar_url: U('1534438327276-14e5300c3a48'),
    cover_url:  UC('1571902943202-507ec2618e8f'),
  },
  'betlhem-nail-studio': {
    avatar_url: U('1604654894610-df63bc536371'),
    cover_url:  UC('1522338242992-b7b43f45a4c2'),
  },

  // ── Education & Tutoring ───────────────────────────────────────────────────
  'fasil-academic-tutoring': {
    avatar_url: U('1503676260728-1c00da094a0b'),
    cover_url:  UC('1488521787991-ed7bbaae773c'),
  },
  'saron-music-school': {
    avatar_url: U('1493225457124-a3eb161ffa5f'),
    cover_url:  UC('1520523839897-bd0b52f945a0'),
  },
  'eyob-language-center': {
    avatar_url: U('1456513080510-7bf3a84b82f8'),
    cover_url:  UC('1434030216411-0b793f4b6f74'),
  },

  // ── Technology & Repair ────────────────────────────────────────────────────
  'natnael-tech-repair': {
    avatar_url: U('1512941937669-90a1b58e7e9c'),
    cover_url:  UC('1518770660439-4636190af475'),
  },
  'dagim-web-studio': {
    avatar_url: U('1498050108023-c5249f4df085'),
    cover_url:  UC('1461749280684-dccba630e2f6'),
  },
  'eden-software-solutions': {
    avatar_url: U('1461749280684-dccba630e2f6'),
    cover_url:  UC('1555949963-ff9fe0c870ba'),
  },

  // ── Transport & Logistics ──────────────────────────────────────────────────
  'habtamu-private-driver': {
    avatar_url: U('1449965408869-eaa3f722e40d'),
    cover_url:  UC('1485291571150-772eaa2d7a5c'),
  },
  'tewodros-moving-service': {
    avatar_url: U('1558618047-3c8c41e4a09c'),
    cover_url:  UC('1600880292203-757bb62b4baf'),
  },
  'meseret-fast-delivery': {
    avatar_url: U('1526367790999-0150786686a2'),
    cover_url:  UC('1578575437130-527eed3abbec'),
  },

  // ── Creative & Media ───────────────────────────────────────────────────────
  'alem-photography-studio': {
    avatar_url: U('1516035069371-29a1b244cc32'),
    cover_url:  UC('1452802447250-470a88ac82bc'),
  },
  'liya-graphic-design': {
    avatar_url: U('1561070791-2526d30994b5'),
    cover_url:  UC('1558655146-9f40138edfeb'),
  },
  'brook-video-production': {
    avatar_url: U('1601506521793-dc748fc80b67'),
    cover_url:  UC('1492691527719-9d1e07e534b4'),
  },

  // ── Construction & Trades ──────────────────────────────────────────────────
  'solomon-construction': {
    avatar_url: U('1504307651254-35680f356dfd'),
    cover_url:  UC('1503387762-592deb58ef4e'),
  },
  'muluken-tiling-flooring': {
    avatar_url: U('1545269776-fbe4f2ad2d27'),
    cover_url:  UC('1600585154526-990dced4db0d'),
  },
  'henok-roofing-works': {
    avatar_url: U('1600585154340-be6161a56a0c'),
    cover_url:  UC('1504328345936-525aa2d8b9d6'),
  },
  'amanuel-metal-works': {
    avatar_url: U('1504917595217-d4dc5ebe6122'),
    cover_url:  UC('1556761175-5973dc0f32e7'),
  },

  // ── Retail & Shops ─────────────────────────────────────────────────────────
  'tigstu-general-store': {
    avatar_url: U('1534452203293-dd4d3b062c89'),
    cover_url:  UC('1472851294608-062f824d29cc'),
  },
  'shewaye-fashion-boutique': {
    avatar_url: U('1567401893414-76b7b1e5a7a5'),
    cover_url:  UC('1441986380878-c4248f5b8b5b'),
  },
  'wubit-electronics-store': {
    avatar_url: U('1526738549149-8e07eca56323'),
    cover_url:  UC('1518770660439-4636190af475'),
  },
  'beletu-shop-owner': {
    avatar_url: U('1519058082350-08716243f91a'),
    cover_url:  UC('1472851294608-062f824d29cc'),
  },

  // ── Fitness (user-created) ─────────────────────────────────────────────────
  'amen-fitness-and-gym': {
    avatar_url: U('1534438327276-14e5300c3a48'),
    cover_url:  UC('1571902943202-507ec2618e8f'),
  },

  // ── Cafe (user-created) ────────────────────────────────────────────────────
  'cafe': {
    avatar_url: U('1495474472287-4d71bcdd2085'),
    cover_url:  UC('1442512595331-8f998af22731'),
  },

  // ── Personal profiles ──────────────────────────────────────────────────────
  'abel-mulu': {
    avatar_url: U('1507003211169-0a1dd7228f2d'),
    cover_url:  UC('1497366216548-37526070297c'),
  },
  'abel': {
    avatar_url: U('1507003211169-0a1dd7228f2d'),
    cover_url:  UC('1497366216548-37526070297c'),
  },
  'abelhjfh': {
    avatar_url: U('1507003211169-0a1dd7228f2d'),
    cover_url:  UC('1497366216548-37526070297c'),
  },
  'sport': {
    avatar_url: U('1534438327276-14e5300c3a48'),
    cover_url:  UC('1571902943202-507ec2618e8f'),
  },
}

// ── Updater ───────────────────────────────────────────────────────────────────

async function updateImages() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let updated = 0
    let skipped = 0

    for (const [slug, images] of Object.entries(PROFILE_IMAGES)) {
      const result = await client.query(
        `UPDATE profiles
         SET avatar_url = $1,
             cover_url  = $2,
             updated_at = now()
         WHERE slug = $3
         RETURNING id, display_name`,
        [images.avatar_url, images.cover_url, slug],
      )

      if (result.rowCount > 0) {
        console.log(`  ✓ ${result.rows[0].display_name} (${slug})`)
        updated++
      } else {
        console.log(`  ⚠ No profile found for slug: ${slug}`)
        skipped++
      }
    }

    await client.query('COMMIT')
    console.log(`\n[seed_images] Done. Updated: ${updated}, Not found: ${skipped}`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[seed_images] Failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

console.log('[seed_images] Updating profile images...\n')
updateImages().catch((err) => {
  console.error('[seed_images] Fatal:', err.message)
  process.exit(1)
})
