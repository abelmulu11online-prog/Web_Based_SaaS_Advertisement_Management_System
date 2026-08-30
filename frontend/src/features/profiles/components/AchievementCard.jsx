import { Award, ExternalLink } from 'lucide-react'

export function AchievementCard({ achievement }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-surface border border-border rounded-lg hover:border-border-2 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
        <Award size={16} className="text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] font-semibold text-ink">{achievement.title}</p>
          {achievement.certificate_url && (
            <a href={achievement.certificate_url} target="_blank" rel="noopener noreferrer"
              className="text-brand hover:no-underline shrink-0 mt-0.5">
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        {achievement.organization && (
          <p className="text-[12px] text-ink-3 mt-0.5">{achievement.organization}</p>
        )}
        {achievement.description && (
          <p className="text-[12.5px] text-ink-2 mt-1 line-clamp-2">{achievement.description}</p>
        )}
        {achievement.date && (
          <p className="text-[11px] text-ink-3 mt-1">
            {new Date(achievement.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
        )}
      </div>
    </div>
  )
}
