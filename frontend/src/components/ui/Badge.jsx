const variants = {
  default: 'bg-surface-2 text-ink-2 border border-border',
  success: 'bg-success-bg text-success border border-green-200',
  warning: 'bg-warning-bg text-warning border border-yellow-200',
  danger:  'bg-danger-bg  text-danger  border border-red-200',
  info:    'bg-blue-50    text-blue-700 border border-blue-200',
  brand:   'bg-brand-light text-brand border border-brand-border',
  dark:    'bg-ink text-white border border-ink',
}

const sizes = {
  xs: 'text-[11px] px-1.5 py-0.5',
  sm: 'text-xs     px-2   py-0.5',
  md: 'text-sm     px-2.5 py-1',
}

export function Badge({ children, variant = 'default', size = 'sm', dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded leading-tight whitespace-nowrap ${variants[variant] ?? variants.default} ${sizes[size] ?? sizes.sm} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  )
}
