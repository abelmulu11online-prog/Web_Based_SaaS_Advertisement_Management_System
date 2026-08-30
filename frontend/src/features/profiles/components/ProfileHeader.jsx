import { MapPin, BadgeCheck, Camera } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge.jsx'
import { OpenStatusBadge } from './OpenStatusBadge.jsx'
import { ContactActions } from './ContactActions.jsx'
import { SocialLinks } from './SocialLinks.jsx'

const TYPE_LABELS = {
  PERSONAL: 'Personal', PROFESSIONAL: 'Professional', FREELANCER: 'Freelancer',
  SHOP: 'Shop', BUSINESS: 'Business', COMPANY: 'Company', ORGANIZATION: 'Organization',
}

function buildLocationString(loc) {
  if (!loc) return null
  const parts = [loc.area, loc.city, loc.region, loc.country].filter(Boolean)
  return parts.slice(0, 3).join(', ')
}

export function ProfileHeader({ profile }) {
  const locationStr = buildLocationString(profile.location)

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Cover */}
      <div className="relative h-36 sm:h-48 bg-surface-2">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-light to-surface-2" />
        )}
      </div>

      {/* Info row */}
      <div className="px-4 sm:px-6 pb-5">
        {/* Avatar + actions row */}
        <div className="flex items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-surface bg-surface-2 overflow-hidden shadow-sm">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-light">
                  <span className="text-2xl sm:text-3xl font-bold text-brand">
                    {profile.display_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Contact CTA — desktop */}
          <div className="hidden sm:flex items-center gap-2 pb-1">
            <ContactActions profile={profile} compact />
          </div>
        </div>

        {/* Name + type */}
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <h1 className="text-[19px] sm:text-[22px] font-bold text-ink leading-tight">{profile.display_name}</h1>
          {profile.is_verified && (
            <BadgeCheck size={18} className="text-brand mt-0.5 shrink-0" aria-label="Verified" />
          )}
          {profile.profile_type && (
            <Badge variant="default" size="xs">{TYPE_LABELS[profile.profile_type] || profile.profile_type}</Badge>
          )}
        </div>

        {/* Headline */}
        {profile.headline && (
          <p className="text-[14px] text-ink-2 font-medium mb-2">{profile.headline}</p>
        )}

        {/* Location + open status */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {locationStr && (
            <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
              <MapPin size={12} className="shrink-0" />
              {locationStr}
            </span>
          )}
          <OpenStatusBadge businessHours={profile.business_hours} />
        </div>

        {/* Description excerpt */}
        {profile.description && (
          <p className="text-[13.5px] text-ink-2 line-clamp-2 mb-3">{profile.description}</p>
        )}

        {/* Social links */}
        <SocialLinks links={profile.social_links} />

        {/* Contact — mobile */}
        <div className="sm:hidden mt-3">
          <ContactActions profile={profile} />
        </div>
      </div>
    </div>
  )
}
