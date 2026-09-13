/**
 * useGeolocation.js — React hook for one-shot browser GPS location.
 *
 * Design principles:
 *  - NEVER continuously tracks the user (no watchPosition).
 *  - NEVER stores the user's coordinates in the database.
 *  - Only requests permission when the user explicitly triggers it.
 *  - Gracefully handles permission denied, unavailable, and timeout errors.
 */
import { useState, useCallback } from 'react'

/**
 * @typedef {object} GeolocationState
 * @property {number|null}  lat        - Latitude (null until obtained)
 * @property {number|null}  lng        - Longitude (null until obtained)
 * @property {number|null}  accuracy   - Accuracy in metres
 * @property {boolean}      loading    - True while a request is in-flight
 * @property {string|null}  error      - Human-readable error message or null
 * @property {boolean}      supported  - False if the browser lacks Geolocation API
 */

/**
 * One-shot geolocation hook.
 * Call `getLocation()` to trigger the browser permission prompt and fetch coords.
 *
 * @returns {{ lat, lng, accuracy, loading, error, supported, getLocation, clear }}
 */
export function useGeolocation() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  const [state, setState] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    loading: false,
    error: null,
  })

  /** Request the user's current position (one-shot). */
  const getLocation = useCallback(() => {
    if (!supported) {
      setState((s) => ({
        ...s,
        error: 'Your browser does not support geolocation.',
      }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        })
      },
      (err) => {
        let message
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location permission was denied. Please allow it in your browser settings and try again.'
            break
          case err.POSITION_UNAVAILABLE:
            message = 'Your location is currently unavailable. Please try again or enter it manually.'
            break
          case err.TIMEOUT:
            message = 'Location request timed out. Please try again or enter your location manually.'
            break
          default:
            message = 'Unable to retrieve your location. Please enter it manually.'
        }
        setState((s) => ({ ...s, loading: false, error: message }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Accept a cached position up to 60 s old
      },
    )
  }, [supported])

  /** Clear the stored location and any error. */
  const clear = useCallback(() => {
    setState({ lat: null, lng: null, accuracy: null, loading: false, error: null })
  }, [])

  return { ...state, supported, getLocation, clear }
}
