/**
 * LanguageSelector.jsx — Polished EN / አማርኛ toggle.
 *
 * Variants:
 *   compact  — two-pill toggle (used in Navbar / DashboardLayout header)
 *   dropdown — accessible dropdown with flag-style labels (optional future use)
 *
 * Amharic is LTR, same as English — no direction change needed.
 */
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'EN',   full: 'English' },
  { code: 'am', label: 'አማ',  full: 'አማርኛ'  },
]

/**
 * Compact pill-toggle — two side-by-side buttons.
 * Fits inside the Navbar and DashboardLayout header.
 */
export function LanguageSelector({ className = '' }) {
  const { i18n } = useTranslation()
  const current  = i18n.language || 'en'

  function toggle(code) {
    if (code !== current) i18n.changeLanguage(code)
  }

  return (
    <div
      className={`
        inline-flex items-center
        bg-surface-2 border border-border
        rounded-lg p-0.5 gap-0.5
        ${className}
      `}
      role="group"
      aria-label="Select language"
    >
      {LANGUAGES.map(({ code, label, full }) => {
        const active = current === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            aria-pressed={active}
            title={full}
            className={`
              px-2.5 py-1 rounded-md text-[12px] font-semibold
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-brand focus-visible:ring-offset-1
              ${active
                ? 'bg-brand text-white shadow-sm'
                : 'text-ink-3 hover:text-ink hover:bg-surface'
              }
            `}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Dark-surface variant for use inside dark headers/footers.
 */
export function LanguageSelectorDark({ className = '' }) {
  const { i18n } = useTranslation()
  const current  = i18n.language || 'en'

  function toggle(code) {
    if (code !== current) i18n.changeLanguage(code)
  }

  return (
    <div
      className={`
        inline-flex items-center
        bg-white/10 border border-white/15
        rounded-lg p-0.5 gap-0.5
        ${className}
      `}
      role="group"
      aria-label="Select language"
    >
      {LANGUAGES.map(({ code, label, full }) => {
        const active = current === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            aria-pressed={active}
            title={full}
            className={`
              px-2.5 py-1 rounded-md text-[12px] font-semibold
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-white focus-visible:ring-offset-1
              ${active
                ? 'bg-white text-ink shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
              }
            `}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
