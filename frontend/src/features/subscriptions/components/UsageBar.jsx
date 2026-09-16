export function UsageBar({ usage, plan }) {
  if (!usage || !plan) return null
  const { active_ads = 0 } = usage
  const max = plan.max_active_ads || 1
  const pct = Math.min(100, (active_ads / max) * 100)
  const color = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-yellow-400' : 'bg-brand'

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5 text-[12px]">
        <span className="text-ink-2 font-medium">Active listings</span>
        <span className="text-ink-3">{active_ads} / {max}</span>
      </div>
      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={active_ads}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      <p className="text-[11px] text-ink-3 mt-1">
        {Math.max(0, max - active_ads)} listing{max - active_ads !== 1 ? 's' : ''} remaining
      </p>
    </div>
  )
}
