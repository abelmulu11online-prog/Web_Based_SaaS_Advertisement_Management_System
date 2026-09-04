/**
 * ProfileNav.jsx — Minimal tab navigation integrated into the profile page.
 *
 * Design: bottom-border indicator (not filled pill) — feels like editorial
 * section navigation rather than a widget inside a card.
 * Sticky at top so users always know where they are.
 */
export function ProfileNav({ tabs, activeTab, onTabChange }) {
  return (
    <div
      className="
        sticky top-[60px] z-30
        bg-surface/95 backdrop-blur-sm
        border-b border-border
      "
      role="navigation"
      aria-label="Profile sections"
    >
      <div
        className="
          flex overflow-x-auto gap-0
          -mx-5 sm:-mx-8 px-5 sm:px-8
        "
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            aria-current={activeTab === tab.key ? 'page' : undefined}
            className={`
              relative flex items-center gap-1.5
              shrink-0 px-1 mr-5 py-3
              text-[13.5px] font-medium whitespace-nowrap
              border-b-2 transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset
              ${activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-3 hover:text-ink hover:border-border-2'
              }
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`
                  text-[11px] tabular-nums
                  ${activeTab === tab.key ? 'text-brand/70' : 'text-ink-4'}
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
