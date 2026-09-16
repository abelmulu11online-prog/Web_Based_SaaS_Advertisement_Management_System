/**
 * RadiusSelector.jsx — Dropdown to pick a search radius.
 *
 * Props:
 *   value     {number}            Currently selected radius in km
 *   onChange  {(km: number)=>void}
 *   className {string}
 */
const RADIUS_OPTIONS = [
  { value: 5,   label: '5 km' },
  { value: 10,  label: '10 km' },
  { value: 25,  label: '25 km' },
  { value: 50,  label: '50 km' },
  { value: 100, label: '100 km' },
]

export function RadiusSelector({ value, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-[12px] text-ink-3 whitespace-nowrap">Radius:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${
              value === opt.value
                ? 'bg-brand text-white border-brand'
                : 'bg-canvas text-ink-2 border-border hover:border-brand hover:text-brand'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export { RADIUS_OPTIONS }
