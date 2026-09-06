import { Phone, Mail, Globe, MessageCircle, Navigation, Send } from 'lucide-react'
import { Button } from '../../../components/ui/Button.jsx'

const TYPE_LABELS = {
  PERSONAL:      'Get in Touch',
  PROFESSIONAL:  'Contact',
  FREELANCER:    'Hire Me',
  SHOP:          'Contact Shop',
  BUSINESS:      'Contact Us',
  COMPANY:       'Contact Company',
  ORGANIZATION:  'Get in Touch',
}

export function ContactActions({ profile, compact = false }) {
  const { contact, profile_type } = profile
  if (!contact) return null

  const primaryLabel = TYPE_LABELS[profile_type] || 'Contact'

  // Pick the best primary CTA
  const primaryHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`
    : contact.phone
    ? `tel:${contact.phone}`
    : contact.email
    ? `mailto:${contact.email}`
    : null

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {contact.whatsapp && (
          <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center border border-border rounded text-ink-2 hover:border-brand hover:text-brand transition-colors hover:no-underline">
            <MessageCircle size={14} />
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`}
            className="h-8 w-8 flex items-center justify-center border border-border rounded text-ink-2 hover:border-brand hover:text-brand transition-colors hover:no-underline">
            <Phone size={14} />
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`}
            className="h-8 w-8 flex items-center justify-center border border-border rounded text-ink-2 hover:border-brand hover:text-brand transition-colors hover:no-underline">
            <Mail size={14} />
          </a>
        )}
        {contact.website && (
          <a href={contact.website} target="_blank" rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center border border-border rounded text-ink-2 hover:border-brand hover:text-brand transition-colors hover:no-underline">
            <Globe size={14} />
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {primaryHref && (
        <a href={primaryHref} target={contact.whatsapp ? '_blank' : undefined} rel="noopener noreferrer">
          <Button variant="primary" size="sm">{primaryLabel}</Button>
        </a>
      )}
      {contact.telegram && (
        <a href={`https://t.me/${contact.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="sm" icon={<Send size={13} />}>Telegram</Button>
        </a>
      )}
      {contact.website && (
        <a href={contact.website} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="sm" icon={<Globe size={13} />}>Website</Button>
        </a>
      )}
      {profile.location?.coordinates && (
        <a
          href={`https://maps.google.com/?q=${profile.location.coordinates.lat},${profile.location.coordinates.lng}`}
          target="_blank" rel="noopener noreferrer"
        >
          <Button variant="ghost" size="sm" icon={<Navigation size={13} />}>Directions</Button>
        </a>
      )}
    </div>
  )
}
