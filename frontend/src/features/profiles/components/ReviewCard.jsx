import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Reply, Trash2, Send } from 'lucide-react'
import { Button } from '../../../components/ui/Button.jsx'

function StarRow({ rating, size = 12 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size} className={n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-border-2'} />
      ))}
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

function Avatar({ name, avatar, slug, size = 9 }) {
  const cls = `w-${size} h-${size} rounded-full bg-brand-light flex items-center justify-center shrink-0 overflow-hidden`
  const inner = avatar ? (
    <img src={avatar} alt={name} className="w-full h-full object-cover" />
  ) : (
    <span className="text-[13px] font-bold text-brand">{name?.[0]?.toUpperCase() || '?'}</span>
  )
  if (slug) {
    return (
      <Link to={`/p/${slug}`} className={`${cls} hover:ring-2 hover:ring-brand transition-all`} title={`View ${name}'s profile`}>
        {inner}
      </Link>
    )
  }
  return <div className={cls}>{inner}</div>
}

export function ReviewCard({ review, onDelete, onReply, onDeleteReply, canDelete = false, canReply = false }) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState(review.reply?.body || '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmitReply(e) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      await onReply?.(review.id, replyText.trim())
      setShowReplyForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden hover:shadow-sm transition-all">
      {/* Review */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Clickable reviewer avatar */}
          <Avatar
            name={review.reviewer_name}
            avatar={review.reviewer_avatar}
            slug={review.reviewer_slug}
            size={9}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Clickable reviewer name */}
                {review.reviewer_slug ? (
                  <Link
                    to={`/p/${review.reviewer_slug}`}
                    className="text-[13.5px] font-semibold text-ink hover:text-brand hover:no-underline transition-colors"
                  >
                    {review.reviewer_name || 'Anonymous'}
                  </Link>
                ) : (
                  <span className="text-[13.5px] font-semibold text-ink">
                    {review.reviewer_name || 'Anonymous'}
                  </span>
                )}
                <span className="text-[11px] text-ink-3">{timeAgo(review.created_at)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {canReply && !review.reply && (
                  <button
                    onClick={() => setShowReplyForm(v => !v)}
                    className="text-[11px] text-ink-3 hover:text-brand flex items-center gap-1 px-2 py-0.5 rounded hover:bg-brand-light transition-all"
                  >
                    <Reply size={11} />
                    {showReplyForm ? 'Cancel' : 'Reply'}
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(review.id)}
                    className="text-[11px] text-danger hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <StarRow rating={review.rating} size={12} />

            {review.comment && (
              <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">{review.comment}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reply form — only shown when canReply and no existing reply */}
      {showReplyForm && canReply && !review.reply && (
        <form
          onSubmit={handleSubmitReply}
          className="mx-4 mb-4 border border-border rounded-xl p-3 bg-surface-2"
        >
          <p className="text-[12px] font-semibold text-ink mb-2">Reply as owner</p>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write your response to this review…"
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-brand resize-none mb-2"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-3">{replyText.length}/2000</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="xs" onClick={() => setShowReplyForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="xs" loading={submitting} icon={<Send size={11} />}>
                Post reply
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Existing reply */}
      {review.reply && (
        <div className="mx-4 mb-4 border-l-2 border-brand pl-3 bg-brand-light/30 rounded-r-xl py-3 pr-3">
          <div className="flex items-start gap-2">
            <Avatar
              name={review.reply.author_name}
              avatar={review.reply.author_avatar}
              slug={review.reply.author_slug}
              size={7}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-brand">
                    {review.reply.author_name}
                  </span>
                  <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-medium">
                    Owner
                  </span>
                  <span className="text-[11px] text-ink-3">{timeAgo(review.reply.created_at)}</span>
                </div>
                {canReply && (
                  <button
                    onClick={() => onDeleteReply?.(review.id)}
                    className="text-[11px] text-ink-3 hover:text-danger transition-colors"
                    title="Delete reply"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              <p className="text-[12.5px] text-ink-2 leading-relaxed">{review.reply.body}</p>
            </div>
          </div>
          {/* Edit reply */}
          {canReply && (
            <button
              onClick={() => setShowReplyForm(v => !v)}
              className="mt-2 text-[11px] text-brand hover:underline flex items-center gap-1"
            >
              <Reply size={10} /> Edit reply
            </button>
          )}
          {showReplyForm && canReply && (
            <form onSubmit={handleSubmitReply} className="mt-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={2}
                maxLength={2000}
                className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-[13px] outline-none focus:border-brand resize-none mb-1"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="xs" onClick={() => { setShowReplyForm(false); setReplyText(review.reply?.body || '') }}>Cancel</Button>
                <Button type="submit" variant="primary" size="xs" loading={submitting}>Update</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
