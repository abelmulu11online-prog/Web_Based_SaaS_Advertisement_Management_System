/**
 * i18n.js — i18next configuration for GebetaPro.
 *
 * Languages:
 *   en — English (default / neutral fallback)
 *   am — አማርኛ (Amharic)   — Amhara region & Addis Ababa
 *   om — Afaan Oromoo      — Oromia region
 *   ti — ትግርኛ (Tigrinya)  — Tigray region
 *
 * Language detection priority:
 *   1. localStorage (manual user override: gebetapro_lang)
 *   2. GPS geolocation → coordinate bounds / reverse-geocode → Ethiopian region mapping
 *   3. Browser navigator.language
 *   4. Fallback: 'en'
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import am from './locales/am.json'
import om from './locales/om.json'
import ti from './locales/ti.json'

export const STORAGE_KEY   = 'gebetapro_lang'
export const AUTO_LANG_KEY = 'gebetapro_auto_lang'
export const SUPPORTED     = ['en', 'am', 'om', 'ti']

/**
 * Deterministic coordinate-based detection for Ethiopian regions.
 * Works 100% offline, zero latency, no external API failures.
 */
export function detectLangFromCoords(lat, lon) {
  if (lat == null || lon == null) return null
  const la = Number(lat)
  const lo = Number(lon)

  // Addis Ababa metropolitan area (approx 8.83 to 9.10 N, 38.65 to 38.93 E)
  // Amharic is the primary administrative and lingua franca in Addis Ababa
  if (la >= 8.83 && la <= 9.10 && lo >= 38.65 && lo <= 38.93) {
    return 'am'
  }

  // Tigray region (North Ethiopia)
  // Approx: lat 12.5 - 14.95, lon 36.4 - 40.1
  if (la >= 12.5 && la <= 14.95 && lo >= 36.4 && lo <= 40.1) {
    if (la >= 13.6 || (la >= 12.8 && lo >= 38.5)) return 'ti'
  }

  // Amhara region (Bahir Dar, Gondar, Dessie, Debre Birhan, Debre Markos, Lalibela, etc.)
  // Approx: lat 9.2 - 13.8, lon 35.8 - 40.3
  if (la >= 9.2 && la <= 13.8 && lo >= 35.8 && lo <= 40.3) {
    // Exclude central Oromia south/east of Addis
    if (!(la < 9.15 && lo > 38.8)) {
      return 'am'
    }
  }

  // Oromia region (surrounding, East, West, South Ethiopia)
  if (la >= 3.4 && la <= 10.5 && lo >= 34.1 && lo <= 42.9) {
    return 'om'
  }

  return null
}

/**
 * Map address object or string from reverse-geocoding → language code.
 * Checks English, Amharic Ge'ez script, and ISO 3166-2 regional codes.
 */
export function regionToLang(addressData) {
  if (!addressData) return null

  let str = ''
  let iso = ''
  if (typeof addressData === 'object') {
    iso = (addressData['ISO3166-2-lvl4'] || addressData.iso || '').toUpperCase()
    str = [
      addressData.state,
      addressData.region,
      addressData.county,
      addressData.state_district,
      addressData.city,
      addressData.town,
      addressData.display_name,
    ].filter(Boolean).join(' ').toLowerCase()
  } else {
    str = String(addressData).toLowerCase()
  }

  // 1. ISO-3166-2 check (most accurate when provided by OSM)
  if (iso === 'ET-AM') return 'am'
  if (iso === 'ET-OR') return 'om'
  if (iso === 'ET-TI') return 'ti'
  if (iso === 'ET-AA') return 'am'

  // 2. Amhara / አማራ (Bahir Dar, Gondar, Dessie, Lalibela, Debre Birhan, etc.)
  if (
    str.includes('amhara') ||
    str.includes('amara') ||
    str.includes('አማራ') ||
    str.includes('bahir dar') ||
    str.includes('ባሕር ዳር') ||
    str.includes('ጎንደር') ||
    str.includes('gondar') ||
    str.includes('ደሴ') ||
    str.includes('dessie') ||
    str.includes('lalibela') ||
    str.includes('ላሊበላ')
  ) {
    return 'am'
  }

  // 3. Tigray / ትግራይ (Mekelle, Axum, Adwa, Shire, etc.)
  if (
    str.includes('tigray') ||
    str.includes('tigrai') ||
    str.includes('tegray') ||
    str.includes('ትግራይ') ||
    str.includes('ትግሬ') ||
    str.includes('መቐለ') ||
    str.includes('mekelle') ||
    str.includes('axum') ||
    str.includes('አክሱም')
  ) {
    return 'ti'
  }

  // 4. Oromia / ኦሮሚያ (Adama, Jimma, Bishoftu, etc.)
  if (
    str.includes('oromia') ||
    str.includes('oromiya') ||
    str.includes('oromiyaa') ||
    str.includes('ኦሮሚያ') ||
    str.includes('adama') ||
    str.includes('አዳማ') ||
    str.includes('jimma') ||
    str.includes('ጂማ') ||
    str.includes('bishoftu') ||
    str.includes('ቢሾፍቱ')
  ) {
    return 'om'
  }

  // 5. Addis Ababa / አዲስ አበባ
  if (
    str.includes('addis') ||
    str.includes('አዲስ አበባ') ||
    str.includes('finfinne') ||
    str.includes('finfinnee')
  ) {
    return 'am'
  }

  return null
}

/**
 * Reverse-geocode lat/lon using multiple fallbacks:
 * 1. Backend proxy (/api/locations/reverse)
 * 2. BigDataCloud client API (CORS-friendly, no key required)
 * 3. OpenStreetMap Nominatim (browser CORS compliant)
 */
async function reverseGeocode(lat, lon) {
  // 1. Try our backend proxy first
  try {
    const res = await fetch(`/api/locations/reverse?lat=${lat}&lng=${lon}`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const json = await res.json()
      if (json?.data?.address) {
        return json.data.address
      }
    }
  } catch {
    // Ignore and proceed to next fallback
  }

  // 2. Try BigDataCloud
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    const res = await fetch(bdcUrl, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      return {
        state: data.principalSubdivision,
        city: data.locality,
        country: data.countryName,
      }
    }
  } catch {
    // Ignore and proceed to next fallback
  }

  // 3. Try Nominatim (without forbidden User-Agent header)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=8&addressdetails=1`
    const res = await fetch(nomUrl, {
      headers: { 'Accept-Language': 'en,am' },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = await res.json()
      return data?.address || data?.display_name || null
    }
  } catch {
    // Ignore
  }

  return null
}

/**
 * Request GPS, resolve region, and apply the region-mapped language.
 * @param {boolean} force - If true, bypasses previous stored manual preferences
 */
export async function detectAndApplyGeoLanguage(force = false) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords

        // Step 1: Instant mathematical coordinate check
        let lang = detectLangFromCoords(latitude, longitude)

        // Step 2: Reverse geocode to confirm or refine
        const address = await reverseGeocode(latitude, longitude)
        const geocodeLang = regionToLang(address)

        if (geocodeLang) {
          lang = geocodeLang
        }

        lang = lang || 'en'

        // Save auto-detected language
        localStorage.setItem(AUTO_LANG_KEY, lang)
        if (force) {
          // If forced, clear manual override so user remains on location-detected mode
          localStorage.removeItem(STORAGE_KEY)
        }

        if (lang !== i18n.language) {
          await i18n.changeLanguage(lang)
        }

        resolve({ success: true, lang, coords: { latitude, longitude }, address })
      },
      (err) => {
        console.warn('[i18n] Geolocation access error:', err?.message)
        resolve(null)
      },
      { timeout: 10000, maximumAge: 60_000, enableHighAccuracy: true }
    )
  })
}

/**
 * Synchronous first-pass language detection.
 * GPS detection is async and runs after init.
 */
function detectLanguage() {
  // 1. Manual override wins unconditionally
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED.includes(stored)) return stored

  // 2. Auto-detected language
  const auto = localStorage.getItem(AUTO_LANG_KEY)
  if (auto && SUPPORTED.includes(auto)) return auto

  // 3. Browser language hint
  const browser = navigator.language?.split('-')[0]
  if (SUPPORTED.includes(browser)) return browser

  return 'en'
}

/* ── i18next initialisation ──────────────────────────────────────────────── */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      om: { translation: om },
      ti: { translation: ti },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: { useSuspense: false },
  })

/* ── GPS-based auto-detection ────────────────────────────────────────────── */
const hasManualPref = SUPPORTED.includes(localStorage.getItem(STORAGE_KEY))
if (!hasManualPref) {
  detectAndApplyGeoLanguage()
}

export default i18n
