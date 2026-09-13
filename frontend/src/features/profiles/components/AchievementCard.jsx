/**
 * AchievementCard.jsx — Timeline-style achievement entry.
 *
 * Design intent:
 *   - Date/year is the anchor — floated left in the timeline.
 *   - Title is the primary text. Organization is secondary.
 *   - No generic Award icon box — the timeline dot IS the visual marker.
 *   - Certificate link is a clean inline affordance, not a button.
 *   - Multiple achievements form a continuous vertical timeline.
 */
import { ExternalLink } from 'lucide-react'

function formatAchievementDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  return { year, month }
}

export function AchievementCard({ achievement }) {
  const date = formatAchievementDate(achievement.date)

  return (
    <div className="relative flex gap-5 pb-7 last:pb-0 group">

      {/* Timeline column */}
      <div className="flex flex-col items-center shrink-0 w-14">
        {/* Year label */}
        {date && (
          <span className="text-[11px] font-bold text-ink-3 tabular-nums leading-none mb-1.5">
            {date.year}
          </span>
        )}
        {/* Timeline dot */}
        <div
          className="
            w-2.5 h-2.5 rounded-full shrink-0
            bg-brand/30 border-2 border-brand
            group-hover:bg-brand transition-colors duration-200
          "
          aria-hidden="true"
        />
        {/* Vertical connector line */}
        <div
          className="flex-1 w-px bg-border mt-2 last:hidden group-last:hidden"
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Month label */}
        {date?.month && (
          <span className="text-[11px] text-ink-4 font-medium uppercase tracking-wide mb-1 block">
            {date.month}
          </span>
        )}

        {/* Title row + certificate link */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-ink leading-snug">
            {achievement.title}
          </h3>
          {achievement.certificate_url && (
            <a
              href={achievement.certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View certificate"
              className="
                shrink-0 text-ink-3 hover:text-brand
                transition-colors duration-150 mt-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
              "
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Organization */}
        {achievement.organization && (
          <p className="text-[12.5px] text-brand font-medium mt-0.5">
            {achievement.organization}
          </p>
        )}

        {/* Description */}
        {achievement.description && (
          <p className="text-[13px] text-ink-2 leading-relaxed mt-1.5 line-clamp-3">
            {achievement.description}
          </p>
        )}
      </div>
    </div>
  )
}
