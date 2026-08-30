import { Badge } from '../../../components/ui/Badge.jsx'

const TYPE_VARIANT = {
  UPDATE: 'default', ANNOUNCEMENT: 'info', PROMOTION: 'brand',
  ACHIEVEMENT: 'success', PROJECT: 'warning',
}
const TYPE_LABELS = {
  UPDATE: 'Update', ANNOUNCEMENT: 'Announcement', PROMOTION: 'Promotion',
  ACHIEVEMENT: 'Achievement', PROJECT: 'Project',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function PostCard({ post }) {
  const imgUrl = post.primary_image?.image_url

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-2 transition-colors">
      {imgUrl && (
        <div className="h-40 bg-surface-2 overflow-hidden">
          <img src={imgUrl} alt={post.title || 'Post'} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={TYPE_VARIANT[post.post_type] || 'default'} size="xs">
            {TYPE_LABELS[post.post_type] || post.post_type}
          </Badge>
          {post.is_pinned && <Badge variant="dark" size="xs">Pinned</Badge>}
          <span className="ml-auto text-[11px] text-ink-3">
            {timeAgo(post.published_at || post.created_at)}
          </span>
        </div>
        {post.title && (
          <p className="text-[13.5px] font-semibold text-ink mb-1 line-clamp-2">{post.title}</p>
        )}
        <p className="text-[13px] text-ink-2 line-clamp-3">{post.content}</p>
      </div>
    </div>
  )
}
