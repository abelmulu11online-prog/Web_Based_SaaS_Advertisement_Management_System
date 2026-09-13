/**
 * PostCard.jsx — Content-first post entry.
 *
 * Design intent:
 *   - Content (title + body) is primary. Everything else supports.
 *   - Image sits above text when present — full-bleed, strong visual.
 *   - Post type label is subtle, not a heavy badge.
 *   - Date/time sits quietly at the end of the meta row.
 *   - No heavy card borders — subtle surface with clean hover.
 */

const TYPE_LABELS = {
  UPDATE:       'Update',
  ANNOUNCEMENT: 'Announcement',
  PROMOTION:    'Promotion',
  ACHIEVEMENT:  'Achievement',
  PROJECT:      'Project',
}

const TYPE_STYLES = {
  UPDATE:       'text-ink-3',
  ANNOUNCEMENT: 'text-blue-600',
  PROMOTION:    'text-brand',
  ACHIEVEMENT:  'text-amber-700',
  PROJECT:      'text-violet-600',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0)  return 'Today'
  if (days === 1)  return 'Yesterday'
  if (days < 7)   return `${days}d ago`
  if (days < 30)  return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function PostCard({ post }) {
  const imgUrl = post.primary_image?.image_url
  const typeLabel = TYPE_LABELS[post.post_type]
  const typeStyle = TYPE_STYLES[post.post_type] || 'text-ink-3'

  return (
    <article
      className="
        bg-surface border border-border rounded-xl overflow-hidden
        hover:border-brand-border hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)]
        transition-all duration-200 ease-out
      "
    >
      {/* Image */}
      {imgUrl && (
        <div className="h-44 bg-surface-2 overflow-hidden">
          <img
            src={imgUrl}
            alt={post.title || 'Post image'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        {/* Meta row: type · pinned · date */}
        <div className="flex items-center gap-2 mb-2.5">
          {typeLabel && (
            <span className={`text-[11.5px] font-semibold uppercase tracking-wide ${typeStyle}`}>
              {typeLabel}
            </span>
          )}
          {post.is_pinned && (
            <>
              <span className="text-ink-4 text-[11px]">·</span>
              <span className="text-[11px] font-medium text-ink-3">Pinned</span>
            </>
          )}
          <span className="ml-auto text-[11.5px] text-ink-4">
            {timeAgo(post.published_at || post.created_at)}
          </span>
        </div>

        {/* Title */}
        {post.title && (
          <h3 className="text-[14px] font-semibold text-ink leading-snug line-clamp-2 mb-1.5">
            {post.title}
          </h3>
        )}

        {/* Content */}
        <p className="text-[13px] text-ink-2 leading-relaxed line-clamp-3">
          {post.content}
        </p>
      </div>
    </article>
  )
}
