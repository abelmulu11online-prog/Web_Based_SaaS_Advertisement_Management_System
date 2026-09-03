export function ProfileNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <nav className="flex overflow-x-auto scrollbar-hide" aria-label="Profile sections">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-shrink-0 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors duration-150 whitespace-nowrap
              ${activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-2 hover:text-ink hover:border-border-2'
              }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[11px] text-ink-3">({tab.count})</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
