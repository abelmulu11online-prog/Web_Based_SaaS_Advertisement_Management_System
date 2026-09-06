# Phase 8 — Admin Dashboard & Platform Management

## Purpose

Phase 8 implements a complete, production-ready Admin Dashboard for the GebetaMarket SaaS Advertisement Management System. It provides platform administrators with real-time visibility into users, advertisements, categories, subscriptions, revenue, and platform analytics — all backed directly by PostgreSQL with no mock or fabricated data.

---

## Admin Roles & Permissions

### Role model

The system uses two roles stored in the `users.role` column:

| Role    | Description                         |
|---------|-------------------------------------|
| `USER`  | Standard advertiser account         |
| `ADMIN` | Platform administrator (full access)|

Role values are stored and checked as uppercase strings (`'ADMIN'`, `'USER'`).

### Backend enforcement

Every admin API route is protected by two Express middleware functions applied in order:

```
authenticate      → verifies JWT, populates req.user
requireRole('ADMIN') → checks req.user.role === 'ADMIN', returns 403 if not
```

Both middleware must pass before any controller logic runs. There is no path to reach admin functionality without a valid ADMIN-role JWT.

Attempting access without a token returns `401 AUTHENTICATION_REQUIRED`.  
Attempting access with a USER-role token returns `403 FORBIDDEN`.

### Frontend enforcement

`AdminGuard` (`src/components/common/AdminGuard.jsx`) wraps every `/admin/*` route in `AppRoutes.jsx`. It:

1. Redirects to `/login` if no `accessToken` is in `localStorage`
2. Parses the JWT payload client-side
3. Redirects to `/dashboard` if `payload.role !== 'ADMIN'`
4. Redirects to `/login` if the token is expired

This is a UX convenience — the backend independently enforces the same checks. A USER cannot reach any admin UI or data by modifying the frontend.

### Privilege escalation prevention

The `requireRole` middleware reads the role **only from `req.user`** (the verified JWT payload). Any `role` field in `req.body` or `req.query` is ignored entirely. Sending `{ "role": "ADMIN" }` in a request body has zero effect on authorization.

---

## Dashboard Metrics

All metrics query PostgreSQL directly via the `/api/admin/stats` endpoint. No values are hardcoded or estimated.

### Users section
| Metric           | Source                                           |
|------------------|--------------------------------------------------|
| Total users      | `COUNT(*) FROM users WHERE status != 'DELETED'` |
| Active users     | `COUNT(*) WHERE status = 'ACTIVE'`              |
| Suspended users  | `COUNT(*) WHERE status = 'SUSPENDED'`           |
| New users (7d)   | `COUNT(*) WHERE created_at > now() - 7 days`   |
| New users (30d)  | `COUNT(*) WHERE created_at > now() - 30 days`  |

### Advertisements section
| Metric           | Source                                          |
|------------------|-------------------------------------------------|
| Total ads        | `COUNT(*) FROM advertisements`                  |
| Published        | `WHERE status = 'PUBLISHED'`                   |
| Draft            | `WHERE status = 'DRAFT'`                       |
| Paused           | `WHERE status = 'PAUSED'`                      |
| Expired          | `WHERE status = 'EXPIRED'`                     |
| Archived         | `WHERE status = 'ARCHIVED'`                    |
| New ads (7d)     | `WHERE created_at > now() - 7 days`            |

### Subscriptions & Revenue section
| Metric              | Source                                                          |
|---------------------|-----------------------------------------------------------------|
| Active subs         | `COUNT(*) FROM user_subscriptions WHERE status = 'ACTIVE'`    |
| Expired subs        | `WHERE status = 'EXPIRED'`                                     |
| Total revenue (ETB) | `SUM(amount_etb) FROM payment_records WHERE status = 'SUCCESS'`|
| Revenue (30d)       | Same filter + `created_at >= date_trunc('month', now())`       |
| Total payments      | `COUNT(*) WHERE status = 'SUCCESS'`                            |
| Pending payments    | `COUNT(*) WHERE status = 'PENDING'`                            |
| Failed payments     | `COUNT(*) WHERE status = 'FAILED'`                             |

### Categories section
| Metric           | Source                                      |
|------------------|---------------------------------------------|
| Active categories| `COUNT(*) FROM categories WHERE is_active`  |
| Total categories | `COUNT(*) FROM categories`                  |

---

## User Management

**Endpoint:** `GET /api/admin/users`  
**Page:** `/admin/users`

Features:
- Server-side pagination (default 20/page, max 100)
- Search by email or phone (ILIKE, case-insensitive)
- Filter by status (`ACTIVE`, `SUSPENDED`)
- Filter by role (`USER`, `ADMIN`)
- Displays ad count, published ad count, subscription plan

### User actions

| Action   | Endpoint                              | Business rule                          |
|----------|---------------------------------------|----------------------------------------|
| Suspend  | `PATCH /api/admin/users/:id/suspend`  | Cannot suspend yourself; already-suspended check |
| Activate | `PATCH /api/admin/users/:id/activate` | Sets status to `ACTIVE`                |
| Promote  | `PATCH /api/admin/users/:id/promote`  | Cannot change your own role            |
| Demote   | `PATCH /api/admin/users/:id/demote`   | Cannot change your own role            |

All actions are logged via `pino` with `{ adminId, targetUserId, action }`.

### Security: sensitive data never exposed

The user list and detail endpoints return only:
- `id`, `email`, `phone`, `role`, `status`
- `email_verified_at`, `created_at`, `updated_at`
- `subscription_status`, `plan_name`, `current_period_end`

Never returned: `password_hash`, JWT tokens, secret keys.

---

## Advertisement Management

**Endpoint:** `GET /api/admin/ads`  
**Page:** `/admin/ads`

Features:
- Server-side pagination
- Search by title or advertiser email
- Filter by status (all 5 statuses)
- Filter by category
- Displays image count, location (address), price, advertiser

### Advertisement actions

| Action        | Endpoint                             | Valid transitions                    |
|---------------|--------------------------------------|--------------------------------------|
| Set status    | `PATCH /api/admin/ads/:id/status`    | Any → `DRAFT/PUBLISHED/PAUSED/ARCHIVED` |
| Delete        | `DELETE /api/admin/ads/:id`          | Removes DB row + Supabase Storage images |

Status transitions in the UI follow the existing lifecycle:
- `PUBLISHED` → PAUSED or ARCHIVED
- `DRAFT` → PUBLISHED or ARCHIVED
- `PAUSED` → PUBLISHED or ARCHIVED
- `EXPIRED` → ARCHIVED
- `ARCHIVED` → PUBLISHED

Delete requires confirmation modal. Image cleanup (Supabase Storage) happens before DB deletion.

---

## Category Management

**Endpoint:** `GET /api/admin/categories`  
**Page:** `/admin/categories`

This is the **single source of truth** for categories. The public Create Advertisement page uses `GET /api/categories` which queries the same `categories` table. Admins managing categories here immediately affect what advertisers see.

Features:
- Hierarchical tree view (parent → children)
- Create category with auto-generated slug from name
- Edit category name, slug, description, icon, parent
- Toggle `is_active` (hides category from public listings)
- Duplicate slug prevention (server-side check)
- Duplicate name prevention within same parent level

### Category API

| Method | Endpoint                               | Action              |
|--------|----------------------------------------|---------------------|
| GET    | `/api/admin/categories`               | All categories (incl. inactive) |
| POST   | `/api/admin/categories`               | Create              |
| PATCH  | `/api/admin/categories/:catId`        | Update fields       |
| PATCH  | `/api/admin/categories/:catId/toggle` | Toggle `is_active`  |

---

## Subscription Management

**Endpoint:** `GET /api/admin/subscriptions`  
**Page:** `/admin/subscriptions`

Proxies to `subscriptions.repository.findAllSubscriptions()` — same underlying function as the legacy `/api/subscriptions/admin/list` endpoint, now also accessible via the unified admin module.

Features:
- Paginated list of all user subscriptions
- Search by email or phone
- Filter by status (`ACTIVE`, `EXPIRED`)
- Shows plan name, price, period start/end, days remaining

---

## Revenue

**Endpoint:** `GET /api/admin/revenue`, `GET /api/admin/payments`  
**Page:** `/admin/revenue`

Revenue figures come exclusively from `payment_records` table rows where `status = 'SUCCESS'`. No estimations.

### Summary metrics
- Total revenue (all time)
- Current calendar month revenue (`date_trunc('month', now())`)
- Previous calendar month revenue
- Payments this month
- Successful / pending / failed payment counts

### Revenue by plan
Aggregated from `payment_records JOIN subscription_plans` — shows actual paid revenue per plan tier.

### Payment records table
Paginated, filterable by payment status. Shows: user email, plan, amount (ETB), status, payment method, Chapa tx_ref, date.

---

## Analytics

**Endpoint:** `GET /api/admin/analytics`  
**Page:** `/admin/analytics`

All charts use CSS/SVG — no external chart library dependency. Data covers the last 30 days from query time.

| Chart                    | Query                                                        |
|--------------------------|--------------------------------------------------------------|
| New users per day        | `GROUP BY date_trunc('day', created_at)` on `users`         |
| New ads per day          | `GROUP BY date_trunc('day', created_at)` on `advertisements`|
| Revenue per day          | `SUM(amount_etb)` grouped by day on `payment_records`       |
| Ads by status            | `GROUP BY status` snapshot on `advertisements`              |
| Ads by category (top 10) | `COUNT` joined to `categories`, ordered by count            |
| Users by plan            | `COUNT` joined from `user_subscriptions → subscription_plans`|

---

## API Endpoints

All endpoints require `Authorization: Bearer <ADMIN_JWT>`.  
Base: `/api/admin`

### Stats & Analytics
```
GET  /api/admin/stats          — platform-wide statistics snapshot
GET  /api/admin/analytics      — 30-day time-series data
GET  /api/admin/revenue        — revenue summary + by-plan breakdown
```

### Users
```
GET    /api/admin/users                      — paginated user list
GET    /api/admin/users/:userId              — user detail + subscription
GET    /api/admin/users/:userId/ads          — user's advertisements
PATCH  /api/admin/users/:userId/suspend      — suspend account
PATCH  /api/admin/users/:userId/activate     — activate account
PATCH  /api/admin/users/:userId/promote      — set role = ADMIN
PATCH  /api/admin/users/:userId/demote       — set role = USER
```

### Advertisements
```
GET    /api/admin/ads                        — paginated ad list (all statuses)
GET    /api/admin/ads/:adId                  — full ad detail + images
PATCH  /api/admin/ads/:adId/status           — force status change
DELETE /api/admin/ads/:adId                  — hard delete + storage cleanup
```

### Categories
```
GET    /api/admin/categories                 — all categories (incl. inactive)
POST   /api/admin/categories                 — create category
PATCH  /api/admin/categories/:catId          — update category fields
PATCH  /api/admin/categories/:catId/toggle   — toggle is_active
```

### Subscriptions & Payments
```
GET    /api/admin/subscriptions              — paginated subscriptions
GET    /api/admin/payments                   — paginated payment records
```

### Query parameters (list endpoints)
```
page        — page number (default: 1)
page_size   — results per page (max: 100, default: 20)
search      — text search (ILIKE against email/phone/title)
status      — filter by status value
role        — filter by user role (users endpoint)
category_id — filter by category UUID (ads endpoint)
```

### Pagination response shape
```json
{
  "page": 1,
  "page_size": 20,
  "total": 142,
  "total_pages": 8,
  "has_next": true,
  "has_prev": false
}
```

---

## Database Tables Used

| Table                  | Phase 8 operations                               |
|------------------------|--------------------------------------------------|
| `users`                | Read, status update, role update                |
| `advertisements`       | Read, status update, delete                     |
| `advertisement_images` | Read (image count, storage key for cleanup)     |
| `categories`           | Read, insert, update                            |
| `user_subscriptions`   | Read                                            |
| `payment_records`      | Read, aggregate (revenue sums)                  |
| `subscription_plans`   | Read (joined to subscriptions and payments)     |

No new migrations were created for Phase 8. All required columns exist in the schema established by migrations 001–032.

---

## Security

### Authentication
- JWT verified by `authenticate` middleware on every request
- Token payload: `{ id, role, status, iat, exp }`
- Expired tokens return `401 TOKEN_EXPIRED`
- Malformed tokens return `401 INVALID_TOKEN`

### Authorization
- `requireRole('ADMIN')` applied to every admin route
- Role read from JWT payload only — never from request body
- USER attempting admin access gets `403 FORBIDDEN`
- Admin cannot suspend/promote themselves (409 business rule)

### Input validation
- All route inputs validated by Zod schemas before reaching controllers
- UUID parameters validated (`z.string().uuid()`)
- Enum values validated (`z.enum(['DRAFT', 'PUBLISHED', ...]`)
- Pagination bounds enforced (`max 100`)
- Category slug validated (`/^[a-z0-9-]+$/`)
- Body injection fields (role, status, amount, user_id) never read from client

### SQL
- All queries use parameterised placeholders (`$1`, `$2`, ...)
- No string interpolation in SQL
- Dynamic SET clauses (category update) built from an allow-list of column names

### Sensitive data
- `password_hash` never selected or returned
- JWT tokens never logged or returned
- Authorization header redacted in pino HTTP logs

---

## Tests

### Test files
- `backend/tests/security.test.js` — pre-existing, 20 tests (auth/JWT/role middleware)
- `backend/tests/admin.test.js` — **new Phase 8**, 27 tests

### admin.test.js coverage

| Suite                                     | Tests | Result |
|-------------------------------------------|-------|--------|
| Admin authentication guard                | 8     | ✔ pass |
| Admin authorization — USER role denied    | 8     | ✔ pass |
| Privilege escalation prevention           | 3     | ✔ pass |
| Admin input validation                    | 3     | ✔ pass |
| Admin role accepted (reaches controller)  | 3     | ✔ pass |
| Subscription admin endpoints — role fix   | 2     | ✔ pass |
| **Total**                                 | **27**| **✔ 27/27** |

### Frontend build
```
npm run build (Vite)
✓ built in 1.36s
0 errors
2036 modules transformed
```

---

## Files Created

### Backend
```
backend/src/modules/admin/admin.routes.js      — expanded (7 route groups)
backend/src/modules/admin/admin.controller.js  — expanded (all new handlers)
backend/src/modules/admin/admin.repository.js  — expanded (analytics, revenue, categories, ad detail, user ads)
backend/src/modules/admin/admin.service.js     — expanded (all business logic)
backend/tests/admin.test.js                    — new Phase 8 test file
```

### Frontend
```
frontend/src/components/common/AdminGuard.jsx                  — new
frontend/src/components/layout/AdminLayout.jsx                 — updated (7 nav items)
frontend/src/features/admin/components/AdminTable.jsx          — new (reusable components)
frontend/src/features/admin/hooks/useAdmin.js                  — expanded
frontend/src/services/admin.service.js                         — expanded
frontend/src/routes/AppRoutes.jsx                              — updated (admin sub-routes + AdminGuard)
frontend/src/pages/admin/AdminOverviewPage.jsx                 — replaced (real data)
frontend/src/pages/admin/AdminUsersPage.jsx                    — new
frontend/src/pages/admin/AdminAdsPage.jsx                      — new
frontend/src/pages/admin/AdminCategoriesPage.jsx               — new
frontend/src/pages/admin/AdminSubscriptionsPage.jsx            — new
frontend/src/pages/admin/AdminRevenuePage.jsx                  — new
frontend/src/pages/admin/AdminAnalyticsPage.jsx                — new
```

---

## Files Modified (bug fixes)

```
backend/src/modules/subscriptions/subscriptions.routes.js
  — Fixed: requireRole('admin') → requireRole('ADMIN')
  — Impact: subscription admin endpoints were silently accessible to all roles

backend/src/modules/subscriptions/subscriptions.repository.js
  — Fixed: u.username → u.email, u.phone in findAllSubscriptions and findAllPayments
  — Impact: queries would fail with SQL error (column does not exist) — users table has no username column
```

---

## Files Removed

No files were removed. No demo/mock admin code was found in the existing codebase. The pre-existing `AdminOverviewPage.jsx` was **replaced in-place** with the real-data implementation.

---

## Verification Status

### Implemented and verified

- ✅ Admin authentication: `401` without token — **tested (8 tests)**
- ✅ Admin authorization: `403` for USER role — **tested (8 tests)**
- ✅ Privilege escalation blocked: body `role` field ignored — **tested (3 tests)**
- ✅ Input validation: Zod schemas reject bad input — **tested (3 tests)**
- ✅ ADMIN token reaches controllers — **tested (3 tests)**
- ✅ Subscription role bug fixed and verified — **tested (2 tests)**
- ✅ Frontend build: 0 errors, 2036 modules — **verified**
- ✅ Admin stats endpoint returns real DB data — **confirmed (200 + real data in test run)**
- ✅ Admin users endpoint returns real DB data — **confirmed (200 + real data in test run)**
- ✅ Admin categories endpoint returns real DB data — **confirmed (200 + real data in test run)**
- ✅ Subscription overview endpoint works correctly — **confirmed (200 in test run)**

### Implemented but not verified end-to-end (requires browser + full DB session)

- ⚠ Admin dashboard UI rendering with live data
- ⚠ User suspend/activate action flow in browser
- ⚠ Advertisement status change in browser
- ⚠ Category create/edit/toggle in browser
- ⚠ Revenue page rendering with payment records
- ⚠ Analytics sparklines with 30-day data

These require a running backend + database + browser session. The API layer is confirmed working; the frontend components are correct React code that passed the Vite build.

---

## Known Limitations

1. **No audit log table**: Admin actions (suspend, status change, category edit) are logged via `pino` (structured JSON logs) but not stored in a separate `audit_log` database table. If a dedicated audit table is needed, a migration + repository changes would be required in a future phase.

2. **No real-time updates**: Admin tables use React Query with `staleTime` of 30–60 seconds. Live changes by other admins are not pushed — page must be refreshed or query invalidated.

3. **Analytics date range fixed at 30 days**: The analytics endpoint always returns the last 30 days. A configurable date range would require additional query parameters and frontend date pickers.

4. **No advertisement image preview in admin table**: The ads table shows image count only. A full image preview would require an additional detail page or modal (the `GET /api/admin/ads/:adId` endpoint already provides image URLs if needed in a future enhancement).

5. **Full integration test suite requires live DB**: The `npm run test:run` command that runs all test files times out without a PostgreSQL connection. Only `admin.test.js` and `security.test.js` were verified to pass (they use a live DB for the ADMIN-token "reaches controller" tests, which confirmed real data is returned).
