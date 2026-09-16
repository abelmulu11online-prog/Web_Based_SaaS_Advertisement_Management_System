/**
 * MapProfilePopup.jsx — Leaflet Popup content for a profile marker.
 * Shows: avatar, name, headline, category, rating, link to profile.
 */
import { Link } from 'react-router-dom'
import { MapPin, Star, BadgeCheck, ExternalLink } from 'lucide-react'

export function MapProfilePopup({ profile }) {
  return (
    <div className="w-52 text-left font-sans">
      {/* Avatar / cover */}
      <div className="h-24 -mx-[12px] -mt-[13px] mb-2.5 overflow-hidden rounded-t-lg bg-surface-2">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <span className="text-3xl font-bold text-indigo-400">
              {profile.display_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Name + verified */}
      <div className="flex items-center gap-1 mb-0.5">
        <p className="text-[13px] font-semibold text-ink leading-snug line-clamp-1 flex-1">
          {profile.display_name}
        </p>
        {profile.is_verified && (
          <BadgeCheck size={13} className="text-blue-500 shrink-0" />
        )}
      </div>

      {/* Headline */}
      {profile.headline && (
        <p className="text-[11.5px] text-ink-2 line-clamp-1 mb-1">{profile.headline}</p>
      )}

      {/* Category */}
      {profile.category_name && (
        <p className="text-[11px] text-ink-3 mb-1">
          {profile.category_icon && <span className="mr-1">{profile.category_icon}</span>}
          {profile.category_name}
        </p>
      )}

      {/* Rating */}
      {profile.review_count > 0 && (
        <div className="flex items-center gap-1 mb-1.5">
          <Star size={10} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[11px] text-ink-2">
            {Number(profile.avg_rating).toFixed(1)} ({profile.review_count})
          </span>
        </div>
      )}

      {/* Location */}
      {(profile.city || profile.country) && (
        <div className="flex items-center gap-1 mb-2.5">
          <MapPin size={10} className="text-ink-3 shrink-0" />
          <p className="text-[11px] text-ink-3 line-clamp-1">
            {[profile.city, profile.country].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {/* Link */}
      <Link
        to={`/p/${profile.slug}`}
        className="inline-flex items-center gap-1 text-[12px] text-brand font-medium hover:underline"
      >
        View profile <ExternalLink size={11} />
      </Link>
    </div>
  )
}
