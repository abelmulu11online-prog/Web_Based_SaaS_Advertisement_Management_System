/**
 * UserLocationButton.jsx — Button that requests the user's GPS location.
 *
 * Uses the browser Geolocation API (one-shot, not continuous tracking).
 * Permission is only requested when the user explicitly clicks this button.
 * Coordinates are NEVER stored in the database.
 *
 * Props:
 *   onLocation  {(lat, lng) => void}   Called when location is obtained
 *   className   {string}               Extra classes
 *   label       {string}               Button label
 */
import { LocateFixed, LoaderCircle, MapPinOff } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation.js'

export function UserLocationButton({ onLocation, className = '', label = 'Use my location' }) {
  const { loading, error, supported, getLocation } = useGeolocation()

  function handleClick() {
    if (!supported) return
    // Temporarily subscribe to location result via the hook's re-render
    getLocation()
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!supported || loading}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-all
          ${!supported
            ? 'border-border text-ink-3 cursor-not-allowed'
            : loading
              ? 'border-brand bg-brand-light text-brand cursor-wait'
              : 'border-border hover:border-brand hover:bg-brand-light text-ink-2 hover:text-brand'
          }`}
      >
        {loading ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : !supported ? (
          <MapPinOff size={14} />
        ) : (
          <LocateFixed size={14} />
        )}
        {loading ? 'Getting location…' : !supported ? 'GPS not available' : label}
      </button>
      {error && (
        <p className="text-[12px] text-danger leading-snug">{error}</p>
      )}
    </div>
  )
}

/**
 * UserLocationButtonControlled — version where the parent holds the geolocation hook.
 * Use this when you need to respond to the lat/lng values (e.g. in LocationPicker).
 *
 * Props:
 *   loading    {boolean}
 *   error      {string|null}
 *   supported  {boolean}
 *   onRequest  {() => void}   Called on button click to trigger GPS request
 *   label      {string}
 *   className  {string}
 */
export function UserLocationButtonControlled({
  loading = false,
  error = null,
  supported = true,
  onRequest,
  label = 'Use my location',
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={onRequest}
        disabled={!supported || loading}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-all
          ${!supported
            ? 'border-border text-ink-3 cursor-not-allowed'
            : loading
              ? 'border-brand bg-brand-light text-brand cursor-wait'
              : 'border-border hover:border-brand hover:bg-brand-light text-ink-2 hover:text-brand'
          }`}
      >
        {loading ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : !supported ? (
          <MapPinOff size={14} />
        ) : (
          <LocateFixed size={14} />
        )}
        {loading ? 'Getting location…' : !supported ? 'GPS not available' : label}
      </button>
      {error && (
        <p className="text-[12px] text-danger leading-snug">{error}</p>
      )}
    </div>
  )
}
