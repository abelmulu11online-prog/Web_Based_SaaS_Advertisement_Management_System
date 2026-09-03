/**
 * ImageUploader — professional multi-image file picker for advertisement listings.
 *
 * Features:
 *  - Click to browse or drag & drop (desktop)
 *  - Gallery + camera capture on mobile via accept="image/*"
 *  - Up to 5 images (limit passed as prop, defaults to 5)
 *  - Local preview before upload
 *  - Remove individual images
 *  - Reorder via Up/Down buttons (first image = cover)
 *  - Cover indicator on first image
 *  - Client-side validation: type (JPEG/PNG/WEBP) and size (5 MB)
 *  - Matches existing design system (no gradients, no emoji, no dashed boxes)
 *
 * Usage:
 *   <ImageUploader
 *     files={files}           // File[] state
 *     onChange={setFiles}     // (File[]) => void
 *     maxImages={5}           // optional, default 5
 *     existingImages={[]}     // existing DB images (edit mode)
 *     onDeleteExisting={fn}   // (imageId) => void (edit mode)
 *   />
 */
import { useRef, useCallback } from 'react'
import { ImageIcon, X, ChevronUp, ChevronDown, Plus, AlertCircle } from 'lucide-react'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_MB   = 5
const MAX_SIZE_B    = MAX_SIZE_MB * 1024 * 1024

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `${file.name}: unsupported type. Use JPEG, PNG, or WEBP.`
  }
  if (file.size > MAX_SIZE_B) {
    return `${file.name}: exceeds ${MAX_SIZE_MB} MB limit.`
  }
  return null
}

export function ImageUploader({
  files = [],
  onChange,
  maxImages = 5,
  existingImages = [],
  onDeleteExisting,
  error,
}) {
  const inputRef = useRef(null)

  const totalCount = existingImages.length + files.length
  const remaining  = maxImages - totalCount
  const canAdd     = remaining > 0

  // ── File selection ─────────────────────────────────────────────────────────

  const handleFiles = useCallback(
    (incoming) => {
      const errors   = []
      const valid    = []
      const slots    = maxImages - existingImages.length - files.length

      Array.from(incoming).forEach((f) => {
        if (valid.length >= slots) {
          errors.push(`Too many files. Max ${maxImages} total.`)
          return
        }
        const err = validateFile(f)
        if (err) errors.push(err)
        else valid.push(f)
      })

      if (valid.length > 0) onChange([...files, ...valid])
      // errors shown inline via alert — non-blocking
      if (errors.length > 0) alert(errors.join('\n'))
    },
    [files, existingImages.length, maxImages, onChange],
  )

  function handleInputChange(e) {
    if (e.target.files?.length) handleFiles(e.target.files)
    // Reset so same file can be re-selected after removal
    e.target.value = ''
  }

  // ── Drag and drop ──────────────────────────────────────────────────────────

  function handleDragOver(e) { e.preventDefault() }
  function handleDrop(e) {
    e.preventDefault()
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  // ── Reorder ────────────────────────────────────────────────────────────────

  function moveFile(idx, dir) {
    const next  = [...files]
    const swap  = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  function removeFile(idx) {
    onChange(files.filter((_, i) => i !== idx))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const allPreviews = [
    ...existingImages.map((img) => ({ type: 'existing', id: img.id, url: img.image_url, alt: img.alt_text })),
    ...files.map((f, i)         => ({ type: 'new',      idx: i,    url: URL.createObjectURL(f), name: f.name })),
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink">Photos</p>
          <p className="text-[12px] text-ink-3 mt-0.5">
            Add up to {maxImages} photos. The first image will be the cover.
          </p>
        </div>
        <span className="text-[12px] text-ink-3 tabular-nums">{totalCount} / {maxImages}</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">

        {/* Existing + new previews */}
        {allPreviews.map((item, globalIdx) => (
          <div
            key={item.type === 'existing' ? `ex-${item.id}` : `new-${item.idx}`}
            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-surface-2 group"
          >
            <img
              src={item.url}
              alt={item.alt || ''}
              className="w-full h-full object-cover"
            />

            {/* Cover badge */}
            {globalIdx === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-medium text-center py-0.5">
                Cover
              </div>
            )}

            {/* Hover controls */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-1 gap-1">
              {/* Remove */}
              <button
                type="button"
                onClick={() =>
                  item.type === 'existing'
                    ? onDeleteExisting?.(item.id)
                    : removeFile(item.idx)
                }
                className="w-5 h-5 rounded bg-black/60 flex items-center justify-center text-white hover:bg-danger transition-colors"
                title="Remove"
              >
                <X size={10} />
              </button>
            </div>

            {/* Reorder controls for new files only */}
            {item.type === 'new' && files.length > 1 && (
              <div className="absolute bottom-6 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => moveFile(item.idx, -1)}
                  disabled={item.idx === 0}
                  className="w-5 h-5 rounded bg-black/60 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                  title="Move left / up"
                >
                  <ChevronUp size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => moveFile(item.idx, 1)}
                  disabled={item.idx === files.length - 1}
                  className="w-5 h-5 rounded bg-black/60 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                  title="Move right / down"
                >
                  <ChevronDown size={10} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add slot */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="aspect-square rounded-lg border border-dashed border-border-2 bg-surface hover:bg-surface-2 hover:border-brand transition-colors flex flex-col items-center justify-center gap-1 text-ink-3 hover:text-brand"
          >
            <Plus size={16} />
            <span className="text-[11px] font-medium">Add photo</span>
          </button>
        )}
      </div>

      {/* Validation error */}
      {error && (
        <div className="flex items-center gap-1.5 text-[12px] text-danger">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Hint */}
      <p className="text-[11px] text-ink-3">
        JPEG, PNG, or WEBP · Max {MAX_SIZE_MB} MB each · {remaining > 0 ? `${remaining} slot${remaining !== 1 ? 's' : ''} remaining` : 'Limit reached'}
      </p>

      {/* Hidden input — accepts images + allows gallery & camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        capture={undefined}         /* don't force camera — allow gallery choice */
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
