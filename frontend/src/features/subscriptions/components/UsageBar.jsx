/**
 * UsageBar.jsx — "X of Y ads used" progress bar.
 */

export function UsageBar({ usage, plan }) {
  if (!usage || !plan) return null

  const { active_ads } = usage
  const max = plan.max_active_ads
  const pct = max > 0 ? Math.min(100, (active_ads / max) * 100) : 0

  const barColor =
    pct >= 100 ? '#ef4444' :
    pct >= 80  ? '#f59e0b' :
    '#22c55e'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text)' }}>
        <span>Active advertisements</span>
        <span style={{ fontWeight: 600, color: 'var(--text-h)' }}>
          {active_ads} / {max}
        </span>
      </div>
      <div
        style={{
          height: '8px',
          background: 'var(--border)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            borderRadius: '9999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {pct >= 100 && (
        <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>
          Plan limit reached — archive an ad or upgrade your plan to publish more.
        </p>
      )}
    </div>
  )
}
