/**
 * LocationSearch.jsx — Address search input backed by Nominatim geocoding.
 *
 * Design:
 *  - Debounces input to avoid hammering Nominatim (500 ms).
 *  - Respects Nominatim usage policy: ≤1 req/s, User-Agent set on backend.
 *  - Shows a dropdown of candidate results.
 *  - Calls onSelect({ display_name, lat, lon }) when user picks a result.
 *
 * Props:
 *   onSelect   {(result) => void}  Called with the chosen geocode result
 *   placeholder {string}
 *   className   {string}
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, LoaderCircle, MapPin } from 'lucide-react'
import { geocodeAddress } from '../services/locationsService.js'

export function LocationSearch({
  onSelect,
  placeholder = 'Search for a location…',
  className = '',
}) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [error, setError]       = useState(null)
  const debounceRef             = useRef(null)
  const containerRef            = useRef(null)

  // Debounce geocode requests — 500 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await geocodeAddress(trimmed, 5)
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setError('Search unavailable. Check your connection.')
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function handleSelect(result) {
    setQuery(result.display_name)
    setOpen(false)
    setResults([])
    onSelect?.(result)
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
    setError(null)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        {loading ? (
          <LoaderCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand animate-spin pointer-events-none" />
        ) : (
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full h-9 pl-8 pr-8 bg-canvas border border-border rounded text-[13.5px] text-ink placeholder:text-ink-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1 text-[12px] text-danger">{error}</p>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-[9999] left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {results.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-2 transition-colors"
              >
                <MapPin size={13} className="text-brand mt-0.5 shrink-0" />
                <span className="text-[13px] text-ink leading-snug line-clamp-2">
                  {result.display_name}
                </span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 border-t border-border">
            <p className="text-[10px] text-ink-3">
              Search by{' '}
              <a
                href="https://nominatim.openstreetmap.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-brand"
              >
                OpenStreetMap Nominatim
              </a>
            </p>
          </li>
        </ul>
      )}
    </div>
  )
}
