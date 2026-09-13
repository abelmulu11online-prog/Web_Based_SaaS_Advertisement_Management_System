import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { AdminGuard } from '../components/common/AdminGuard.jsx'

import HomePage    from '../pages/HomePage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import LoginPage   from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'

// Auth — email verification & password reset
const VerifyEmailPage    = lazy(() => import('../pages/VerifyEmailPage.jsx'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage.jsx'))
const ResetPasswordPage  = lazy(() => import('../pages/ResetPasswordPage.jsx'))

// Directory
const DirectoryPage         = lazy(() => import('../pages/DirectoryPage.jsx'))
const DirectoryMapPage      = lazy(() => import('../pages/AdsMapPage.jsx'))  // repurposed

// Profile
const PublicProfilePage     = lazy(() => import('../pages/PublicProfilePage.jsx'))

// Dashboard
const DashboardPage         = lazy(() => import('../pages/DashboardPage.jsx'))
const ProfileEditPage       = lazy(() => import('../pages/dashboard/ProfileEditPage.jsx'))
const ServicesPage          = lazy(() => import('../pages/dashboard/ServicesPage.jsx'))
const PortfolioPage         = lazy(() => import('../pages/dashboard/PortfolioPage.jsx'))
const PostsPage             = lazy(() => import('../pages/dashboard/PostsPage.jsx'))
const AchievementsPage      = lazy(() => import('../pages/dashboard/AchievementsPage.jsx'))
const SocialLinksPage       = lazy(() => import('../pages/dashboard/SocialLinksPage.jsx'))
const BusinessHoursPage     = lazy(() => import('../pages/dashboard/BusinessHoursPage.jsx'))

// Company / static pages
const AboutPage          = lazy(() => import('../pages/AboutPage.jsx'))
const ContactPage        = lazy(() => import('../pages/ContactPage.jsx'))
const PrivacyPolicyPage  = lazy(() => import('../pages/PrivacyPolicyPage.jsx'))
const TermsOfServicePage = lazy(() => import('../pages/TermsOfServicePage.jsx'))

// Subscriptions
const PricingPage             = lazy(() => import('../pages/PricingPage.jsx'))
const SubscriptionPage        = lazy(() => import('../pages/SubscriptionPage.jsx'))
const PaymentCallbackPage     = lazy(() => import('../pages/PaymentCallbackPage.jsx'))
const SubscriptionSuccessPage = lazy(() => import('../pages/SubscriptionSuccessPage.jsx'))

// Admin
const AdminOverviewPage      = lazy(() => import('../pages/admin/AdminOverviewPage.jsx'))
const AdminUsersPage         = lazy(() => import('../pages/admin/AdminUsersPage.jsx'))
const AdminAdsPage           = lazy(() => import('../pages/admin/AdminAdsPage.jsx'))
const AdminCategoriesPage    = lazy(() => import('../pages/admin/AdminCategoriesPage.jsx'))
const AdminSubscriptionsPage = lazy(() => import('../pages/admin/AdminSubscriptionsPage.jsx'))
const AdminRevenuePage       = lazy(() => import('../pages/admin/AdminRevenuePage.jsx'))
const AdminAnalyticsPage     = lazy(() => import('../pages/admin/AdminAnalyticsPage.jsx'))
const AdminPlansPage         = lazy(() => import('../pages/admin/AdminPlansPage.jsx'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-3">
        <Skeleton className="h-8 rounded" />
        <Skeleton className="h-4 rounded w-3/4" />
        <Skeleton className="h-4 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ──────────────────────────────────────────────────── */}
        <Route path="/"              element={<HomePage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/pricing"       element={<PricingPage />} />

        {/* Company / static */}
        <Route path="/about"          element={<AboutPage />} />
        <Route path="/contact"        element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms"          element={<TermsOfServicePage />} />

        {/* Email verification & password reset */}
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Directory */}
        <Route path="/directory"     element={<DirectoryPage />} />
        <Route path="/directory/map" element={<DirectoryMapPage />} />

        {/* Public profile — @slug pattern (both formats) */}
        <Route path="/@:slug"        element={<PublicProfilePage />} />
        <Route path="/p/:slug"       element={<PublicProfilePage />} />
        <Route path="/profile/:slug" element={<PublicProfilePage />} />

        {/* Post-payment */}
        <Route path="/subscription/callback" element={<PaymentCallbackPage />} />
        <Route path="/subscription/success"  element={<SubscriptionSuccessPage />} />

        {/* ── Dashboard ────────────────────────────────────────────────── */}
        <Route path="/dashboard"                       element={<DashboardPage />} />
        <Route path="/dashboard/subscription"          element={<SubscriptionPage />} />
        <Route path="/dashboard/profile"               element={<ProfileEditPage />} />
        <Route path="/dashboard/profile/services"      element={<ServicesPage />} />
        <Route path="/dashboard/profile/portfolio"     element={<PortfolioPage />} />
        <Route path="/dashboard/profile/posts"         element={<PostsPage />} />
        <Route path="/dashboard/profile/achievements"  element={<AchievementsPage />} />
        <Route path="/dashboard/profile/social-links"  element={<SocialLinksPage />} />
        <Route path="/dashboard/profile/hours"         element={<BusinessHoursPage />} />

        {/* ── Admin ────────────────────────────────────────────────────── */}
        <Route path="/admin"               element={<AdminGuard><AdminOverviewPage /></AdminGuard>} />
        <Route path="/admin/users"         element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
        <Route path="/admin/ads"           element={<AdminGuard><AdminAdsPage /></AdminGuard>} />
        <Route path="/admin/categories"    element={<AdminGuard><AdminCategoriesPage /></AdminGuard>} />
        <Route path="/admin/subscriptions" element={<AdminGuard><AdminSubscriptionsPage /></AdminGuard>} />
        <Route path="/admin/revenue"       element={<AdminGuard><AdminRevenuePage /></AdminGuard>} />
        <Route path="/admin/analytics"     element={<AdminGuard><AdminAnalyticsPage /></AdminGuard>} />
        <Route path="/admin/plans"         element={<AdminGuard><AdminPlansPage /></AdminGuard>} />

        {/* ── 404 ────────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
