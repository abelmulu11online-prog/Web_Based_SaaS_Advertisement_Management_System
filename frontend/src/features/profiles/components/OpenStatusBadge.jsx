/**
 * OpenStatusBadge — real-time open/closed status based on business hours.
 * i18n: English / አማርኛ via react-i18next
 *
 * Accessibility improvements:
 * - Decorative colored dot is aria-hidden="true" — status is not conveyed
 *   by color alone. Each state now also includes a text prefix symbol:
 *     Open  → "● Open now"  (with aria-label conveying the meaning)
 *     Closed → "○ Closed"
 * - The outer <span> has an appropriate aria-label that summarises the full
 *   status (open/closed + time) so screen readers announce it in one phrase.
 */
import { useTranslation } from 'react-i18next'

export function OpenStatusBadge({ businessHours, className = '' }) {
  const { t } = useTranslation()

  if (!businessHours || businessHours.length === 0) return null

  const now        = new Date()
  const day        = now.getDay()
  const todayHours = businessHours.find(h => h.day_of_week === day)

  if (!todayHours) return null

  if (todayHours.is_closed) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-red-600 ${className}`}
        aria-label={t('profile.hours.closedToday')}
      >
        {/* Decorative dot — aria-hidden, status conveyed by text below */}
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
        {/* "✕" symbol ensures closed state is not communicated only by color */}
        <span aria-hidden="true">✕</span>
        {t('profile.hours.closedToday')}
      </span>
    )
  }

  if (!todayHours.opens_at || !todayHours.closes_at) return null

  const [openH,  openM]  = todayHours.opens_at.split(':').map(Number)
  const [closeH, closeM] = todayHours.closes_at.split(':').map(Number)
  const currentMins      = now.getHours() * 60 + now.getMinutes()
  const openMins         = openH  * 60 + openM
  const closeMins        = closeH * 60 + closeM
  const isOpen           = currentMins >= openMins && currentMins < closeMins

  function fmt(h, m) {
    const period = h >= 12 ? 'PM' : 'AM'
    const h12    = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${period}`
  }

  if (isOpen) {
    const closesAt = fmt(closeH, closeM)
    const fullLabel = `${t('profile.hours.openNow')} — ${t('profile.hours.closesAt', { time: closesAt })}`
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 ${className}`}
        aria-label={fullLabel}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
        {/* "✓" so open state is not communicated only by green color */}
        <span aria-hidden="true">✓</span>
        {t('profile.hours.openNow')}
        <span aria-hidden="true"> · </span>
        {t('profile.hours.closesAt', { time: closesAt })}
      </span>
    )
  }

  // Closed now — find next opening time
  const tomorrowDay = (day + 1) % 7
  const tomorrow    = businessHours.find(h => h.day_of_week === tomorrowDay)
  const nextMsg     = tomorrow && !tomorrow.is_closed && tomorrow.opens_at
    ? ` · ${t('profile.hours.opensTomorrow', { time: fmt(...tomorrow.opens_at.split(':').map(Number)) })}`
    : ''

  const fullLabel = `${t('profile.hours.closedNow')}${nextMsg}`

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 ${className}`}
      aria-label={fullLabel}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-ink-4 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">✕</span>
      {t('profile.hours.closedNow')}{nextMsg}
    </span>
  )
}
