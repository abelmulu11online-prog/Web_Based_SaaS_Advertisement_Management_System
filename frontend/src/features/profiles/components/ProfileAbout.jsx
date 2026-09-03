import { MapPin, Clock, Globe, Mail, Phone, MessageCircle, Send } from 'lucide-react'
import { OpenStatusBadge } from './OpenStatusBadge.jsx'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function fmt12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

export function ProfileAbout({ profile }) {
  const { description, location, business_hours, contact } = profile
  const hasHours = business_hours?.length > 0
  const locationStr = [location?.area, location?.city, location?.region, location?.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-5">
      {description && (
        <div>
          <h3 className="text-[13px] font-semibold text-ink-2 uppercase tracking-wide mb-2">About</h3>
          <p className="text-[14px] text-ink-2 whitespace-pre-wrap leading-relaxed">{description}</p>
        </div>
      )}

      {locationStr && (
        <div>
          <h3 className="text-[13px] font-semibold text-ink-2 uppercase tracking-wide mb-2">Location</h3>
          <div className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <MapPin size={14} className="text-ink-3 shrink-0" />
            {locationStr}
          </div>
          {location?.address && (
            <p className="text-[12.5px] text-ink-3 mt-1 ml-5">{location.address}</p>
          )}
        </div>
      )}

      {contact && (Object.values(contact).some(Boolean)) && (
        <div>
          <h3 className="text-[13px] font-semibold text-ink-2 uppercase tracking-wide mb-2">Contact</h3>
          <div className="space-y-2">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-[13.5px] text-ink-2 hover:text-brand hover:no-underline">
                <Phone size={14} className="text-ink-3 shrink-0" />{contact.phone}
              </a>
            )}
            {contact.whatsapp && (
              <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13.5px] text-ink-2 hover:text-brand hover:no-underline">
                <MessageCircle size={14} className="text-ink-3 shrink-0" />WhatsApp
              </a>
            )}
            {contact.telegram && (
              <a href={`https://t.me/${contact.telegram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13.5px] text-ink-2 hover:text-brand hover:no-underline">
                <Send size={14} className="text-ink-3 shrink-0" />Telegram
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-[13.5px] text-ink-2 hover:text-brand hover:no-underline">
                <Mail size={14} className="text-ink-3 shrink-0" />{contact.email}
              </a>
            )}
            {contact.website && (
              <a href={contact.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13.5px] text-ink-2 hover:text-brand hover:no-underline">
                <Globe size={14} className="text-ink-3 shrink-0" />{contact.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      )}

      {hasHours && (
        <div>
          <h3 className="text-[13px] font-semibold text-ink-2 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Clock size={13} /> Hours
            <OpenStatusBadge businessHours={business_hours} />
          </h3>
          <table className="text-[13px] w-full max-w-xs">
            <tbody>
              {business_hours.map(h => (
                <tr key={h.day_of_week} className={h.day_of_week === new Date().getDay() ? 'font-semibold text-ink' : 'text-ink-2'}>
                  <td className="py-0.5 pr-4 w-24">{DAYS[h.day_of_week]}</td>
                  <td className="py-0.5">
                    {h.is_closed
                      ? <span className="text-ink-3">Closed</span>
                      : `${fmt12(h.opens_at)} – ${fmt12(h.closes_at)}`
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
