/**
 * searchTermMap.js
 *
 * Maps every translated display term → the canonical English string
 * the backend's ILIKE query actually searches against.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The backend does:
 *   display_name ILIKE '%<term>%'  OR  c.name ILIKE '%<term>%'  OR …
 *
 * All profile data in the database is stored in English/Latin script.
 * When the UI language is Amharic, displayed strings are Amharic text,
 * so clicking "ኤሌክትሪሽያን" would send that Amharic string to the DB — no match.
 *
 * The fix: look up any search term against this map before sending it to the
 * API.  If a mapping exists, send the English value.  If not (user typed
 * freeform text), pass the raw input unchanged — the user knows what they typed.
 *
 * HOW TO MAINTAIN
 * ───────────────
 * Any time a new translated popular search / city name / profile type label
 * is added to en.json / am.json, add its mapping here.
 */

/**
 * Flat lookup: translated string (any language) → English canonical term
 * Keys are lower-cased for case-insensitive matching.
 */
const RAW_MAP = {
  // ── Popular searches ──────────────────────────────────────────────────────

  // Amharic → English
  'ኤሌክትሪሽያን':  'Electrician',
  'ቧንቧ ሠራተኛ':  'Plumber',
  'ጠበቃ':         'Lawyer',
  'ሬስቶራንት':    'Restaurant',
  'ፎቶግራፈር':    'Photographer',
  'አስተማሪ':      'Tutor',
  'ዶክተር':       'Doctor',
  'አሽከርካሪ':    'Driver',

  // English (already correct, but included for completeness — map to self)
  'electrician':  'Electrician',
  'plumber':      'Plumber',
  'lawyer':       'Lawyer',
  'restaurant':   'Restaurant',
  'photographer': 'Photographer',
  'tutor':        'Tutor',
  'doctor':       'Doctor',
  'driver':       'Driver',

  // ── City names ────────────────────────────────────────────────────────────

  // Amharic → English (matches p.city ILIKE '%…%' in the DB)
  'አዲስ አበባ':  'Addis Ababa',
  'ጎንደር':      'Gondar',
  'ሐዋሳ':       'Hawassa',
  'ባህር ዳር':   'Bahir Dar',
  'መቐለ':       'Mekelle',
  'ድሬ ዳዋ':    'Dire Dawa',
  'ጅማ':        'Jimma',
  'አዳማ':       'Adama',

  // ── Profile type labels ───────────────────────────────────────────────────
  // (Profile type filtering uses the enum value, not free-text search, so
  // these are here only in case they're ever used in a search context.)

  'ባለሙያ':            'Professional',
  'ፍሪላንሰር':         'Freelancer',
  'ንግድ':              'Business',
  'ሱቅ':               'Shop',
  'ኩባንያ':            'Company',
  'ድርጅት':            'Organization',
  'ግለሰብ':            'Personal',
}

/**
 * Returns the canonical English search term for a given display string,
 * or the original string if no mapping is found.
 *
 * @param {string} term  - Any display-language search term
 * @returns {string}     - English term the backend can ILIKE-match
 */
export function toEnglishSearchTerm(term) {
  if (!term) return term
  const trimmed = term.trim()
  // Exact match first (preserves case for the lookup)
  if (RAW_MAP[trimmed]) return RAW_MAP[trimmed]
  // Lower-case fallback
  const lower = trimmed.toLowerCase()
  return RAW_MAP[lower] || trimmed
}

/**
 * Normalise a city string before sending it to the `city` filter param.
 * Amharic city names are mapped to their English equivalents so that
 * `p.city ILIKE '%Addis Ababa%'` actually matches the stored data.
 *
 * @param {string} city
 * @returns {string}
 */
export function toEnglishCity(city) {
  return toEnglishSearchTerm(city)
}
