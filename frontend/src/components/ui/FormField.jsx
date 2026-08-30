export function FormField({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[13px] font-medium text-ink select-none">
          {label}
          {required && <span className="text-danger ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-3 leading-snug">{hint}</p>}
      {error && <p role="alert" className="text-xs text-danger leading-snug">{error}</p>}
    </div>
  )
}

const inputBase = 'w-full font-sans text-sm text-ink bg-surface border border-border-2 rounded px-3 py-2 h-9 outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:opacity-50 disabled:cursor-not-allowed'

export function Input({ error, className = '', ...props }) {
  return (
    <input
      className={`${inputBase} ${error ? 'border-danger focus:ring-danger/10 focus:border-danger' : ''} ${className}`}
      {...props}
    />
  )
}

export function Textarea({ error, rows = 4, className = '', ...props }) {
  return (
    <textarea
      rows={rows}
      className={`${inputBase} h-auto min-h-[90px] resize-y py-2 ${error ? 'border-danger focus:ring-danger/10 focus:border-danger' : ''} ${className}`}
      {...props}
    />
  )
}

export function Select({ error, children, className = '', ...props }) {
  return (
    <select
      className={`${inputBase} cursor-pointer ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
