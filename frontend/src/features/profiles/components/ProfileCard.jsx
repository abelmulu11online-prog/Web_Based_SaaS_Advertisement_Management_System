/**
 * ProfileCard.jsx — Editorial profile card with premium visual hierarchy.
 * Used in the homepage featured section and the directory grid.
 *
 * Design principles:
 * - Strong imagery first
 * - Identity and what they offer are primary
 * - Metadata is subordinate, not equal weight
 * - Generous whitespace, no border clutter
 * - Hover reveals depth, not decoration
 */
import { useNavigate } from 'react-router-dom'
import { MapPin, BadgeCheck, Star } from 'lucide-react'
import { CategoryIconInline } from './CategoryIcon.jsx'

const TYPE_LABELS = {
  PERSONAL:      'Personal',
  PROFESSIONAL:  'Professional',
  FREELANCER:    'Freelancer',
  SHOP:          'Shop',
  BUSINESS:      'Business',
  COMPANY:       'Company',
  ORGANIZATION:  'Organization',
}

/* Restrained, semantic type colors — warm neutrals with one distinct accent per type */
const TYPE_STYLES = {
  PERSONAL:     'text-ink-3',
  PROFESSIONAL: 'text-blue-600',
  FREELANCER:   'text-violet-600',
  SHOP:         'text-amber-700',
  BUSINESS:     'text-brand',
  COMPANY:      'text-indigo-600',
  ORGANIZATION: 'text-teal-600',
}

export function ProfileCard({ profile }) {
  const navigate = useNavigate()

  const rating  = Number(profile.avg_rating) || 0
  const reviews = profile.review_count || 0
  const city    = profile.city || profile.country || null

  return (
    <article
      onClick={() => navigate(`/p/${profile.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/p/${profile.slug}`)}
      aria-label={`View ${profile.display_name}'s profile`}
      className="
        group relative bg-surface rounded-2xl overflow-hidden
        border border-border cursor-pointer
        transition-all duration-200 ease-out
        hover:border-brand-border hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]
        hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
      "
    >
      {/* ── Cover image ─────────────────────────────────────────────────────── */}
      <div className="relative h-32 overflow-hidden bg-surface-2">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          /* Distinctive pattern placeholder — no generic gradient */
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, var(--color-brand-light) 0%, var(--color-surface-2) 60%, var(--color-border) 100%)`,
            }}
          >
            {/* Subtle grid texture */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          </div>
        )}

        {/* Featured badge — minimal, top-left */}
        {profile.is_featured && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
            Featured
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4">
        {/* Avatar row — sits above the fold line */}
        <div className="flex items-end justify-between mb-3 -mt-9">
          {/* Avatar */}
          <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden border-2 border-surface shadow-sm bg-surface-2 shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-light">
                <span className="text-lg font-bold text-brand leading-none">
                  {profile.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Rating — anchored top-right, compact */}
          {reviews > 0 && (
            <div className="flex items-center gap-1 mb-1">
              <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />
              <span className="text-[12.5px] font-semibold text-ink tabular-nums">
                {rating.toFixed(1)}
              </span>
              <span className="text-[11px] text-ink-3">({reviews})</span>
            </div>
          )}
        </div>

        {/* Name + verified */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="text-[14.5px] font-semibold text-ink leading-snug line-clamp-1 flex-1 min-w-0">
            {profile.display_name}
          </h3>
          {profile.is_verified && (
            <BadgeCheck
              size={15}
              className="text-brand shrink-0"
              aria-label="Verified"
            />
          )}
        </div>

        {/* Headline — the most important line after the name */}
        {profile.headline && (
          <p className="text-[12.5px] text-ink-2 line-clamp-2 leading-relaxed mb-3">
            {profile.headline}
          </p>
        )}

        {/* ── Footer metadata — secondary, subdued ─────────────────────────── */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border">
          {/* Category + type */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {profile.category_name && (
              <span className="flex items-center gap-1 text-[11.5px] text-ink-3 truncate">
                <CategoryIconInline
                  slug={profile.category_slug}
                  name={profile.category_name}
                  size={11}
                />
                {profile.category_name}
              </span>
            )}
            {profile.profile_type && profile.category_name && (
              <span className="text-ink-4 text-[11px]">·</span>
            )}
            {profile.profile_type && (
              <span className={`text-[11.5px] font-medium shrink-0 ${TYPE_STYLES[profile.profile_type] || 'text-ink-3'}`}>
                {TYPE_LABELS[profile.profile_type] || profile.profile_type}
              </span>
            )}
          </div>

          {/* City */}
          {city && (
            <div className="flex items-center gap-0.5 shrink-0 text-ink-3">
              <MapPin size={10} aria-hidden="true" />
              <span className="text-[11px] truncate max-w-[80px]">{city}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * ProfileCardLarge — Editorial large-format variant for the homepage featured hero slot.
 * Taller cover, larger avatar, bigger typography. Same data shape.
 */
export function ProfileCardLarge({ profile }) {
  const navigate = useNavigate()

  const rating  = Number(profile.avg_rating) || 0
  const reviews = profile.review_count || 0
  const city    = profile.city || profile.country || null

  return (
    <article
      onClick={() => navigate(`/p/${profile.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/p/${profile.slug}`)}
      aria-label={`View ${profile.display_name}'s profile`}
      className="
        group relative bg-surface rounded-2xl overflow-hidden
        border border-border cursor-pointer h-full
        transition-all duration-200 ease-out
        hover:border-brand-border hover:shadow-[0_6px_32px_rgba(0,0,0,0.10)]
        hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
      "
    >
      {/* Cover */}
      <div className="relative h-52 sm:h-64 overflow-hidden bg-surface-2">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, var(--color-brand-light) 0%, var(--color-surface-2) 60%, var(--color-border) 100%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          </div>
        )}

        {profile.is_featured && (
          <div className="absolute top-3 left-3 bg-amber-400 text-amber-950 text-[10px] font-bold px-2.5 py-1 rounded-full leading-none">
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-3 pb-5">
        <div className="flex items-end justify-between mb-4 -mt-10">
          <div className="relative w-[60px] h-[60px] rounded-xl overflow-hidden border-2 border-surface shadow-sm bg-surface-2 shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-light">
                <span className="text-xl font-bold text-brand leading-none">
                  {profile.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {reviews > 0 && (
            <div className="flex items-center gap-1 mb-1">
              <Star size={13} className="text-amber-400 fill-amber-400" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-ink tabular-nums">
                {rating.toFixed(1)}
              </span>
              <span className="text-[12px] text-ink-3">({reviews})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-[16px] font-semibold text-ink leading-snug line-clamp-1 flex-1 min-w-0">
            {profile.display_name}
          </h3>
          {profile.is_verified && (
            <BadgeCheck size={16} className="text-brand shrink-0" aria-label="Verified" />
          )}
        </div>

        {profile.headline && (
          <p className="text-[13px] text-ink-2 line-clamp-2 leading-relaxed mb-4">
            {profile.headline}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {profile.category_name && (
              <span className="flex items-center gap-1 text-[12px] text-ink-3 truncate">
                <CategoryIconInline slug={profile.category_slug} name={profile.category_name} size={12} />
                {profile.category_name}
              </span>
            )}
            {profile.profile_type && profile.category_name && (
              <span className="text-ink-4 text-[11px]">·</span>
            )}
            {profile.profile_type && (
              <span className={`text-[12px] font-medium shrink-0 ${TYPE_STYLES[profile.profile_type] || 'text-ink-3'}`}>
                {TYPE_LABELS[profile.profile_type] || profile.profile_type}
              </span>
            )}
          </div>
          {city && (
            <div className="flex items-center gap-0.5 shrink-0 text-ink-3">
              <MapPin size={11} aria-hidden="true" />
              <span className="text-[11.5px] truncate max-w-[90px]">{city}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * ProfileListCard — Horizontal list-view variant for the directory list mode.
 *
 * Layout: [avatar] [name · type · headline · meta row] [rating · location → arrow]
 * Designed to scan vertically — name and profession read fast, metadata is subordinate.
 */
export function ProfileListCard({ profile }) {
  const navigate = useNavigate()

  const rating  = Number(profile.avg_rating) || 0
  const reviews = profile.review_count || 0
  const city    = profile.city || profile.country || null

  return (
    <article
      onClick={() => navigate(`/p/${profile.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/p/${profile.slug}`)}
      aria-label={`View ${profile.display_name}'s profile`}
      className="
        group relative bg-surface rounded-xl overflow-hidden
        border border-border cursor-pointer
        flex items-stretch gap-0
        transition-all duration-200 ease-out
        hover:border-brand-border hover:shadow-[0_2px_16px_rgba(0,0,0,0.07)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
      "
    >
      {/* Left: avatar strip */}
      <div className="relative w-16 sm:w-20 shrink-0 bg-surface-2 overflow-hidden">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-200 group-hover:opacity-80"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, var(--color-brand-light) 0%, var(--color-surface-2) 100%)`,
            }}
          />
        )}
        {/* Avatar centered */}
        <div className="relative z-10 h-full flex items-center justify-center p-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-surface/60 shadow-sm bg-surface-2 shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-light">
                <span className="text-[15px] font-bold text-brand leading-none">
                  {profile.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: identity + meta */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-0.5">
        {/* Name row */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="text-[14px] font-semibold text-ink leading-snug line-clamp-1 flex-1 min-w-0">
            {profile.display_name}
          </h3>
          {profile.is_verified && (
            <BadgeCheck size={14} className="text-brand shrink-0" aria-label="Verified" />
          )}
          {profile.is_featured && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
              Featured
            </span>
          )}
        </div>

        {/* Headline */}
        {profile.headline && (
          <p className="text-[12.5px] text-ink-2 line-clamp-1 leading-snug">
            {profile.headline}
          </p>
        )}

        {/* Meta row: category · type */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {profile.category_name && (
            <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
              <CategoryIconInline
                slug={profile.category_slug}
                name={profile.category_name}
                size={11}
              />
              {profile.category_name}
            </span>
          )}
          {profile.profile_type && profile.category_name && (
            <span className="text-ink-4 text-[11px]">·</span>
          )}
          {profile.profile_type && (
            <span className={`text-[11.5px] font-medium ${TYPE_STYLES[profile.profile_type] || 'text-ink-3'}`}>
              {TYPE_LABELS[profile.profile_type] || profile.profile_type}
            </span>
          )}
        </div>
      </div>

      {/* Right: rating + city + arrow */}
      <div className="shrink-0 flex flex-col items-end justify-center gap-1.5 px-4 py-3 border-l border-border">
        {reviews > 0 ? (
          <div className="flex items-center gap-1">
            <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />
            <span className="text-[12px] font-semibold text-ink tabular-nums">{rating.toFixed(1)}</span>
            <span className="text-[11px] text-ink-3 hidden sm:inline">({reviews})</span>
          </div>
        ) : (
          <span className="text-[11px] text-ink-4">No reviews</span>
        )}
        {city && (
          <div className="flex items-center gap-0.5 text-ink-3">
            <MapPin size={10} aria-hidden="true" />
            <span className="text-[11px] max-w-[72px] truncate">{city}</span>
          </div>
        )}
        {/* Navigate affordance */}
        <span
          className="text-ink-4 group-hover:text-brand group-hover:translate-x-0.5 transition-all duration-150 mt-0.5"
          aria-hidden="true"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </article>
  )
}
