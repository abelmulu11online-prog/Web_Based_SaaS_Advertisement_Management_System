/**
 * useAdmin.js — React Query hooks for the admin panel.
 * All queries require an ADMIN JWT token (enforced on the backend).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../../../services/admin.service.js'

// ── Query key factory ────────────────────────────────────────────────────────
const K = {
  stats:      ['admin', 'stats'],
  analytics:  ['admin', 'analytics'],
  revenue:    ['admin', 'revenue'],
  users:      (p) => ['admin', 'users', p],
  user:       (id) => ['admin', 'user', id],
  userAds:    (id, p) => ['admin', 'user-ads', id, p],
  ads:        (p) => ['admin', 'ads', p],
  ad:         (id) => ['admin', 'ad', id],
  categories: ['admin', 'categories'],
  subs:       (p) => ['admin', 'subs', p],
  payments:   (p) => ['admin', 'payments', p],
  subOverview: ['admin', 'sub-overview'],
}

// ── Stats & Analytics ────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: K.stats,
    queryFn: api.getStats,
    staleTime: 60_000,
  })
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: K.analytics,
    queryFn: api.getAnalytics,
    staleTime: 60_000,
  })
}

export function useAdminRevenue() {
  return useQuery({
    queryKey: K.revenue,
    queryFn: api.getRevenue,
    staleTime: 60_000,
  })
}

// ── Users ────────────────────────────────────────────────────────────────────

export function useAdminUsers(params = {}) {
  return useQuery({
    queryKey: K.users(params),
    queryFn: () => api.getUsers(params),
  })
}

export function useAdminUserDetail(userId) {
  return useQuery({
    queryKey: K.user(userId),
    queryFn: () => api.getUserDetail(userId),
    enabled: !!userId,
  })
}

export function useAdminUserAds(userId, params = {}) {
  return useQuery({
    queryKey: K.userAds(userId, params),
    queryFn: () => api.getUserAds(userId, params),
    enabled: !!userId,
  })
}

// ── Advertisements ────────────────────────────────────────────────────────────

export function useAdminAds(params = {}) {
  return useQuery({
    queryKey: K.ads(params),
    queryFn: () => api.getAds(params),
  })
}

export function useAdminAdDetail(adId) {
  return useQuery({
    queryKey: K.ad(adId),
    queryFn: () => api.getAdDetail(adId),
    enabled: !!adId,
  })
}

// ── Categories ────────────────────────────────────────────────────────────────

export function useAdminCategories() {
  return useQuery({
    queryKey: K.categories,
    queryFn: api.getCategories,
    staleTime: 30_000,
  })
}

// ── Subscriptions & Payments ──────────────────────────────────────────────────

export function useAdminSubOverview() {
  return useQuery({
    queryKey: K.subOverview,
    queryFn: api.getSubscriptionOverview,
    staleTime: 60_000,
  })
}

export function useAdminSubscriptions(params = {}) {
  return useQuery({
    queryKey: K.subs(params),
    queryFn: () => api.getSubscriptions(params),
  })
}

export function useAdminPayments(params = {}) {
  return useQuery({
    queryKey: K.payments(params),
    queryFn: () => api.getPayments(params),
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useSuspendUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.suspendUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useActivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.activateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function usePromoteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.promoteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDemoteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.demoteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useSetAdStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ adId, status }) => api.setAdStatus(adId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ads'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useAdminDeleteAd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deleteAd(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ads'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.createCategory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.categories }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ catId, data }) => api.updateCategory(catId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.categories }),
  })
}

export function useToggleCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (catId) => api.toggleCategory(catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.categories }),
  })
}

// ── Aliases for backward compatibility ───────────────────────────────────────
export { useAdminPayments      as useAdminPaymentList }
export { useAdminSubscriptions as useAdminSubList }
