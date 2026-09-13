/**
 * UserLocationButton.jsx — Button that requests the user's GPS location.
 * i18n: English / አማርኛ via react-i18next
 */
import { LocateFixed, LoaderCircle, MapPinOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGeolocation } from '../hooks/useGeolocation.js'

export function UserLocationButton({ onLocation, className = '', label }) {
  const { t } = useTranslation()
  const { loading, error, supported, getLocation } = useGeolocation()
  const defaultLabel = label ?? t('directory.useMyLocation')

  function handleClick() {
    if (!supported) return
    getLocation()
  }

  function getButtonLabel() {
    if (loading)    return t('common.gettingLocation')
    if (!supported) return t('common.gpsNotAvailable')
    return defaultLabel
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
        {getButtonLabel()}
      </button>
      {error && (
        <p className="text-[12px] text-danger leading-snug">{error}</p>
      )}
    </div>
  )
}

/**
 * UserLocationButtonControlled — parent holds the geolocation hook.
 */
export function UserLocationButtonControlled({
  loading = false,
  error = null,
  supported = true,
  onRequest,
  label,
  className = '',
}) {
  const { t } = useTranslation()
  const defaultLabel = label ?? t('directory.useMyLocation')

  function getButtonLabel() {
    if (loading)    return t('common.gettingLocation')
    if (!supported) return t('common.gpsNotAvailable')
    return defaultLabel
  }

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
        {getButtonLabel()}
      </button>
      {error && (
        <p className="text-[12px] text-danger leading-snug">{error}</p>
      )}
    </div>
  )
}
