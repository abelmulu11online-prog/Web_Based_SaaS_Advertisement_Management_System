import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '../../../components/ui/Button.jsx'
import { Link } from 'react-router-dom'

export function ReviewForm({ slug, onSubmit, loading = false, isLoggedIn = false }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  if (!isLoggedIn) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-5 text-center">
        <Star size={24} className="mx-auto mb-2 text-yellow-400 fill-yellow-100" />
        <p className="text-[13.5px] font-semibold text-ink mb-1">Share your experience</p>
        <p className="text-[12.5px] text-ink-2 mb-4">Log in to leave a review for this profile.</p>
        <div className="flex items-center justify-center gap-2">
          <Link to="/login">
            <Button variant="primary" size="sm">Log in</Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" size="sm">Sign up</Button>
          </Link>
        </div>
      </div>
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating'); return }
    setError('')
    onSubmit({ rating, comment: comment.trim() || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-[14px] font-semibold text-ink mb-4">Write a review</h3>

      {/* Star picker */}
      <div className="flex items-center gap-1 mb-4">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(n)}
            className="p-0.5 transition-transform hover:scale-125 active:scale-110"
            aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
          >
            <Star
              size={28}
              className={`transition-colors ${n <= (hovered || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-border-2'}`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-[13px] text-ink-2">
            {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Describe your experience (optional)…"
        maxLength={2000}
        rows={3}
        className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-[13.5px] text-ink placeholder:text-ink-3 outline-none focus:border-brand resize-none transition-colors mb-1"
      />
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] ${comment.length > 1800 ? 'text-warning' : 'text-ink-3'}`}>
          {comment.length}/2000
        </span>
        {error && <p className="text-[12px] text-danger">{error}</p>}
      </div>

      <Button type="submit" variant="primary" size="sm" loading={loading}>
        Submit review
      </Button>
    </form>
  )
}
