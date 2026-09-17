/**
 * i18n.js — i18next configuration for GebetaPro.
 *
 * Languages:
 *   en — English (default / neutral fallback)
 *   am — አማርኛ (Amharic)   — Amhara region
 *   om — Afaan Oromoo      — Oromia region
 *   ti — ትግርኛ (Tigrinya)  — Tigray region
 *
 * Language detection priority:
 *   1. localStorage (manual user override) — always respected
 *   2. GPS geolocation → reverse-geocode → Ethiopian region mapping
 *   3. Browser navigator.language
 *   4. Fallback: 'en'
 *
 * Persistence: localStorage key "gebetapro_lang"
 * GPS flag:    localStorage key "gebetapro_geo_done" (skip GPS on repeat visits)
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import am from './locales/am.json'
import om from './locales/om.json'
import ti from './locales/ti.json'

const STORAGE_KEY   = 'gebetapro_lang'
const AUTO_LANG_KEY = 'gebetapro_auto_lang'
const SUPPORTED     = ['en', 'am', 'om', 'ti']

/**
 * Map Ethiopian region name (from Nominatim) → language code.
 * Nominatim returns region names in the local language or English;
 * we check for all common variants case-insensitively.
 */
function regionToLang(regionStr) {
  if (!regionStr) return null
  const r = regionStr.toLowerCase()

  // Oromia / Oromiya / Oromiyaa
  if (r.includes('oromia') || r.includes('oromiya') || r.includes('oromiyaa')) return 'om'

  // Tigray / Tigrai / Tegray
  if (r.includes('tigray') || r.includes('tigrai') || r.includes('tegray')) return 'ti'

  // Amhara / Amara
  if (r.includes('amhara') || r.includes('amara')) return 'am'

  // Addis Ababa — multilingual city, default to English
  if (r.includes('addis') || r.includes('finfinne') || r.includes('finfinnee')) return 'en'

  // All others (SNNPR, Afar, Somali, etc.) → English
  return 'en'
}

/**
 * Reverse-geocode lat/lon using Nominatim (OpenStreetMap).
 * Returns the Ethiopian region/state name, or null on failure.
 * No API key required; rate-limited to 1 req/s by Nominatim ToS.
 */
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=5&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'GebetaPro/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // Nominatim field for state/region
    return data?.address?.state || data?.address?.region || data?.address?.county || null
  } catch {
    return null
  }
}

/**
 * Request GPS, reverse-geocode, and apply the region-mapped language.
 * Called only when no manual preference is stored.
 */
async function detectAndApplyGeoLanguage() {
  if (!navigator.geolocation) return

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const region = await reverseGeocode(latitude, longitude)
        const lang   = regionToLang(region) || 'en'

        // Store so we don't ask for GPS again on next visit, but as auto-detected
        localStorage.setItem(AUTO_LANG_KEY, lang)

        // Change language if different from current
        if (lang !== i18n.language) {
          i18n.changeLanguage(lang)
        }
        resolve(lang)
      },
      () => {
        // Permission denied or unavailable — mark done with fallback to avoid re-asking
        localStorage.setItem(AUTO_LANG_KEY, 'en')
        resolve(null)
      },
      { timeout: 8000, maximumAge: 60_000 }
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

  // 3. Browser language hint (quick fallback while GPS loads)
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
    // Never suspend — always show content immediately
    react: { useSuspense: false },
  })

/* ── GPS-based auto-detection (runs once per device) ───────────────────── */
// Only run if:
//   • No manual preference is stored yet
//   • GPS detection hasn't been performed yet on this device
const hasManualPref = SUPPORTED.includes(localStorage.getItem(STORAGE_KEY))
const hasAutoPref = SUPPORTED.includes(localStorage.getItem(AUTO_LANG_KEY))

if (!hasManualPref && !hasAutoPref) {
  // Run after init so the page loads immediately, then switches language if needed
  detectAndApplyGeoLanguage()
}

export default i18n
