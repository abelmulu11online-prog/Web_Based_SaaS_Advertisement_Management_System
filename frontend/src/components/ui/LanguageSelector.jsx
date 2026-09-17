/**
 * LanguageSelector.jsx — Accessible language picker for GebetaPro.
 *
 * Supports 4 languages:
 *   en — English
 *   am — አማርኛ (Amharic)
 *   om — Afaan Oromoo (Oromo)
 *   ti — ትግርኛ (Tigrinya)
 *
 * Renders a compact dropdown triggered by a globe button.
 * Includes GPS auto-detection option to automatically pick language
 * based on user's region (e.g. Amhara → Amharic).
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check, ChevronDown, MapPin, Loader2 } from 'lucide-react'
import { detectAndApplyGeoLanguage } from '../../i18n.js'

/** All supported languages with display metadata */
const LANGUAGES = [
  { code: 'en', label: 'EN',  full: 'English',      native: 'English'      },
  { code: 'am', label: 'አማ', full: 'Amharic',      native: 'አማርኛ'         },
  { code: 'om', label: 'OM',  full: 'Afaan Oromoo', native: 'Afaan Oromoo' },
  { code: 'ti', label: 'ትግ', full: 'Tigrinya',     native: 'ትግርኛ'         },
]

/* ─────────────────────────────────────────────────────────────────────────
   LanguageSelector — light surface (Navbar / DashboardLayout)
───────────────────────────────────────────────────────────────────────── */
export function LanguageSelector({ className = '' }) {
  const { i18n, t }  = useTranslation()
  const current       = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]
  const [open, setOpen] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const containerRef  = useRef(null)

  // Close on outside click or Escape
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') close() }
    function onClick(e) { if (!containerRef.current?.contains(e.target)) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, close])

  function select(code) {
    if (code !== i18n.language) {
      localStorage.setItem('gebetapro_lang', code)
      i18n.changeLanguage(code)
    }
    close()
  }

  async function handleAutoDetect() {
    setDetecting(true)
    try {
      await detectAndApplyGeoLanguage(true)
    } finally {
      setDetecting(false)
      close()
    }
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        id="lang-selector-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.select', 'Language')}
        onClick={() => setOpen(o => !o)}
        className={[
          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg',
          'bg-surface-2 border border-border',
          'text-ink-2 text-[12px] font-semibold',
          'hover:border-brand-border hover:text-ink transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
          open ? 'border-brand-border text-ink' : '',
        ].join(' ')}
      >
        <Globe size={12} aria-hidden="true" className="shrink-0 text-ink-3" />
        <span>{current.label}</span>
        <ChevronDown
          size={10}
          aria-hidden="true"
          className={`shrink-0 text-ink-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          aria-label={t('lang.select', 'Language')}
          aria-activedescendant={`lang-opt-${current.code}`}
          className={[
            'absolute right-0 top-[calc(100%+6px)] z-[200]',
            'w-48 rounded-xl border border-border',
            'bg-surface shadow-lg shadow-black/10',
            'py-1 overflow-hidden',
            'animate-fade-in',
          ].join(' ')}
        >
          {/* GPS Auto-detect button */}
          <li className="border-b border-border mb-1 pb-1">
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={detecting}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-brand hover:bg-brand-light/30 transition-colors disabled:opacity-50"
            >
              {detecting ? (
                <Loader2 size={13} className="animate-spin text-brand" />
              ) : (
                <MapPin size={13} className="text-brand shrink-0" />
              )}
              <span className="truncate">
                {detecting ? 'Detecting region…' : '📍 Auto-detect location'}
              </span>
            </button>
          </li>

          {LANGUAGES.map(({ code, full, native, label }) => {
            const isActive = code === i18n.language
            return (
              <li
                key={code}
                id={`lang-opt-${code}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  onClick={() => select(code)}
                  className={[
                    'w-full flex items-center justify-between gap-2 px-3 py-2',
                    'text-left text-[13px] transition-colors duration-100',
                    'focus-visible:outline-none focus-visible:bg-surface-2',
                    isActive
                      ? 'text-brand bg-brand-light/40 font-semibold'
                      : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center text-[11px] font-bold text-ink-3 tabular-nums">
                      {label}
                    </span>
                    <span>
                      <span className="block leading-tight">{native}</span>
                      <span className="block text-[10.5px] text-ink-4 leading-tight">{full}</span>
                    </span>
                  </span>
                  {isActive && <Check size={12} className="shrink-0 text-brand" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   LanguageSelectorDark — dark-surface variant (dark headers / footers)
───────────────────────────────────────────────────────────────────────── */
export function LanguageSelectorDark({ className = '' }) {
  const { i18n, t }   = useTranslation()
  const current        = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]
  const [open, setOpen] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const containerRef   = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') close() }
    function onClick(e) { if (!containerRef.current?.contains(e.target)) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, close])

  function select(code) {
    if (code !== i18n.language) {
      localStorage.setItem('gebetapro_lang', code)
      i18n.changeLanguage(code)
    }
    close()
  }

  async function handleAutoDetect() {
    setDetecting(true)
    try {
      await detectAndApplyGeoLanguage(true)
    } finally {
      setDetecting(false)
      close()
    }
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.select', 'Language')}
        onClick={() => setOpen(o => !o)}
        className={[
          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg',
          'bg-white/10 border border-white/15',
          'text-white text-[12px] font-semibold',
          'hover:bg-white/20 hover:border-white/30 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1',
        ].join(' ')}
      >
        <Globe size={12} aria-hidden="true" className="shrink-0 text-white/60" />
        <span>{current.label}</span>
        <ChevronDown
          size={10}
          aria-hidden="true"
          className={`shrink-0 text-white/40 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('lang.select', 'Language')}
          className={[
            'absolute right-0 top-[calc(100%+6px)] z-[200]',
            'w-48 rounded-xl border border-white/20',
            'bg-ink shadow-lg shadow-black/30',
            'py-1 overflow-hidden',
            'animate-fade-in',
          ].join(' ')}
        >
          {/* GPS Auto-detect button */}
          <li className="border-b border-white/10 mb-1 pb-1">
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={detecting}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-blue-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {detecting ? (
                <Loader2 size={13} className="animate-spin text-blue-300" />
              ) : (
                <MapPin size={13} className="text-blue-300 shrink-0" />
              )}
              <span className="truncate">
                {detecting ? 'Detecting region…' : '📍 Auto-detect location'}
              </span>
            </button>
          </li>

          {LANGUAGES.map(({ code, full, native, label }) => {
            const isActive = code === i18n.language
            return (
              <li key={code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => select(code)}
                  className={[
                    'w-full flex items-center justify-between gap-2 px-3 py-2',
                    'text-left text-[13px] transition-colors duration-100',
                    'focus-visible:outline-none focus-visible:bg-white/10',
                    isActive
                      ? 'text-white bg-white/15 font-semibold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center text-[11px] font-bold text-white/40 tabular-nums">
                      {label}
                    </span>
                    <span>
                      <span className="block leading-tight">{native}</span>
                      <span className="block text-[10.5px] text-white/40 leading-tight">{full}</span>
                    </span>
                  </span>
                  {isActive && <Check size={12} className="shrink-0 text-white" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
