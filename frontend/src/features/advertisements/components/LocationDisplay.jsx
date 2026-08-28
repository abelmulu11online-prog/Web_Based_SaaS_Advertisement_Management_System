/**
 * LocationDisplay — shows stored location data cleanly.
 *
 * Phase 5: displays address text and coordinates.
 * Phase 7: this component will be connected to the full interactive map system.
 * The interface is designed to accept the same props that the Phase 7 map will use.
 */
export function LocationDisplay({ latitude, longitude, address }) {
  const hasCoords = latitude !== null && latitude !== undefined
    && longitude !== null && longitude !== undefined

  if (!address && !hasCoords) return null

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'var(--code-bg)',
      }}
    >
      {/* Map placeholder — Phase 7 will render an interactive map here */}
      {hasCoords && (
        <div
          style={{
            height: '180px',
            background: 'var(--code-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--border)',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '32px' }}>🗺️</span>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
            Map will be available in a future update
          </p>
          <code style={{ fontSize: '12px' }}>
            {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
          </code>
        </div>
      )}

      {/* Address */}
      {address && (
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>📍</span>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-h)', lineHeight: 1.5 }}>
            {address}
          </p>
        </div>
      )}
    </div>
  )
}
