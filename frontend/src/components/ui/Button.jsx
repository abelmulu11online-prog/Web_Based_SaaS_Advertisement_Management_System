/**
 * Button — reusable button with variant and loading support.
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style = {},
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'var(--sans)',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none',
    borderRadius: '8px',
    transition: 'opacity 0.15s, background 0.15s',
    opacity: disabled || loading ? 0.6 : 1,
    whiteSpace: 'nowrap',
  }

  const sizes = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' },
  }

  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    secondary: { background: 'var(--code-bg)', color: 'var(--text-h)', border: '1px solid var(--border)' },
    danger: { background: '#dc2626', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent-border)' },
    success: { background: '#16a34a', color: '#fff' },
    warning: { background: '#d97706', color: '#fff' },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      {...rest}
    >
      {loading ? '⏳' : children}
    </button>
  )
}
