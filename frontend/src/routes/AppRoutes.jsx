import { Routes, Route } from 'react-router-dom'
import HomePage from '../pages/HomePage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import AdsListPage from '../pages/AdsListPage.jsx'
import AdDetailPage from '../pages/AdDetailPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import CreateAdPage from '../pages/CreateAdPage.jsx'
import EditAdPage from '../pages/EditAdPage.jsx'

/**
 * AppRoutes — central route registry.
 *
 * Phase 5 adds:
 *   /ads                                — public advertisement list
 *   /ads/:id                            — public advertisement detail
 *   /dashboard                          — advertiser dashboard
 *   /dashboard/advertisements/new       — create advertisement
 *   /dashboard/advertisements/:id/edit  — edit advertisement
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/ads" element={<AdsListPage />} />
      <Route path="/ads/:id" element={<AdDetailPage />} />

      {/* Advertiser dashboard */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/advertisements/new" element={<CreateAdPage />} />
      <Route path="/dashboard/advertisements/:id/edit" element={<EditAdPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
