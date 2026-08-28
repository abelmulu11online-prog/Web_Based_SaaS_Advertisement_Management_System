/**
 * ImageGallery — advertisement image gallery with primary/thumbnail navigation.
 */
import { useState } from 'react'

export function ImageGallery({ images }) {
  const primary = images?.find((img) => img.is_primary) || images?.[0]
  const [selected, setSelected] = useState(primary || null)

  if (!images || images.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '320px',
          background: 'var(--code-bg)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '48px', opacity: 0.4 }}>📷</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Main image */}
      <div
        style={{
          width: '100%',
          height: '360px',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
        }}
      >
        {selected && (
          <img
            src={selected.image_url}
            alt={selected.alt_text || 'Advertisement image'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      {/* Thumbnails (only shown when > 1 image) */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelected(img)}
              style={{
                flexShrink: 0,
                width: '72px',
                height: '72px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: selected?.id === img.id
                  ? '2px solid var(--accent)'
                  : '2px solid var(--border)',
                padding: 0,
                cursor: 'pointer',
                background: 'var(--code-bg)',
              }}
            >
              <img
                src={img.image_url}
                alt={img.alt_text || ''}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
