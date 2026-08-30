import { Loader2 } from 'lucide-react'

const base = 'inline-flex items-center justify-center gap-2 font-medium font-sans rounded leading-none transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1'

const variants = {
  primary:   'bg-brand text-white border border-brand hover:bg-brand-hover active:bg-brand-hover',
  secondary: 'bg-surface text-ink border border-border-2 hover:bg-surface-2 active:bg-surface-2',
  ghost:     'bg-transparent text-ink-2 border border-transparent hover:bg-surface-2 hover:text-ink',
  outline:   'bg-transparent text-brand border border-brand hover:bg-brand-light',
  danger:    'bg-danger text-white border border-danger hover:opacity-90',
}

const sizes = {
  xs: 'h-7  px-2.5 text-xs  gap-1.5',
  sm: 'h-8  px-3   text-sm  gap-1.5',
  md: 'h-9  px-4   text-sm  gap-2',
  lg: 'h-11 px-5   text-[15px] gap-2',
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
  ...rest
}) {
  const cls = [
    base,
    variants[variant] ?? variants.primary,
    sizes[size] ?? sizes.md,
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ')

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cls}
      {...rest}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin-slow" />
        : icon && <span className="flex items-center shrink-0">{icon}</span>
      }
      {children}
      {!loading && iconRight && (
        <span className="flex items-center shrink-0">{iconRight}</span>
      )}
    </button>
  )
}
