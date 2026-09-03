/**
 * useMapPins.js — React Query hook for fetching advertisement map pins.
 */
import { useQuery } from '@tanstack/react-query'
import { getMapPins } from '../services/locationsService.js'

export const mapPinsKeys = {
  all: ['map-pins'],
}

/**
 * Fetch all published advertisements with coordinates for the map view.
 * Stale time is 5 minutes — map data does not need to be real-time.
 */
export function useMapPins() {
  return useQuery({
    queryKey: mapPinsKeys.all,
    queryFn: getMapPins,
    staleTime: 1000 * 60 * 5,
  })
}
