/**
 * Badge — small status/label pill component.
 */
const STATUS_STYLES = {
  DRAFT: { background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)' },
  PUBLISHED: { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' },
  PAUSED: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' },
  EXPIRED: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' },
  ARCHIVED: { background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)' },
}

export function Badge({ status, children }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT
  return (
    <span
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: '20px',
        whiteSpace: 'nowrap',
      }}
    >
      {children || status}
    </span>
  )
}
