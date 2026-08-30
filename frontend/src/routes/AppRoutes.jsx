import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Skeleton } from '../components/ui/Skeleton.jsx'

// Eagerly loaded pages (critical path)
import HomePage               from '../pages/HomePage.jsx'
import NotFoundPage            from '../pages/NotFoundPage.jsx'
import LoginPage               from '../pages/LoginPage.jsx'
import RegisterPage            from '../pages/RegisterPage.jsx'

// Lazy-loaded pages
const AdsListPage             = lazy(() => import('../pages/AdsListPage.jsx'))
const AdDetailPage            = lazy(() => import('../pages/AdDetailPage.jsx'))
const DashboardPage           = lazy(() => import('../pages/DashboardPage.jsx'))
const MyAdsPage               = lazy(() => import('../pages/MyAdsPage.jsx'))
const CreateAdPage            = lazy(() => import('../pages/CreateAdPage.jsx'))
const EditAdPage              = lazy(() => import('../pages/EditAdPage.jsx'))
const PricingPage             = lazy(() => import('../pages/PricingPage.jsx'))
const SubscriptionPage        = lazy(() => import('../pages/SubscriptionPage.jsx'))
const PaymentCallbackPage     = lazy(() => import('../pages/PaymentCallbackPage.jsx'))
const SubscriptionSuccessPage = lazy(() => import('../pages/SubscriptionSuccessPage.jsx'))
const PublicProfilePage       = lazy(() => import('../pages/PublicProfilePage.jsx'))

// Dashboard profile pages
const ProfileEditPage         = lazy(() => import('../pages/dashboard/ProfileEditPage.jsx'))
const ProductsPage            = lazy(() => import('../pages/dashboard/ProductsPage.jsx'))
const ServicesPage            = lazy(() => import('../pages/dashboard/ServicesPage.jsx'))
const PortfolioPage           = lazy(() => import('../pages/dashboard/PortfolioPage.jsx'))
const PostsPage               = lazy(() => import('../pages/dashboard/PostsPage.jsx'))
const AchievementsPage        = lazy(() => import('../pages/dashboard/AchievementsPage.jsx'))

// Admin pages
const AdminOverviewPage       = lazy(() => import('../pages/admin/AdminOverviewPage.jsx'))

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

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/"        element={<HomePage />} />
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/ads"     element={<AdsListPage />} />
        <Route path="/ads/:id" element={<AdDetailPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Public profile pages — @slug pattern */}
        <Route path="/@:slug" element={<PublicProfilePage />} />

        {/* Post-payment */}
        <Route path="/subscription/callback" element={<PaymentCallbackPage />} />
        <Route path="/subscription/success"  element={<SubscriptionSuccessPage />} />

        {/* Dashboard — main */}
        <Route path="/dashboard"                             element={<DashboardPage />} />
        <Route path="/dashboard/subscription"               element={<SubscriptionPage />} />
        <Route path="/dashboard/advertisements"             element={<MyAdsPage />} />
        <Route path="/dashboard/advertisements/new"         element={<CreateAdPage />} />
        <Route path="/dashboard/advertisements/:id/edit"    element={<EditAdPage />} />

        {/* Dashboard — profile management */}
        <Route path="/dashboard/profile"                    element={<ProfileEditPage />} />
        <Route path="/dashboard/profile/products"           element={<ProductsPage />} />
        <Route path="/dashboard/profile/services"           element={<ServicesPage />} />
        <Route path="/dashboard/profile/portfolio"          element={<PortfolioPage />} />
        <Route path="/dashboard/profile/posts"              element={<PostsPage />} />
        <Route path="/dashboard/profile/achievements"       element={<AchievementsPage />} />

        {/* Admin */}
        <Route path="/admin"                                element={<AdminOverviewPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
