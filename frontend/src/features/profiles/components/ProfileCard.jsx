/**
 * ProfileCard.jsx — Editorial profile card with premium visual hierarchy.
 * Used in the homepage featured section and the directory grid.
 *
 * Accessibility improvements:
 * - Cards are now <article> elements wrapped by a React Router <Link> so they
 *   are proper semantic links (not role="button" on an article).
 * - The <Link> carries the accessible name via aria-label.
 * - All keyboard navigation (Tab, Enter, Space) is handled natively by <a>.
 * - Decorative cover images keep alt="" (correct).
 * - Avatar images use the profile display_name as alt text.
 * - Star / MapPin icons are aria-hidden="true".
 * - BadgeCheck "Verified" uses aria-label so screen readers announce it.
 * - Decorative separator "·" is aria-hidden.
 */
import { Link } from 'react-router-dom'
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

/* ── ProfileCard ──────────────────────────────────────────────────────────── */
export function ProfileCard({ profile }) {
  const rating  = Number(profile.avg_rating) || 0
  const reviews = profile.review_count || 0
  const city    = profile.city || profile.country || null

  return (
    <article className="group relative">
      <Link
        to={`/p/${profile.slug}`}
        aria-label={`View ${profile.display_name}'s profile`}
        className="
          block bg-surface rounded-2xl overflow-hidden
          border border-border cursor-pointer
          transition-all duration-200 ease-out
          hover:border-brand-border hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]
          hover:-translate-y-0.5 hover:no-underline
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
        "
      >
        {/* ── Cover image ───────────────────────────────────────────────────── */}
        <div className="relative h-32 overflow-hidden bg-surface-2">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div
              aria-hidden="true"
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

          {/* Featured badge */}
          {profile.is_featured && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
              Featured
            </div>
          )}
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-4">
          {/* Avatar row */}
          <div className="flex items-end justify-between mb-3 -mt-9">
            <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden border-2 border-surface shadow-sm bg-surface-2 shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-light" aria-hidden="true">
                  <span className="text-lg font-bold text-brand leading-none">
                    {profile.display_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>

            {/* Rating */}
            {reviews > 0 && (
              <div className="flex items-center gap-1 mb-1">
                <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />
                <span className="text-[12.5px] font-semibold text-ink tabular-nums">
                  {rating.toFixed(1)}
                </span>
                <span className="text-[11px] text-ink-2">
                  <span aria-hidden="true">(</span>{reviews} review{reviews !== 1 ? 's' : ''}<span aria-hidden="true">)</span>
                </span>
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
                aria-label="Verified profile"
              />
            )}
          </div>

          {/* Headline */}
          {profile.headline && (
            <p className="text-[12.5px] text-ink-2 line-clamp-2 leading-relaxed mb-3">
              {profile.headline}
            </p>
          )}

          {/* Footer metadata */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {profile.category_name && (
                <span className="flex items-center gap-1 text-[11.5px] text-ink-2 truncate">
                  <CategoryIconInline
                    slug={profile.category_slug}
                    name={profile.category_name}
                    size={11}
                  />
                  {profile.category_name}
                </span>
              )}
              {profile.profile_type && profile.category_name && (
                <span className="text-ink-4 text-[11px]" aria-hidden="true">·</span>
              )}
              {profile.profile_type && (
                <span className={`text-[11.5px] font-medium shrink-0 ${TYPE_STYLES[profile.profile_type] || 'text-ink-2'}`}>
                  {TYPE_LABELS[profile.profile_type] || profile.profile_type}
                </span>
              )}
            </div>

            {city && (
              <div className="flex items-center gap-0.5 shrink-0 text-ink-2">
                <MapPin size={10} aria-hidden="true" />
                <span className="text-[11px] truncate max-w-[80px]">{city}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}

/* ── ProfileCardLarge ─────────────────────────────────────────────────────── */
export function ProfileCardLarge({ profile }) {
  const rating  = Number(profile.avg_rating) || 0
  const reviews = profile.review_count || 0
  const city    = profile.city || profile.country || null

  return (
    <article className="group relative h-full">
      <Link
        to={`/p/${profile.slug}`}
        aria-label={`View ${profile.display_name}'s profile`}
        className="
          block bg-surface rounded-2xl overflow-hidden
          border border-border cursor-pointer h-full
          transition-all duration-200 ease-out
          hover:border-brand-border hover:shadow-[0_6px_32px_rgba(0,0,0,0.10)]
          hover:-translate-y-0.5 hover:no-underline
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
              aria-hidden="true"
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
                <div className="w-full h-full flex items-center justify-center bg-brand-light" aria-hidden="true">
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
                <span className="text-[12px] text-ink-2">
                  ({reviews} review{reviews !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-[16px] font-semibold text-ink leading-snug line-clamp-1 flex-1 min-w-0">
              {profile.display_name}
            </h3>
            {profile.is_verified && (
              <BadgeCheck size={16} className="text-brand shrink-0" aria-label="Verified profile" />
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
                <span className="flex items-center gap-1 text-[12px] text-ink-2 truncate">
                  <CategoryIconInline slug={profile.category_slug} name={profile.category_name} size={12} />
                  {profile.category_name}
                </span>
              )}
              {profile.profile_type && profile.category_name && (
                <span className="text-ink-4 text-[11px]" aria-hidden="true">·</span>
              )}
              {profile.profile_type && (
                <span className={`text-[12px] font-medium shrink-0 ${TYPE_STYLES[profile.profile_type] || 'text-ink-2'}`}>
                  {TYPE_LABELS[profile.profile_type] || profile.profile_type}
                </span>
              )}
            </div>
            {city && (
              <div className="flex items-center gap-0.5 shrink-0 text-ink-2">
                <MapPin size={11} aria-hidden="true" />
                <span className="text-[11.5px] truncate max-w-[90px]">{city}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}

/* ── ProfileListCard ──────────────────────────────────────────────────────── */
export function ProfileListCard({ profile }) {
  const rating  = Number(profile.avg_rating) || 0
  const reviews = profile.review_count || 0
  const city    = profile.city || profile.country || null

  return (
    <article className="group relative">
      <Link
        to={`/p/${profile.slug}`}
        aria-label={`View ${profile.display_name}'s profile`}
        className="
          flex items-stretch gap-0
          bg-surface rounded-xl overflow-hidden
          border border-border cursor-pointer
          transition-all duration-200 ease-out
          hover:border-brand-border hover:shadow-[0_2px_16px_rgba(0,0,0,0.07)]
          hover:no-underline
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
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, var(--color-brand-light) 0%, var(--color-surface-2) 100%)`,
              }}
            />
          )}
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
                <div className="w-full h-full flex items-center justify-center bg-brand-light" aria-hidden="true">
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
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-[14px] font-semibold text-ink leading-snug line-clamp-1 flex-1 min-w-0">
              {profile.display_name}
            </h3>
            {profile.is_verified && (
              <BadgeCheck size={14} className="text-brand shrink-0" aria-label="Verified profile" />
            )}
            {profile.is_featured && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                Featured
              </span>
            )}
          </div>

          {profile.headline && (
            <p className="text-[12.5px] text-ink-2 line-clamp-1 leading-snug">
              {profile.headline}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {profile.category_name && (
              <span className="flex items-center gap-1 text-[11.5px] text-ink-2">
                <CategoryIconInline
                  slug={profile.category_slug}
                  name={profile.category_name}
                  size={11}
                />
                {profile.category_name}
              </span>
            )}
            {profile.profile_type && profile.category_name && (
              <span className="text-ink-4 text-[11px]" aria-hidden="true">·</span>
            )}
            {profile.profile_type && (
              <span className={`text-[11.5px] font-medium ${TYPE_STYLES[profile.profile_type] || 'text-ink-2'}`}>
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
              <span className="text-[11px] text-ink-2 hidden sm:inline">({reviews})</span>
            </div>
          ) : (
            <span className="text-[11px] text-ink-2">No reviews</span>
          )}
          {city && (
            <div className="flex items-center gap-0.5 text-ink-2">
              <MapPin size={10} aria-hidden="true" />
              <span className="text-[11px] max-w-[72px] truncate">{city}</span>
            </div>
          )}
          {/* Navigate affordance — purely decorative */}
          <span
            className="text-ink-4 group-hover:text-brand group-hover:translate-x-0.5 transition-all duration-150 mt-0.5"
            aria-hidden="true"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" focusable="false">
              <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </Link>
    </article>
  )
}
