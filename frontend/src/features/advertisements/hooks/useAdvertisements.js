/**
 * useAdvertisements.js — React Query hooks for the advertisement feature.
 *
 * All mutations invalidate the relevant query caches after success.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adsService from '../../../services/advertisements.service.js'

// ── Query keys ────────────────────────────────────────────────────────────────

export const adsKeys = {
  all: ['advertisements'],
  published: (params) => ['advertisements', 'published', params],
  detail: (id) => ['advertisements', 'detail', id],
  mine: (params) => ['advertisements', 'mine', params],
  myDetail: (id) => ['advertisements', 'myDetail', id],
  categories: ['categories'],
}

// ── Public queries ────────────────────────────────────────────────────────────

/**
 * Fetch published advertisements with optional filtering.
 * @param {object} params - { search?, category_id?, min_price?, max_price?, page?, page_size? }
 */
export function useAdvertisements(params = {}) {
  return useQuery({
    queryKey: adsKeys.published(params),
    queryFn: () => adsService.getPublishedAdvertisements(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Fetch a single published advertisement.
 * @param {string} id
 */
export function useAdvertisement(id) {
  return useQuery({
    queryKey: adsKeys.detail(id),
    queryFn: () => adsService.getAdvertisement(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Fetch all active categories.
 */
export function useCategories() {
  return useQuery({
    queryKey: adsKeys.categories,
    queryFn: () => adsService.getCategories(),
    staleTime: 1000 * 60 * 30, // 30 minutes — categories don't change often
  })
}

// ── Advertiser queries ────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's advertisements.
 * @param {object} params - { status?, page?, page_size? }
 */
export function useMyAdvertisements(params = {}) {
  return useQuery({
    queryKey: adsKeys.mine(params),
    queryFn: () => adsService.getMyAdvertisements(params),
    staleTime: 1000 * 60 * 1, // 1 minute
  })
}

/**
 * Fetch one of the authenticated user's advertisements.
 * @param {string} id
 */
export function useMyAdvertisement(id) {
  return useQuery({
    queryKey: adsKeys.myDetail(id),
    queryFn: () => adsService.getMyAdvertisement(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 1,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a new advertisement.
 */
export function useCreateAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => adsService.createAdvertisement(data),
    onSuccess: () => {
      // Invalidate my-ads list so dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'mine'] })
    },
  })
}

/**
 * Update an advertisement.
 */
export function useUpdateAdvertisement(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => adsService.updateAdvertisement(id, data),
    onSuccess: (updatedAd) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'mine'] })
      queryClient.invalidateQueries({ queryKey: adsKeys.myDetail(id) })
      // If it's published, also invalidate the public detail
      if (updatedAd?.status === 'PUBLISHED') {
        queryClient.invalidateQueries({ queryKey: adsKeys.detail(id) })
      }
    },
  })
}

/**
 * Publish an advertisement.
 */
export function usePublishAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => adsService.publishAdvertisement(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'mine'] })
      queryClient.invalidateQueries({ queryKey: adsKeys.myDetail(id) })
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'published'] })
    },
  })
}

/**
 * Pause an advertisement.
 */
export function usePauseAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => adsService.pauseAdvertisement(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'mine'] })
      queryClient.invalidateQueries({ queryKey: adsKeys.myDetail(id) })
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'published'] })
    },
  })
}

/**
 * Archive an advertisement.
 */
export function useArchiveAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => adsService.archiveAdvertisement(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'mine'] })
      queryClient.invalidateQueries({ queryKey: adsKeys.myDetail(id) })
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'published'] })
    },
  })
}

/**
 * Delete an advertisement.
 */
export function useDeleteAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => adsService.deleteAdvertisement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['advertisements', 'published'] })
    },
  })
}

/**
 * Add an image to an advertisement.
 */
export function useAddAdvertisementImage(advertisementId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageData) => adsService.addAdvertisementImage(advertisementId, imageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adsKeys.myDetail(advertisementId) })
    },
  })
}

/**
 * Delete an advertisement image.
 */
export function useDeleteAdvertisementImage(advertisementId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId) => adsService.deleteAdvertisementImage(advertisementId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adsKeys.myDetail(advertisementId) })
    },
  })
}

/**
 * Set an image as primary.
 */
export function useSetPrimaryImage(advertisementId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId) => adsService.setPrimaryImage(advertisementId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adsKeys.myDetail(advertisementId) })
    },
  })
}
