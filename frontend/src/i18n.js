/**
 * i18n.js — i18next configuration for GebetaPro.
 *
 * Languages:
 *   en — English (default)
 *   am — አማርኛ (Amharic) — LTR, same as English
 *
 * Persistence: localStorage key "gebetapro_lang"
 * Fallback:    English for any missing key
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import am from './locales/am.json'

const STORAGE_KEY = 'gebetapro_lang'
const SUPPORTED    = ['en', 'am']

function detectLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED.includes(stored)) return stored
  const browser = navigator.language?.split('-')[0]
  if (SUPPORTED.includes(browser)) return browser
  return 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    // Never suspend — always show content immediately
    react: { useSuspense: false },
  })

// Persist language choice
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
})

export default i18n
