/**
 * OpenStatusBadge — shows real-time open/closed status based on business hours.
 * Calculates from the browser's local time and the profile's business_hours array.
 */
export function OpenStatusBadge({ businessHours, className = '' }) {
  if (!businessHours || businessHours.length === 0) return null

  const now   = new Date()
  const day   = now.getDay() // 0=Sunday
  const todayHours = businessHours.find(h => h.day_of_week === day)

  if (!todayHours) return null
  if (todayHours.is_closed) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-red-600 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        Closed today
      </span>
    )
  }

  if (!todayHours.opens_at || !todayHours.closes_at) return null

  const [openH, openM]   = todayHours.opens_at.split(':').map(Number)
  const [closeH, closeM] = todayHours.closes_at.split(':').map(Number)
  const currentMins = now.getHours() * 60 + now.getMinutes()
  const openMins    = openH  * 60 + openM
  const closeMins   = closeH * 60 + closeM
  const isOpen      = currentMins >= openMins && currentMins < closeMins

  function fmt(h, m) {
    const period = h >= 12 ? 'PM' : 'AM'
    const h12    = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${period}`
  }

  if (isOpen) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Open now · Closes at {fmt(closeH, closeM)}
      </span>
    )
  }

  // Find tomorrow's hours for "opens tomorrow" message
  const tomorrowDay = (day + 1) % 7
  const tomorrow = businessHours.find(h => h.day_of_week === tomorrowDay)
  const nextMsg = tomorrow && !tomorrow.is_closed && tomorrow.opens_at
    ? ` · Opens tomorrow at ${fmt(...tomorrow.opens_at.split(':').map(Number))}`
    : ''

  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-ink-4 shrink-0" />
      Closed{nextMsg}
    </span>
  )
}
