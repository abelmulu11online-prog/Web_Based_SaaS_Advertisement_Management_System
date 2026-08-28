import { Routes, Route } from 'react-router-dom'
import HomePage from '../pages/HomePage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import AdsListPage from '../pages/AdsListPage.jsx'
import AdDetailPage from '../pages/AdDetailPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import CreateAdPage from '../pages/CreateAdPage.jsx'
import EditAdPage from '../pages/EditAdPage.jsx'
import PricingPage from '../pages/PricingPage.jsx'
import SubscriptionPage from '../pages/SubscriptionPage.jsx'
import PaymentCallbackPage from '../pages/PaymentCallbackPage.jsx'
import SubscriptionSuccessPage from '../pages/SubscriptionSuccessPage.jsx'

/**
 * AppRoutes — central route registry.
 *
 * Phase 5 routes:
 *   /ads                                — public advertisement list
 *   /ads/:id                            — public advertisement detail
 *   /dashboard                          — advertiser dashboard
 *   /dashboard/advertisements/new       — create advertisement
 *   /dashboard/advertisements/:id/edit  — edit advertisement
 *
 * Phase 6 routes:
 *   /pricing                            — public plan comparison page
 *   /dashboard/subscription             — user's subscription & billing
 *   /subscription/callback              — post-payment polling page
 *   /subscription/success               — payment confirmed page
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"          element={<HomePage />} />
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/register"  element={<RegisterPage />} />
      <Route path="/ads"       element={<AdsListPage />} />
      <Route path="/ads/:id"   element={<AdDetailPage />} />
      <Route path="/pricing"   element={<PricingPage />} />

      {/* Post-payment flow */}
      <Route path="/subscription/callback" element={<PaymentCallbackPage />} />
      <Route path="/subscription/success"  element={<SubscriptionSuccessPage />} />

      {/* Advertiser dashboard */}
      <Route path="/dashboard"                              element={<DashboardPage />} />
      <Route path="/dashboard/subscription"                element={<SubscriptionPage />} />
      <Route path="/dashboard/advertisements/new"          element={<CreateAdPage />} />
      <Route path="/dashboard/advertisements/:id/edit"     element={<EditAdPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
