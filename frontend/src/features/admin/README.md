# features/admin/

Admin dashboard for platform management — user moderation, ad approvals, subscription oversight.

Access is restricted to users with the `admin` role (enforced via ProtectedRoute in Phase 4).

## Planned structure (Phase 8)

```
admin/
├── components/       # UserTable, AdModerationQueue, StatsPanel
├── hooks/            # useAdminUsers.js, useAdminAds.js
├── services/         # adminService.js  (API calls)
└── pages/            # AdminDashboardPage.jsx, AdminUsersPage.jsx
```
