/**
 * useSubscriptions.js — React Query hooks for the subscriptions module.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/subscriptionsService.js'

// ── Query keys ────────────────────────────────────────────────────────────────
const KEYS = {
  plans:         ['subscriptions', 'plans'],
  mine:          ['subscriptions', 'my'],
  history:       (page) => ['subscriptions', 'history', page],
  paymentStatus: (txRef) => ['subscriptions', 'payment-status', txRef],
}

/** All active plans — stale for 1 hour (plans rarely change) */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: KEYS.plans,
    queryFn:  api.getPlans,
    staleTime: 60 * 60 * 1000,
  })
}

/** Authenticated user's current subscription with usage */
export function useMySubscription() {
  return useQuery({
    queryKey: KEYS.mine,
    queryFn:  api.getMySubscription,
    enabled:  !!localStorage.getItem('accessToken'),
  })
}

/** Paginated payment history */
export function usePaymentHistory(page = 1) {
  return useQuery({
    queryKey: KEYS.history(page),
    queryFn:  () => api.getPaymentHistory({ page }),
    enabled:  !!localStorage.getItem('accessToken'),
  })
}

/**
 * Poll payment status after returning from Chapa.
 * Polls every 3 seconds while status is 'pending'.
 * Stops automatically when status resolves to success or failed.
 */
export function usePaymentStatus(txRef) {
  return useQuery({
    queryKey: KEYS.paymentStatus(txRef),
    queryFn:  () => api.getPaymentStatus(txRef),
    enabled:  !!txRef && !!localStorage.getItem('accessToken'),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' ? 3000 : false
    },
  })
}

/**
 * Initiate a Chapa checkout.
 * On success, redirects the browser to Chapa's hosted payment page.
 * Invalidates the subscription cache so /my reflects any plan change.
 */
export function useCreateCheckoutSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ planId }) => api.createCheckout({ plan_id: planId }),
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.mine })
    },
  })
}

/**
 * Cancel an abandoned checkout — marks the PENDING payment record as FAILED.
 * Called from the PaymentCallbackPage when the user clicks "Cancel".
 */
export function useCancelCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (txRef) => api.cancelCheckout(txRef),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.mine })
    },
  })
}
