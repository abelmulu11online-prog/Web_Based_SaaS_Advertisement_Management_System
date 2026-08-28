/**
 * FormField — label + input/textarea/select wrapper with error display.
 */
export function FormField({
  label,
  error,
  required,
  hint,
  children,
  style = {},
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', ...style }}>
      {label && (
        <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-h)' }}>
          {label}
          {required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span style={{ fontSize: '12px', color: 'var(--text)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: '12px', color: '#dc2626' }}>{error}</span>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  fontSize: '14px',
  fontFamily: 'var(--sans)',
  color: 'var(--text-h)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

export function Input({ error, style = {}, ...props }) {
  return (
    <input
      style={{
        ...inputStyle,
        ...(error ? { borderColor: '#dc2626' } : {}),
        ...style,
      }}
      {...props}
    />
  )
}

export function Textarea({ error, style = {}, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      style={{
        ...inputStyle,
        resize: 'vertical',
        minHeight: '100px',
        ...(error ? { borderColor: '#dc2626' } : {}),
        ...style,
      }}
      {...props}
    />
  )
}

export function Select({ error, style = {}, children, ...props }) {
  return (
    <select
      style={{
        ...inputStyle,
        cursor: 'pointer',
        ...(error ? { borderColor: '#dc2626' } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}
