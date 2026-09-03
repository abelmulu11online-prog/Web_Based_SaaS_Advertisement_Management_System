import { useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

export function ImageGallery({ images = [] }) {
  const sorted = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
  const [idx, setIdx] = useState(0)
  const current = sorted[idx]

  if (!sorted.length) {
    return (
      <div className="w-full rounded-xl bg-surface-2 border border-border flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
        <ImageIcon size={40} className="text-border-2" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Main image */}
      <div className="relative rounded-xl overflow-hidden bg-surface-2" style={{ aspectRatio: '4/3' }}>
        <img
          src={current.image_url}
          alt={current.alt_text || 'Listing image'}
          className="w-full h-full object-cover"
        />
        {sorted.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setIdx(i => Math.min(sorted.length - 1, i + 1))}
              disabled={idx === sorted.length - 1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
            <span className="absolute bottom-2.5 right-2.5 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {idx + 1}/{sorted.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIdx(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
