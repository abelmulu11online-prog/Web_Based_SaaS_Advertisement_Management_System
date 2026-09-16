/**
 * ProfileHeader.jsx — Premium digital identity block.
 *
 * Design intent:
 *   - Cover image is structural, not decorative. It sets the visual identity.
 *   - Avatar lives at the bottom of the cover, integrated not overlapping.
 *   - Typography hierarchy: category label → name → headline → description.
 *   - Trust signals (verified, rating) are present but not loud.
 *   - Primary contact CTA is the clear single action.
 *   - Social links are subtle — supporting credibility, not competing.
 *   - Mobile: compact, all critical info above the fold.
 */
import { MapPin, BadgeCheck, Star, Share2, Phone, Mail, Globe, MessageCircle, Send, Navigation } from 'lucide-react'
import { OpenStatusBadge } from './OpenStatusBadge.jsx'
import { SocialLinks } from './SocialLinks.jsx'

const TYPE_LABELS = {
  PERSONAL:      'Personal',
  PROFESSIONAL:  'Professional',
  FREELANCER:    'Freelancer',
  SHOP:          'Shop',
  BUSINESS:      'Business',
  COMPANY:       'Company',
  ORGANIZATION:  'Organization',
}

const TYPE_STYLES = {
  PROFESSIONAL: 'bg-blue-50    text-blue-700',
  FREELANCER:   'bg-violet-50  text-violet-700',
  SHOP:         'bg-amber-50   text-amber-700',
  BUSINESS:     'bg-brand-light text-brand',
  COMPANY:      'bg-indigo-50  text-indigo-700',
  ORGANIZATION: 'bg-teal-50    text-teal-700',
  PERSONAL:     'bg-surface-2  text-ink-2',
}

function buildLocationString(loc) {
  if (!loc) return null
  return [loc.area, loc.city, loc.region, loc.country].filter(Boolean).slice(0, 3).join(', ')
}

/** Share the current URL to clipboard */
function handleShare(displayName) {
  if (navigator.share) {
    navigator.share({ title: displayName, url: window.location.href }).catch(() => {})
  } else {
    navigator.clipboard?.writeText(window.location.href)
  }
}

/** Derive primary contact href — whatsapp > phone > email */
function getPrimaryContact(contact, profile_type) {
  if (!contact) return null
  const LABELS = {
    PERSONAL: 'Get in Touch', PROFESSIONAL: 'Contact',
    FREELANCER: 'Hire Me', SHOP: 'Contact Shop',
    BUSINESS: 'Contact Us', COMPANY: 'Contact Company',
    ORGANIZATION: 'Get in Touch',
  }
  const label = LABELS[profile_type] || 'Contact'
  if (contact.whatsapp) {
    return { href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`, label, external: true, icon: <MessageCircle size={15} /> }
  }
  if (contact.phone) {
    return { href: `tel:${contact.phone}`, label, external: false, icon: <Phone size={15} /> }
  }
  if (contact.email) {
    return { href: `mailto:${contact.email}`, label, external: false, icon: <Mail size={15} /> }
  }
  return null
}

export function ProfileHeader({ profile }) {
  const locationStr = buildLocationString(profile.location)
  const rating      = Number(profile.avg_rating)  || 0
  const reviews     = profile.review_count || 0
  const primaryCTA  = getPrimaryContact(profile.contact, profile.profile_type)
  const typeLabel   = TYPE_LABELS[profile.profile_type]
  const typeStyle   = TYPE_STYLES[profile.profile_type] || 'bg-surface-2 text-ink-2'

  return (
    <div className="bg-surface">

      {/* ── Cover ─────────────────────────────────────────────────────────── */}
      <div className="relative h-44 sm:h-56 lg:h-64 overflow-hidden bg-surface-2">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          /* Pattern placeholder — unique per profile via grid texture */
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-light) 0%, var(--color-surface-2) 55%, var(--color-border) 100%)',
            }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
          </div>
        )}

        {/* Share button — top right, always visible */}
        <button
          type="button"
          onClick={() => handleShare(profile.display_name)}
          aria-label="Share this profile"
          className="
            absolute top-3 right-3
            h-8 w-8 flex items-center justify-center
            bg-black/30 hover:bg-black/50
            text-white rounded-lg
            transition-colors duration-150 backdrop-blur-sm
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white
          "
        >
          <Share2 size={14} />
        </button>
      </div>

      {/* ── Identity block ─────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 pb-6">

        {/* Avatar row — avatar overlaps cover bottom edge */}
        <div className="flex items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-4">

          {/* Avatar */}
          <div
            className="
              relative w-[72px] h-[72px] sm:w-[88px] sm:h-[88px]
              rounded-xl overflow-hidden shrink-0
              border-[3px] border-surface
              shadow-[0_2px_12px_rgba(0,0,0,0.12)]
              bg-surface-2
            "
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-light">
                <span className="text-2xl sm:text-3xl font-extrabold text-brand leading-none select-none">
                  {profile.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop secondary actions */}
          <div className="hidden sm:flex items-center gap-2 pb-1">
            {profile.contact?.telegram && (
              <a
                href={`https://t.me/${profile.contact.telegram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                aria-label="Telegram"
                className="
                  h-9 w-9 flex items-center justify-center
                  border border-border rounded-lg text-ink-2
                  hover:border-brand-border hover:text-brand hover:bg-brand-light/40
                  transition-all duration-150
                "
              >
                <Send size={14} />
              </a>
            )}
            {profile.contact?.phone && (
              <a
                href={`tel:${profile.contact.phone}`}
                aria-label={`Call ${profile.display_name}`}
                className="
                  h-9 w-9 flex items-center justify-center
                  border border-border rounded-lg text-ink-2
                  hover:border-brand-border hover:text-brand hover:bg-brand-light/40
                  transition-all duration-150
                "
              >
                <Phone size={14} />
              </a>
            )}
            {profile.contact?.email && (
              <a
                href={`mailto:${profile.contact.email}`}
                aria-label={`Email ${profile.display_name}`}
                className="
                  h-9 w-9 flex items-center justify-center
                  border border-border rounded-lg text-ink-2
                  hover:border-brand-border hover:text-brand hover:bg-brand-light/40
                  transition-all duration-150
                "
              >
                <Mail size={14} />
              </a>
            )}
            {profile.contact?.website && (
              <a
                href={profile.contact.website}
                target="_blank" rel="noopener noreferrer"
                aria-label="Website"
                className="
                  h-9 w-9 flex items-center justify-center
                  border border-border rounded-lg text-ink-2
                  hover:border-brand-border hover:text-brand hover:bg-brand-light/40
                  transition-all duration-150
                "
              >
                <Globe size={14} />
              </a>
            )}


          </div>
        </div>

        {/* Category label + open status */}
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          {typeLabel && (
            <span className={`text-[11px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full ${typeStyle}`}>
              {typeLabel}
            </span>
          )}
          {profile.category_name && (
            <span className="text-[11.5px] text-ink-3 font-medium">
              {profile.category_name}
            </span>
          )}
          {(typeLabel || profile.category_name) && profile.business_hours?.length > 0 && (
            <span className="text-ink-4 text-[11px]">·</span>
          )}
          <OpenStatusBadge businessHours={profile.business_hours} />
        </div>

        {/* Name + verified */}
        <div className="flex items-start gap-2 mb-1.5">
          <h1
            className="
              text-[22px] sm:text-[28px] font-extrabold text-ink
              leading-tight tracking-[-0.02em]
            "
          >
            {profile.display_name}
          </h1>
          {profile.is_verified && (
            <BadgeCheck
              size={22}
              className="text-brand mt-1 shrink-0"
              aria-label="Verified profile"
            />
          )}
        </div>

        {/* Headline — primary professional identity */}
        {profile.headline && (
          <p className="text-[15px] sm:text-[16px] text-ink-2 font-medium leading-snug mb-3">
            {profile.headline}
          </p>
        )}

        {/* Meta row: location · rating */}
        <div className="flex items-center gap-4 flex-wrap mb-4">
          {locationStr && (
            <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
              <MapPin size={13} className="shrink-0" aria-hidden="true" />
              {locationStr}
            </span>
          )}
          {reviews > 0 && (
            <span className="flex items-center gap-1.5 text-[13px] text-ink-2">
              <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
              <span className="text-ink-3">({reviews} review{reviews !== 1 ? 's' : ''})</span>
            </span>
          )}
        </div>

        {/* Social links */}
        {profile.social_links?.length > 0 && (
          <div className="mb-4">
            <SocialLinks links={profile.social_links} />
          </div>
        )}


      </div>
    </div>
  )
}
