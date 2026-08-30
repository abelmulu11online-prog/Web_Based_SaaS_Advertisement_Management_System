import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../../../services/admin.service.js'

const K = {
  stats:   ['admin', 'stats'],
  users:   (p) => ['admin', 'users', p],
  user:    (id) => ['admin', 'user', id],
  ads:     (p) => ['admin', 'ads', p],
  subOverview: ['admin', 'sub-overview'],
  subList: (p) => ['admin', 'sub-list', p],
  payments:(p) => ['admin', 'payments', p],
}

export function useAdminStats() {
  return useQuery({ queryKey: K.stats, queryFn: api.getStats, staleTime: 30000 })
}

export function useAdminUsers(params = {}) {
  return useQuery({ queryKey: K.users(params), queryFn: () => api.getUsers(params) })
}

export function useAdminUserDetail(userId) {
  return useQuery({ queryKey: K.user(userId), queryFn: () => api.getUserDetail(userId), enabled: !!userId })
}

export function useAdminAds(params = {}) {
  return useQuery({ queryKey: K.ads(params), queryFn: () => api.getAds(params) })
}

export function useAdminSubOverview() {
  return useQuery({ queryKey: K.subOverview, queryFn: api.getSubscriptionOverview, staleTime: 30000 })
}

export function useAdminSubList(params = {}) {
  return useQuery({ queryKey: K.subList(params), queryFn: () => api.getSubscriptionList(params) })
}

export function useAdminPayments(params = {}) {
  return useQuery({ queryKey: K.payments(params), queryFn: () => api.getPaymentList(params) })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useSuspendUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.suspendUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useActivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ads'] }),
  })
}

export function useAdminDeleteAd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deleteAd(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ads'] }),
  })
}
