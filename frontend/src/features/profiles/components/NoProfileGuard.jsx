import { Link } from 'react-router-dom'
import { UserCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button.jsx'
import { useMyProfile } from '../hooks/useProfile.js'

/**
 * Wraps dashboard content pages that require a profile to exist.
 * Shows a friendly prompt to create a profile if none exists.
 */
export function NoProfileGuard({ children }) {
  const { data: profile, isLoading } = useMyProfile()

  if (isLoading) return null

  if (!profile) {
    return (
      <div className="py-16 flex flex-col items-center text-center gap-4 max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
          <UserCircle size={28} className="text-brand" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-ink mb-1">Set up your profile first</p>
          <p className="text-[13px] text-ink-3">
            You need a public profile before you can add products, services, or other content.
          </p>
        </div>
        <Link to="/dashboard/profile">
          <Button variant="primary" size="sm">Create your profile</Button>
        </Link>
      </div>
    )
  }

  return children
}
