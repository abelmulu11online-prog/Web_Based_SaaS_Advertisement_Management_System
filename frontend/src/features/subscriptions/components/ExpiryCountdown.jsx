import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ExpiryCountdown({ subscription }) {
  if (!subscription) return null
  const { days_remaining, status } = subscription

  if (status === 'EXPIRED') {
    return (
      <div className="flex items-start gap-2.5 bg-danger-bg border border-red-200 rounded-lg px-4 py-3">
        <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
        <p className="text-[13px] text-danger">
          Your subscription has expired and your listings have been paused.{' '}
          <Link to="/pricing" className="font-semibold underline">Renew now</Link> to re-publish them.
        </p>
      </div>
    )
  }

  if (days_remaining != null && days_remaining <= 3 && days_remaining >= 0) {
    return (
      <div className="flex items-start gap-2.5 bg-warning-bg border border-yellow-200 rounded-lg px-4 py-3">
        <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
        <p className="text-[13px] text-warning">
          Your subscription expires in{' '}
          <strong>{days_remaining === 0 ? 'less than a day' : `${days_remaining} day${days_remaining > 1 ? 's' : ''}`}</strong>.{' '}
          <Link to="/pricing" className="font-semibold underline text-warning">Renew now</Link> to keep your listings active.
        </p>
      </div>
    )
  }

  return null
}
