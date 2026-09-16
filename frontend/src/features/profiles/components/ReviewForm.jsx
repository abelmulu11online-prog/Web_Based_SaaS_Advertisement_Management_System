/**
 * ReviewForm.jsx
 *
 * Accessibility improvements:
 * - Star picker announces selected rating via an aria-live region so screen
 *   reader users hear "3 stars selected — Good" without needing to move focus.
 * - Comment textarea has a visible <label> (not just placeholder text).
 * - Textarea is linked to its label via htmlFor/id.
 * - aria-describedby on textarea wires the character count and error message.
 * - Error message uses role="alert" so it is announced immediately.
 * - Submit button is inside the form so Enter submits naturally.
 */
import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '../../../components/ui/Button.jsx'
import { Link } from 'react-router-dom'

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export function ReviewForm({ slug, onSubmit, loading = false, isLoggedIn = false }) {
  const [rating,  setRating]  = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [error,   setError]   = useState('')

  if (!isLoggedIn) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-5 text-center">
        <Star size={24} className="mx-auto mb-2 text-yellow-400 fill-yellow-100" aria-hidden="true" />
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
    if (rating === 0) { setError('Please select a star rating before submitting.'); return }
    setError('')
    onSubmit({ rating, comment: comment.trim() || undefined })
  }

  const activeDisplay = hovered || rating
  const charCountId   = `review-char-count-${slug}`
  const errorId       = `review-error-${slug}`
  const commentId     = `review-comment-${slug}`

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5" noValidate>
      <h3 className="text-[14px] font-semibold text-ink mb-4">Write a review</h3>

      {/* ── Star picker ─────────────────────────────────────────────── */}
      <fieldset className="mb-4 border-0 p-0 m-0">
        <legend className="text-[13px] font-medium text-ink mb-2 select-none">
          Rating <span className="text-danger" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </legend>

        <div className="flex items-center gap-1" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => { setRating(n); setError('') }}
              className="p-0.5 transition-transform hover:scale-125 active:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
              aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
              aria-pressed={rating === n}
            >
              <Star
                size={28}
                aria-hidden="true"
                className={`transition-colors ${n <= activeDisplay ? 'text-yellow-400 fill-yellow-400' : 'text-border-2'}`}
              />
            </button>
          ))}

          {/* Live region announces selected rating to screen readers */}
          <span
            aria-live="polite"
            aria-atomic="true"
            className="ml-2 text-[13px] text-ink-2"
          >
            {rating > 0 ? `${RATING_LABELS[rating]} (${rating} of 5 stars selected)` : ''}
          </span>
        </div>
      </fieldset>

      {/* ── Comment ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 mb-3">
        <label htmlFor={commentId} className="text-[13px] font-medium text-ink select-none">
          Comment <span className="text-ink-3 font-normal">(optional)</span>
        </label>
        <textarea
          id={commentId}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Describe your experience…"
          maxLength={2000}
          rows={3}
          aria-describedby={`${charCountId}${error ? ` ${errorId}` : ''}`}
          className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-[13.5px] text-ink placeholder:text-ink-3 outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 resize-none transition-colors"
        />
        <div className="flex items-center justify-between">
          <p
            id={charCountId}
            className={`text-[11px] ${comment.length > 1800 ? 'text-warning font-medium' : 'text-ink-3'}`}
            aria-live="polite"
          >
            {comment.length}/2000 characters
          </p>
          {/* Error — role="alert" so it is immediately announced */}
          {error && (
            <p id={errorId} role="alert" className="text-[12px] text-danger flex items-center gap-1">
              <span aria-hidden="true">⚠</span> {error}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" variant="primary" size="sm" loading={loading}>
        Submit review
      </Button>
    </form>
  )
}
