/**
 * ProfileAbout.jsx — About, Availability, Location, and Contact sections.
 *
 * Design intent:
 *   - About text reads like editorial content — no bordered card wrapper.
 *   - Availability is the signature UX moment: live status prominently shown,
 *     today highlighted, week displayed in a clean scannable schedule.
 *   - Location uses the existing map component, framed cleanly.
 *   - Contact is a clear action list — not a wall of equal-weight links.
 *
 * This component is used as the sidebar content on desktop and as a full
 * tab section on mobile. It accepts a `compact` prop for sidebar use.
 */
import { MapPin, Navigation, Phone, Mail, Globe, MessageCircle, Send } from 'lucide-react'
import { ProfileLocationMap } from './ProfileLocationMap.jsx'

/* ── Day helpers ────────────────────────────────────────────────────────────── */
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function fmt24to12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12    = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function getTodayStatus(businessHours) {
  if (!businessHours?.length) return null
  const now  = new Date()
  const day  = now.getDay()
  const today = businessHours.find(h => h.day_of_week === day)
  if (!today) return null

  if (today.is_closed) return { open: false, label: 'Closed today', nextMsg: null }

  if (!today.opens_at || !today.closes_at) return null

  const [openH,  openM]  = today.opens_at.split(':').map(Number)
  const [closeH, closeM] = today.closes_at.split(':').map(Number)
  const nowMins   = now.getHours() * 60 + now.getMinutes()
  const openMins  = openH  * 60 + openM
  const closeMins = closeH * 60 + closeM
  const isOpen    = nowMins >= openMins && nowMins < closeMins

  const closeAt = fmt24to12(today.closes_at)
  const openAt  = fmt24to12(today.opens_at)

  if (isOpen) {
    return { open: true,  label: 'Open now', detail: `Closes ${closeAt}`, nextMsg: null }
  }

  // Find next opening
  let nextMsg = null
  if (nowMins < openMins) {
    nextMsg = `Opens at ${openAt}`
  } else {
    // Look forward up to 7 days
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay   = (day + offset) % 7
      const nextHours = businessHours.find(h => h.day_of_week === nextDay)
      if (nextHours && !nextHours.is_closed && nextHours.opens_at) {
        const label = offset === 1 ? 'tomorrow' : DAY_NAMES_FULL[nextDay]
        nextMsg = `Opens ${label} at ${fmt24to12(nextHours.opens_at)}`
        break
      }
    }
  }
  return { open: false, label: 'Closed now', detail: null, nextMsg }
}

/* ── AvailabilitySection ────────────────────────────────────────────────────── */
function AvailabilitySection({ businessHours }) {
  if (!businessHours?.length) return null

  const todayIndex = new Date().getDay()
  const status     = getTodayStatus(businessHours)

  // Sort hours starting from Monday (1) for display
  const sorted = [...businessHours].sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0]
    return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
  })

  return (
    <div>
      {/* ── Live status ───────────────────────────────────────────────── */}
      {status && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            {/* Animated dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              {status.open && (
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"
                  style={{ animationDuration: '2s' }}
                />
              )}
              <span
                className={`
                  relative inline-flex rounded-full h-2.5 w-2.5
                  ${status.open ? 'bg-emerald-500' : 'bg-ink-4'}
                `}
              />
            </span>
            <span
              className={`
                text-[14px] font-bold
                ${status.open ? 'text-emerald-700' : 'text-ink-2'}
              `}
            >
              {status.label}
            </span>
          </div>
          {/* Detail / next opening */}
          {(status.detail || status.nextMsg) && (
            <p className="text-[13px] text-ink-3 pl-[22px]">
              {status.detail || status.nextMsg}
            </p>
          )}
        </div>
      )}

      {/* ── Weekly schedule ───────────────────────────────────────────── */}
      <div className="space-y-0.5">
        {sorted.map(h => {
          const isToday   = h.day_of_week === todayIndex
          const isClosed  = h.is_closed || (!h.opens_at && !h.closes_at)
          const timeRange = isClosed
            ? null
            : `${fmt24to12(h.opens_at)} – ${fmt24to12(h.closes_at)}`

          return (
            <div
              key={h.day_of_week}
              className={`
                flex items-center justify-between
                py-1.5 px-2.5 rounded-lg -mx-2.5
                ${isToday
                  ? 'bg-brand-light/50'
                  : 'hover:bg-surface-2 transition-colors duration-100'
                }
              `}
            >
              <span
                className={`
                  text-[13px] w-8 shrink-0
                  ${isToday ? 'font-bold text-brand' : isClosed ? 'text-ink-3' : 'text-ink-2'}
                `}
              >
                {DAY_NAMES_SHORT[h.day_of_week]}
              </span>
              {isToday && (
                <span className="text-[10px] font-semibold text-brand uppercase tracking-wide mx-2 shrink-0">
                  Today
                </span>
              )}
              {!isToday && <span className="flex-1" />}
              <span
                className={`
                  text-[13px] tabular-nums text-right
                  ${isToday ? 'font-semibold text-ink' : isClosed ? 'text-ink-4' : 'text-ink-2'}
                `}
              >
                {isClosed ? 'Closed' : timeRange}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── ContactSection ─────────────────────────────────────────────────────────── */
function ContactSection({ contact }) {
  if (!contact) return null
  const hasAny = Object.values(contact).some(Boolean)
  if (!hasAny) return null

  const items = [
    contact.phone    && { href: `tel:${contact.phone}`,                              Icon: Phone,         label: contact.phone,                     external: false },
    contact.whatsapp && { href: `https://wa.me/${contact.whatsapp.replace(/\D/g,'')}`, Icon: MessageCircle, label: 'WhatsApp',                        external: true  },
    contact.telegram && { href: `https://t.me/${contact.telegram.replace('@','')}`,   Icon: Send,          label: contact.telegram.startsWith('@') ? contact.telegram : `@${contact.telegram}`, external: true  },
    contact.email    && { href: `mailto:${contact.email}`,                            Icon: Mail,          label: contact.email,                     external: false },
    contact.website  && { href: contact.website,                                      Icon: Globe,         label: contact.website.replace(/^https?:\/\//, ''), external: true  },
  ].filter(Boolean)

  return (
    <div className="space-y-2">
      {items.map(({ href, Icon, label, external }) => (
        <a
          key={href}
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="
            flex items-center gap-3
            text-[13px] text-ink-2 hover:text-brand
            hover:no-underline transition-colors duration-150
            group
          "
        >
          <span className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center shrink-0 group-hover:bg-brand-light transition-colors duration-150">
            <Icon size={13} className="text-ink-3 group-hover:text-brand transition-colors duration-150" aria-hidden="true" />
          </span>
          <span className="truncate">{label}</span>
        </a>
      ))}
    </div>
  )
}

/* ── ProfileAbout (main export) ─────────────────────────────────────────────── */
export function ProfileAbout({ profile, compact = false }) {
  const { description, location, business_hours, contact } = profile

  const locationStr  = [location?.area, location?.city, location?.region, location?.country]
    .filter(Boolean).join(', ')
  const hasCoords    = location?.coordinates?.lat != null && location?.coordinates?.lng != null
  const hasLocation  = !!(locationStr || hasCoords)
  const hasHours     = business_hours?.length > 0
  const hasContact   = contact && Object.values(contact).some(Boolean)

  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}`
    : locationStr
    ? `https://www.google.com/maps/search/${encodeURIComponent(locationStr)}`
    : null

  /* Section wrapper — no card, just spacing + optional divider */
  const Section = ({ title, children }) => (
    <div className="py-5 border-b border-border last:border-b-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-3">
        {title}
      </h3>
      {children}
    </div>
  )

  return (
    <div>

      {/* ── About ─────────────────────────────────────────────────────── */}
      {description && (
        <Section title="About">
          <p className="text-[14px] text-ink-2 leading-relaxed whitespace-pre-wrap max-w-prose">
            {description}
          </p>
        </Section>
      )}

      {/* ── Availability ──────────────────────────────────────────────── */}
      {hasHours && (
        <Section title="Availability">
          <AvailabilitySection businessHours={business_hours} />
        </Section>
      )}

      {/* ── Location ──────────────────────────────────────────────────── */}
      {hasLocation && (
        <Section title="Location">
          {hasCoords && (
            <div className="mb-3 rounded-xl overflow-hidden">
              <ProfileLocationMap
                lat={location.coordinates.lat}
                lng={location.coordinates.lng}
              />
            </div>
          )}
          {locationStr && (
            <div className="flex items-center gap-2 text-[13px] text-ink-2 mb-3">
              <MapPin size={13} className="text-ink-3 shrink-0" aria-hidden="true" />
              {locationStr}
            </div>
          )}
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-2
                text-[13px] font-medium text-brand
                hover:text-brand-hover hover:no-underline
                transition-colors duration-150
              "
            >
              <Navigation size={13} aria-hidden="true" />
              Get directions
            </a>
          )}
        </Section>
      )}

      {/* ── Contact ───────────────────────────────────────────────────── */}
      {hasContact && (
        <Section title="Contact">
          <ContactSection contact={contact} />
        </Section>
      )}
    </div>
  )
}
