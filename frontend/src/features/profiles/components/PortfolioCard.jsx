/**
 * PortfolioCard.jsx — Visual gallery card for portfolio items.
 *
 * Design intent:
 *   - Image dominates. Text is minimal and secondary.
 *   - Hover reveals metadata as an overlay — doesn't crowd the card.
 *   - No heavy borders. The image is the card.
 *   - Click navigates to project_url if available.
 *   - variant='large' is used for featured/hero slot in asymmetric gallery.
 */
import { ExternalLink, FolderOpen } from 'lucide-react'

export function PortfolioCard({ item, variant = 'default' }) {
  const imgUrl = item.primary_image?.image_url
  const isLarge = variant === 'large'

  const inner = (
    <div
      className={`
        group relative overflow-hidden rounded-xl bg-surface-2
        border border-border
        transition-all duration-200 ease-out
        hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]
        hover:-translate-y-0.5
        ${isLarge ? 'aspect-[4/3]' : 'aspect-square'}
      `}
    >
      {/* Image or placeholder */}
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-ink-4">
          <FolderOpen size={isLarge ? 32 : 24} aria-hidden="true" />
        </div>
      )}

      {/* Hover overlay — reveals title + meta */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-t from-black/70 via-black/20 to-transparent
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          flex flex-col justify-end p-3.5
        "
      >
        <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 mb-1">
          {item.title}
        </p>
        <div className="flex items-center justify-between gap-2">
          {(item.client || item.completion_date) && (
            <p className="text-[11px] text-white/70">
              {item.client}
              {item.client && item.completion_date && ' · '}
              {item.completion_date && new Date(item.completion_date).getFullYear()}
            </p>
          )}
          {item.project_url && (
            <span className="flex items-center gap-1 text-[11px] text-white/80 shrink-0">
              <ExternalLink size={11} aria-hidden="true" />
              View
            </span>
          )}
        </div>
      </div>

      {/* Featured badge */}
      {item.is_featured && (
        <div
          className="
            absolute top-2.5 left-2.5
            text-[10px] font-bold text-amber-900
            bg-amber-400 px-2 py-0.5 rounded-full leading-none
          "
        >
          Featured
        </div>
      )}
    </div>
  )

  if (item.project_url) {
    return (
      <a
        href={item.project_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-xl"
        aria-label={`View ${item.title} project`}
      >
        {inner}
      </a>
    )
  }

  return inner
}
