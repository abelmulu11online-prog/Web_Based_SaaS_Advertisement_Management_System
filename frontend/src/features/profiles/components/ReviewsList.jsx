import { Star, MessageSquare } from 'lucide-react'
import { ReviewCard } from './ReviewCard.jsx'
import { Button } from '../../../components/ui/Button.jsx'
import { Skeleton } from '../../../components/ui/Skeleton.jsx'

function RatingSummary({ stats }) {
  const avg = Number(stats?.avg_rating) || 0
  const count = stats?.review_count || 0
  if (count === 0) return null

  return (
    <div className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl mb-5">
      <div className="text-center">
        <div className="text-4xl font-extrabold text-ink">{avg.toFixed(1)}</div>
        <div className="flex justify-center mt-1">
          {[1,2,3,4,5].map(n => (
            <Star key={n} size={12} className={n <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-border-2'} />
          ))}
        </div>
        <p className="text-[11px] text-ink-3 mt-1">{count} review{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

export function ReviewsList({ reviews = [], stats, loading, hasMore, onLoadMore, loadingMore, currentUserId, onDelete, onReply, onDeleteReply, isProfileOwner = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={36} className="mx-auto mb-3 text-ink-4" />
        <p className="text-[14px] font-semibold text-ink mb-1">No reviews yet</p>
        <p className="text-[13px] text-ink-2">Be the first to share your experience!</p>
      </div>
    )
  }

  return (
    <div>
      <RatingSummary stats={stats} />
      <div className="space-y-3">
        {reviews.map(r => (
          <ReviewCard
            key={r.id}
            review={r}
            canDelete={currentUserId && r.reviewer_user_id === currentUserId}
            canReply={isProfileOwner}
            onDelete={onDelete}
            onReply={onReply}
            onDeleteReply={onDeleteReply}
          />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-6">
          <Button variant="secondary" size="sm" loading={loadingMore} onClick={onLoadMore}>
            Load more reviews
          </Button>
        </div>
      )}
    </div>
  )
}
