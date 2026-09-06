# Advertisement System — Phase 5 Implementation

> **Version:** 1.0.0
> **Phase:** 5 — Advertisement System
> **Status:** Implemented and tested (database verification pending `DATABASE_URL`)
> **Last updated:** August 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Models](#3-database-models)
4. [Advertisement Lifecycle](#4-advertisement-lifecycle)
5. [API Endpoints](#5-api-endpoints)
6. [Authorization Rules](#6-authorization-rules)
7. [Validation](#7-validation)
8. [Image Management](#8-image-management)
9. [Search and Filtering](#9-search-and-filtering)
10. [Pagination](#10-pagination)
11. [Categories API](#11-categories-api)
12. [Location Storage](#12-location-storage)
13. [Frontend Pages and Routes](#13-frontend-pages-and-routes)
14. [React Query Hooks](#14-react-query-hooks)
15. [Security](#15-security)
16. [Error Codes](#16-error-codes)
17. [Database Migrations](#17-database-migrations)
18. [Testing](#18-testing)
19. [File Reference](#19-file-reference)
20. [How to Run](#20-how-to-run)

---

## 1. Overview

Phase 5 implements the complete advertisement system — the core product feature of the platform. Advertisers create listings for products, services, skills, jobs, businesses, and anything else they want people to discover. Customers browse and search those listings, then contact the advertiser directly.

### Key Business Rules

- There is **no online buying or selling** inside the platform. The platform is a discovery and contact tool only.
- No payment processing between advertisers and customers.
- Advertisers own their listings and manage them from a personal dashboard.
- Only published advertisements are visible to the public.

### Capabilities

| Capability | Status |
|---|---|
| Create advertisement (saved as DRAFT) | ✅ Implemented |
| Edit advertisement | ✅ Implemented |
| Publish / pause / archive advertisement | ✅ Implemented |
| Delete advertisement (DRAFT or ARCHIVED only) | ✅ Implemented |
| Public advertisement listing with search and filters | ✅ Implemented |
| Public advertisement detail page | ✅ Implemented |
| Advertiser dashboard | ✅ Implemented |
| Multiple images per advertisement | ✅ Implemented |
| Primary image selection | ✅ Implemented |
| Pagination on all listing endpoints | ✅ Implemented |
| Category-based filtering | ✅ Implemented |
| Price range filtering | ✅ Implemented |
| Location storage (lat/lng + address) | ✅ Implemented |
| Location display component (Phase 7 map placeholder) | ✅ Implemented |
| Ownership enforcement (server-side) | ✅ Implemented |
| Injection attack prevention | ✅ Implemented |
| Swagger / OpenAPI documentation | ✅ Implemented |

---

## 2. Architecture

Phase 5 follows the same layered architecture established in earlier phases.

```
Client Request
    │
    ▼
┌──────────────────────────────────┐
│  Express Router                   │  advertisements.routes.js
│  + validate(ZodSchema)            │  middleware/validate.js
│  + authenticate (protected routes)│  middleware/authenticate.js
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Controller (HTTP layer)          │  advertisements.controller.js
│  Reads req.user.id, req.body,     │
│  req.params, req.query            │
│  Calls service, returns response  │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Service (business logic)         │  advertisements.service.js
│  Ownership checks                 │
│  Status transition rules          │
│  Category validation              │
│  Image limit enforcement          │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Repository (data access)         │  advertisements.repository.js
│  Parameterised SQL only           │
│  pg Pool queries                  │
└──────────────┬───────────────────┘
               │
               ▼
         PostgreSQL
    (advertisements, advertisement_images)
```

### Module structure

```
backend/src/modules/
├── advertisements/
│   ├── advertisements.controller.js   ← HTTP layer
│   ├── advertisements.repository.js   ← SQL / data access
│   ├── advertisements.routes.js       ← Express router
│   ├── advertisements.schemas.js      ← Zod validation schemas
│   └── advertisements.service.js      ← Business logic
└── categories/
    └── categories.routes.js           ← Public category listing
```

---

## 3. Database Models

### 3.1 `advertisements` table (migration 014)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, `gen_random_uuid()` |
| `user_id` | UUID | FK → `users(id)` ON DELETE CASCADE |
| `title` | TEXT | NOT NULL, 3–200 characters |
| `description` | TEXT | NOT NULL, 10–5000 characters |
| `category_id` | UUID | FK → `categories(id)` ON DELETE RESTRICT (nullable) |
| `price` | NUMERIC(12,2) | Nullable, ≥ 0 |
| `price_type` | price_type enum | Default `FIXED` |
| `contact_phone` | TEXT | Nullable |
| `contact_email` | TEXT | Nullable |
| `status` | advertisement_status enum | Default `DRAFT` |
| `published_at` | TIMESTAMPTZ | Set on first publish |
| `expires_at` | TIMESTAMPTZ | Optional expiry |
| `latitude` | NUMERIC(10,7) | WGS-84, −90 to 90 |
| `longitude` | NUMERIC(10,7) | WGS-84, −180 to 180 |
| `address` | TEXT | Human-readable location |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated |

**Custom enum types created:**

```sql
-- Advertisement lifecycle status
CREATE TYPE advertisement_status AS ENUM (
  'DRAFT', 'PUBLISHED', 'PAUSED', 'EXPIRED', 'ARCHIVED'
);

-- Pricing model
CREATE TYPE price_type AS ENUM (
  'FIXED', 'NEGOTIABLE', 'CONTACT_FOR_PRICE', 'FREE'
);
```

**Indexes:**
- `idx_ads_user_id` — advertiser lookup
- `idx_ads_status` — status filtering
- `idx_ads_published` — partial index on PUBLISHED rows, ordered by `published_at DESC`
- `idx_ads_category_id` — category filtering
- `idx_ads_price` — price range queries
- `idx_ads_lat_lng` — location-based future search (Phase 7 ready)
- `idx_ads_expires_at` — expiry job support
- `idx_ads_title` / `idx_ads_description` — GIN full-text indexes (upgradeable to tsvector)

---

### 3.2 `advertisement_images` table (migration 015)

Mirrors the pattern of `profile_images` (migration 009). Stores image metadata only — no binary data in PostgreSQL.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `advertisement_id` | UUID | FK → `advertisements(id)` ON DELETE CASCADE |
| `image_url` | TEXT | Public URL (CDN, S3 presigned, or local) |
| `storage_key` | TEXT | Nullable — S3/GCS key for future storage integration |
| `alt_text` | TEXT | Nullable — accessibility description |
| `sort_order` | INTEGER | Display order in gallery, lower = first |
| `is_primary` | BOOLEAN | Cover image shown in listing cards |
| `created_at` | TIMESTAMPTZ | Auto-set |

**Indexes:**
- `idx_ad_images_advertisement_id` — all images for an ad
- `idx_ad_images_primary` — partial index on `is_primary = TRUE`

---

## 4. Advertisement Lifecycle

```
  ┌─────────────────────────────────────────────────────┐
  │                   DRAFT                              │
  │  Created by advertiser. Editable. Not public.        │
  └───────────┬──────────────────────┬──────────────────┘
              │ publish              │ archive
              ▼                      ▼
  ┌───────────────────┐   ┌──────────────────────────────┐
  │    PUBLISHED      │   │          ARCHIVED             │
  │  Publicly visible │   │  Hidden. Deletable.           │
  └─────┬──────┬──────┘   └──────────────────────────────┘
        │      │                    ▲
   pause│      │archive             │ archive
        │      └────────────────────┘
        ▼
  ┌──────────────┐
  │    PAUSED    │──── publish ──→ PUBLISHED
  │  Hidden.     │
  │  Editable.   │──── archive ──→ ARCHIVED
  └──────────────┘

  EXPIRED: Set automatically when expires_at is passed (Phase 6+ job)
           Not publicly visible. Cannot be archived.
```

### Transition rules

| From | Action | To | Notes |
|---|---|---|---|
| DRAFT | publish | PUBLISHED | Sets `published_at` (first time only) |
| DRAFT | archive | ARCHIVED | |
| DRAFT | delete | — | Hard delete |
| PUBLISHED | pause | PAUSED | |
| PUBLISHED | archive | ARCHIVED | |
| PAUSED | publish | PUBLISHED | |
| PAUSED | archive | ARCHIVED | |
| PAUSED | edit | PAUSED | Fields updated |
| ARCHIVED | delete | — | Hard delete |
| EXPIRED | — | — | No transitions allowed |

### Editability rule

Only `DRAFT` and `PAUSED` advertisements can have their fields updated via `PATCH /api/ads/:id`. A PUBLISHED advertisement must be paused first.

### Deletion rule

Only `DRAFT` and `ARCHIVED` advertisements can be hard-deleted. Published or paused advertisements must be archived before deletion.

---

## 5. API Endpoints

Base path: `/api/ads`

### Public endpoints (no authentication)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ads` | List published advertisements with search, filters, and pagination |
| `GET` | `/api/ads/:id` | Get a single published advertisement by UUID |

### Advertiser endpoints (Bearer token required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ads/me` | List the caller's advertisements (all statuses) |
| `GET` | `/api/ads/me/:id` | Get one of the caller's advertisements by UUID |
| `POST` | `/api/ads` | Create a new advertisement (starts as DRAFT) |
| `PATCH` | `/api/ads/:id` | Update fields (DRAFT or PAUSED only) |
| `PATCH` | `/api/ads/:id/publish` | Publish (DRAFT → PUBLISHED or PAUSED → PUBLISHED) |
| `PATCH` | `/api/ads/:id/pause` | Pause (PUBLISHED → PAUSED) |
| `PATCH` | `/api/ads/:id/archive` | Archive (any → ARCHIVED) |
| `DELETE` | `/api/ads/:id` | Delete (DRAFT or ARCHIVED only) |
| `POST` | `/api/ads/:id/images` | Add an image to an advertisement |
| `DELETE` | `/api/ads/:id/images/:imageId` | Delete an image |
| `PATCH` | `/api/ads/:id/images/:imageId/primary` | Set an image as the primary/cover image |

### Categories endpoint (public)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/categories` | List active categories (tree or flat with `?flat=true`) |
| `GET` | `/api/categories/:id` | Get a single category by UUID |

---

### Request / Response examples

#### Create advertisement

```http
POST /api/ads
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Professional Photography Services",
  "description": "Experienced photographer available for events, portraits, and commercial shoots. Over 5 years of experience.",
  "category_id": "a1b2c3d4-...",
  "price": 150,
  "price_type": "NEGOTIABLE",
  "contact_phone": "+1234567890",
  "contact_email": "photo@example.com",
  "address": "Addis Ababa, Ethiopia",
  "latitude": 9.0054,
  "longitude": 38.7636
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Advertisement created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Professional Photography Services",
    "status": "DRAFT",
    "price": 150,
    "price_type": "NEGOTIABLE",
    "published_at": null,
    "created_at": "2026-08-24T...",
    "updated_at": "2026-08-24T..."
  }
}
```

#### List published advertisements

```http
GET /api/ads?search=photography&category_id=uuid&min_price=50&max_price=500&page=1&page_size=20
```

**Response 200:**
```json
{
  "success": true,
  "message": "Advertisements retrieved successfully",
  "data": {
    "advertisements": [ ... ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 47,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## 6. Authorization Rules

| Actor | Can do |
|---|---|
| Public (unauthenticated) | Browse and search PUBLISHED advertisements, view published detail |
| Authenticated user (any role) | All of the above, plus create and manage their own advertisements |
| ADMIN | All of the above (full admin management reserved for Phase 8) |

### Ownership enforcement

The backend **never trusts** `user_id`, `advertiser_id`, or `status` from the request body or URL. Ownership is always verified using `req.user.id`, which is set exclusively by the JWT authentication middleware from the signed token payload.

When a user attempts to read, edit, publish, pause, archive, or delete another user's advertisement by guessing or manipulating the `id` URL parameter, the response is `404 Not Found` — not `403 Forbidden` — to prevent advertisement ID enumeration.

---

## 7. Validation

All incoming data is validated with **Zod 4** schemas (`advertisements.schemas.js`) before reaching the controller.

### Blocked fields (rejected with 422)

The following fields are explicitly rejected via `z.never().optional()` — they cannot be sent from the client under any circumstance:

`id`, `user_id`, `status`, `published_at`, `created_at`, `updated_at`

### Field rules

| Field | Rule |
|---|---|
| `title` | Required on create. 3–200 characters, trimmed. |
| `description` | Required on create. 10–5000 characters, trimmed. |
| `category_id` | Valid UUID if provided. Existence verified server-side. |
| `price` | Number ≥ 0. Optional. |
| `price_type` | One of `FIXED`, `NEGOTIABLE`, `CONTACT_FOR_PRICE`, `FREE`. |
| `contact_phone` | International format regex. Spaces removed on transform. |
| `contact_email` | Valid email. Lowercased on transform. |
| `latitude` | Number −90 to 90. |
| `longitude` | Number −180 to 180. |
| `address` | String, max 500 characters. |
| `expires_at` | ISO 8601 datetime string. |
| `page` / `page_size` | Coerced positive integers. `page_size` max 100. |
| `status` (query filter) | One of the five status values. |

---

## 8. Image Management

### Rules

- Maximum **10 images** per advertisement.
- The **first image added** is automatically set as primary.
- When a **primary image is deleted**, the next image in sort order is promoted to primary automatically (within a transaction).
- Setting a new primary image clears the previous one (atomic transaction).
- Images are stored by URL — binary data never enters PostgreSQL.
- `storage_key` column is reserved for future S3/GCS integration.

### Image endpoints

```
POST   /api/ads/:id/images                    — add image
DELETE /api/ads/:id/images/:imageId           — remove image
PATCH  /api/ads/:id/images/:imageId/primary   — set as primary
```

### Image request body

```json
{
  "image_url": "https://cdn.example.com/my-image.jpg",
  "alt_text": "Front view of the product",
  "sort_order": 0,
  "is_primary": true
}
```

---

## 9. Search and Filtering

All filtering and search happens **server-side in the database** — nothing is fetched and filtered in JavaScript.

### Supported filters (`GET /api/ads`)

| Query param | Type | Description |
|---|---|---|
| `search` | string | `ILIKE` match on `title` and `description` |
| `category_id` | UUID | Exact match on `category_id` |
| `min_price` | number | `price >= min_price` |
| `max_price` | number | `price <= max_price` |
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Items per page (default: 20, max: 100) |

### Supported filters (`GET /api/ads/me`)

| Query param | Type | Description |
|---|---|---|
| `status` | enum | Filter by advertisement status |
| `page` | integer | Page number |
| `page_size` | integer | Items per page |

The GIN indexes on `title` and `description` are in place for future upgrade to full PostgreSQL full-text search (`tsvector` / `ts_query`) without structural migration changes.

---

## 10. Pagination

Every listing endpoint returns a `pagination` object alongside the data array:

```json
{
  "pagination": {
    "page": 2,
    "page_size": 20,
    "total": 87,
    "total_pages": 5,
    "has_next": true,
    "has_prev": true
  }
}
```

The count query and data query run separately so the total is always accurate. Maximum `page_size` is 100 to prevent abuse.

---

## 11. Categories API

Categories are seeded from `database/seed.js` (run by `npm run db:seed`). They form a hierarchical tree (parent/child via `parent_id`).

### Get category tree

```http
GET /api/categories
```

Returns categories as a nested tree: each top-level category includes a `children` array.

### Get flat list

```http
GET /api/categories?flat=true
```

Returns all active categories as a flat array, useful for `<select>` dropdowns in forms.

The frontend `useCategories()` hook fetches this data with a 30-minute stale time — categories are stable reference data that rarely changes.

---

## 12. Location Storage

Location data is stored directly on the `advertisements` table (not via a separate `locations` join) so each listing can have its own granular location independent of the advertiser's profile location.

| Column | Format | Example |
|---|---|---|
| `latitude` | `NUMERIC(10,7)` WGS-84 | `9.0054000` |
| `longitude` | `NUMERIC(10,7)` WGS-84 | `38.7636000` |
| `address` | Free-text string | `"Bole, Addis Ababa, Ethiopia"` |

Indexes on `(latitude, longitude)` are in place for Phase 7's distance/radius search.

### Phase 7 readiness

The frontend `LocationDisplay` component renders a **map placeholder** when coordinates are present. The component's props interface (`latitude`, `longitude`, `address`) is already designed to accept the same data that Phase 7's interactive map will consume — connecting the map in Phase 7 is a drop-in replacement inside that component.

---

## 13. Frontend Pages and Routes

### New routes

| Path | Component | Auth | Description |
|---|---|---|---|
| `/ads` | `AdsListPage` | Public | Browse and search published advertisements |
| `/ads/:id` | `AdDetailPage` | Public | Full advertisement detail view |
| `/dashboard` | `DashboardPage` | Soft (redirects) | Advertiser dashboard |
| `/dashboard/advertisements/new` | `CreateAdPage` | Soft (redirects) | Create new advertisement |
| `/dashboard/advertisements/:id/edit` | `EditAdPage` | Soft (redirects) | Edit advertisement + manage images |

### New components

```
frontend/src/
├── components/
│   ├── layout/
│   │   └── Navbar.jsx                   ← top nav with login/logout state
│   └── ui/
│       ├── Badge.jsx                    ← status badge (DRAFT, PUBLISHED, etc.)
│       ├── Button.jsx                   ← reusable button with variants and loading state
│       └── FormField.jsx                ← label + input/textarea/select + error display
│
├── features/advertisements/
│   ├── components/
│   │   ├── AdCard.jsx                   ← listing card for grid views
│   │   ├── AdvertisementForm.jsx        ← multi-section create/edit form
│   │   ├── ImageGallery.jsx             ← primary image + thumbnail strip
│   │   └── LocationDisplay.jsx          ← address + Phase 7 map placeholder
│   └── hooks/
│       └── useAdvertisements.js         ← all React Query hooks
│
└── services/
    └── advertisements.service.js        ← all API call functions
```

---

## 14. React Query Hooks

All hooks are in `frontend/src/features/advertisements/hooks/useAdvertisements.js`.

### Query hooks

| Hook | Query key | Description |
|---|---|---|
| `useAdvertisements(params)` | `['advertisements','published',params]` | Public listing with filters |
| `useAdvertisement(id)` | `['advertisements','detail',id]` | Single public ad |
| `useCategories()` | `['categories']` | Active categories (30 min stale) |
| `useMyAdvertisements(params)` | `['advertisements','mine',params]` | Authenticated user's ads |
| `useMyAdvertisement(id)` | `['advertisements','myDetail',id]` | Single owned ad |

### Mutation hooks

| Hook | Invalidates | Description |
|---|---|---|
| `useCreateAdvertisement()` | `mine` | Create new advertisement |
| `useUpdateAdvertisement(id)` | `mine`, `myDetail` | Update fields |
| `usePublishAdvertisement()` | `mine`, `myDetail`, `published` | Publish |
| `usePauseAdvertisement()` | `mine`, `myDetail`, `published` | Pause |
| `useArchiveAdvertisement()` | `mine`, `myDetail`, `published` | Archive |
| `useDeleteAdvertisement()` | `mine`, `published` | Delete |
| `useAddAdvertisementImage(adId)` | `myDetail` | Add image |
| `useDeleteAdvertisementImage(adId)` | `myDetail` | Delete image |
| `useSetPrimaryImage(adId)` | `myDetail` | Set primary image |

All mutations **invalidate** the relevant caches so the UI stays consistent after any change.

---

## 15. Security

### Input security

- `user_id`, `status`, `published_at`, `created_at`, `updated_at` are blocked via `z.never().optional()` in every schema. Sending them returns `422`.
- All text fields are trimmed and email fields are lowercased at the validation layer.
- Phone numbers have whitespace removed on parse.
- Body size limit: 1 MB (inherited from existing Express config).

### Ownership security

Every write operation in the service layer fetches the advertisement first and compares `row.user_id` with `req.user.id`. The comparison also happens at the SQL level (`WHERE id = $1 AND user_id = $2`) as a defence-in-depth measure. Mismatches return `404` — not `403` — to prevent ID enumeration.

### Auth token security

- JWT secret comes from `process.env.JWT_SECRET` only (never from request body).
- Token payload contains `{ id, role, status }` — `role` and `status` from the token are used server-side, never from request body.
- The `apiClient.js` Axios interceptor attaches `Authorization: Bearer <token>` from `localStorage` on every authenticated request.
- A `401` response from the API automatically clears the stored tokens and dispatches `auth:expired`.

### PostgreSQL error handling

- Enum type violations (pg error `22P02`) are caught in `errorHandler.js` and returned as `422 VALIDATION_ERROR`.
- Unique constraint violations (`23505`) are mapped to domain-specific `409` error codes.

---

## 16. Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 404 | `ADVERTISEMENT_NOT_FOUND` | Advertisement does not exist or does not belong to the caller |
| 409 | `ADVERTISEMENT_NOT_EDITABLE` | Cannot edit — advertisement is PUBLISHED (pause first) |
| 409 | `ADVERTISEMENT_NOT_DELETABLE` | Cannot delete — must be DRAFT or ARCHIVED |
| 409 | `INVALID_STATUS_TRANSITION` | The requested status change is not allowed from the current status |
| 409 | `MAX_IMAGES_REACHED` | Advertisement already has 10 images |
| 404 | `IMAGE_NOT_FOUND` | Image does not exist on this advertisement |
| 400 | `INVALID_CATEGORY` | `category_id` does not reference an existing active category |
| 422 | `VALIDATION_ERROR` | Request body / params / query failed Zod validation |

---

## 17. Database Migrations

Two new migration files were added in Phase 5:

| File | Creates |
|---|---|
| `014_create_advertisements.sql` | `advertisement_status` enum, `price_type` enum, `advertisements` table and all indexes |
| `015_create_advertisement_images.sql` | `advertisement_images` table and indexes |

The migration runner (`database/migrate.js`) applies these automatically in filename order. Migrations 001–013 from previous phases are unchanged.

### Run migration

```bash
# From backend/
node database/migrate.js

# Check status
node database/migrate.js --status
```

---

## 18. Testing

Tests use the Node.js built-in test runner (`node:test`). The test file is:

```
backend/tests/advertisements.test.js
```

### Test coverage

| Category | Tests |
|---|---|
| **Create advertisement** | Returns 201 with DRAFT status; 401 without auth; 422 for short title; 422 for short description; injection of `status` rejected; injection of `user_id` rejected; no password in response |
| **Publish** | Publishes DRAFT; sets `published_at`; 401 without auth; 404 cross-user; 409 already published |
| **Pause** | Pauses PUBLISHED; 409 when pausing DRAFT |
| **Archive** | Archives DRAFT; archives PUBLISHED; 409 when already archived |
| **Update** | Updates DRAFT fields; 409 on PUBLISHED ad; 404 cross-user |
| **Delete** | Deletes DRAFT; 409 on PUBLISHED; 404 cross-user |
| **Public visibility** | DRAFT not in public list; PUBLISHED is in public list; PAUSED not in public list; ARCHIVED not in public list; DRAFT returns 404 on public detail endpoint |
| **Public listing** | Returns pagination metadata; search by title works; pagination params respected; 422 for `page_size > 100` |
| **My advertisements** | Returns all own ads; 401 without auth; isolated from other users' ads; status filter works |
| **Images** | Add image returns 201; first image is auto-primary; delete image; 404 cross-user add |
| **Cross-user security** | User A cannot publish User B's ad; User A cannot delete User B's ad; User A cannot view User B's DRAFT via public endpoint |

### Run advertisement tests only

```bash
# From backend/
node --test --test-concurrency=1 tests/advertisements.test.js
```

### Run full test suite

```bash
# From backend/
node --test --test-concurrency=1 tests/**/*.test.js
```

Or use the verification script from the project root:

```bash
node run_phase5.mjs
```

### Test setup requirement

Tests require a live PostgreSQL database. Set `DATABASE_URL` in `backend/.env` before running. The cleanup function in each test file uses `DELETE FROM users WHERE email LIKE 'adtest-%'` — cascades clean up advertisements and images automatically.

---

## 19. File Reference

### New backend files

| File | Role |
|---|---|
| `backend/database/migrations/014_create_advertisements.sql` | Database migration — advertisements table |
| `backend/database/migrations/015_create_advertisement_images.sql` | Database migration — images table |
| `backend/src/modules/advertisements/advertisements.repository.js` | SQL queries and data access |
| `backend/src/modules/advertisements/advertisements.service.js` | Business logic and lifecycle rules |
| `backend/src/modules/advertisements/advertisements.schemas.js` | Zod validation schemas |
| `backend/src/modules/advertisements/advertisements.controller.js` | HTTP handlers and Swagger docs |
| `backend/src/modules/advertisements/advertisements.routes.js` | Express router |
| `backend/src/modules/categories/categories.routes.js` | Public categories endpoint |
| `backend/tests/advertisements.test.js` | Phase 5 test suite (35 test cases) |

### Modified backend files

| File | Change |
|---|---|
| `backend/src/app.js` | Registered `adsRouter` (was stub) and new `categoriesRouter` |
| `backend/src/middleware/errorHandler.js` | Added handling for PostgreSQL enum errors (22P02, 22007) |

### New frontend files

| File | Role |
|---|---|
| `frontend/src/services/advertisements.service.js` | All advertisement API calls |
| `frontend/src/features/advertisements/hooks/useAdvertisements.js` | React Query hooks |
| `frontend/src/features/advertisements/components/AdCard.jsx` | Listing card |
| `frontend/src/features/advertisements/components/AdvertisementForm.jsx` | Create / edit form |
| `frontend/src/features/advertisements/components/ImageGallery.jsx` | Image gallery with thumbnails |
| `frontend/src/features/advertisements/components/LocationDisplay.jsx` | Location + Phase 7 placeholder |
| `frontend/src/components/ui/Badge.jsx` | Status badge |
| `frontend/src/components/ui/Button.jsx` | Reusable button |
| `frontend/src/components/ui/FormField.jsx` | Form field wrapper (Input, Textarea, Select) |
| `frontend/src/components/layout/Navbar.jsx` | Top navigation bar |
| `frontend/src/pages/AdsListPage.jsx` | Public advertisement browsing page |
| `frontend/src/pages/AdDetailPage.jsx` | Public advertisement detail page |
| `frontend/src/pages/DashboardPage.jsx` | Advertiser dashboard |
| `frontend/src/pages/CreateAdPage.jsx` | Create advertisement page |
| `frontend/src/pages/EditAdPage.jsx` | Edit advertisement + image manager |

### Modified frontend files

| File | Change |
|---|---|
| `frontend/src/routes/AppRoutes.jsx` | Added `/ads`, `/ads/:id`, `/dashboard`, `/dashboard/advertisements/*` routes |
| `frontend/src/pages/HomePage.jsx` | Updated placeholder with navigation links |
| `frontend/src/constants/index.js` | Added dashboard route constants |
| `frontend/src/services/apiClient.js` | Activated JWT token attachment and 401 handler |

---

## 20. How to Run

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15 running locally
- `backend/.env` configured (see `backend/.env.example`)

### First-time setup

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Create .env from template
copy .env.example .env
# Edit .env and set DATABASE_URL, JWT_SECRET

# 3. Run all migrations (001–015)
node database/migrate.js

# 4. Seed categories
node database/seed.js

# 5. Run Phase 5 tests
node --test --test-concurrency=1 tests/advertisements.test.js
```

### Or use the single verification script (from project root)

```bash
node run_phase5.mjs
```

This runs migration → seed → advertisement tests → full test suite → frontend build, and prints a pass/fail summary.

### Development servers

```bash
# Backend (terminal 1)
cd backend
npm run dev       # node --watch src/server.js on port 3000

# Frontend (terminal 2)
cd frontend
npm run dev       # vite dev server on port 5173, proxies /api → :3000
```

Open `http://localhost:5173` to browse the app.  
API documentation: `http://localhost:3000/api-docs`

---

## What is NOT in Phase 5

The following are explicitly out of scope and belong to later phases:

| Feature | Phase |
|---|---|
| Subscription plans and payment | Phase 6 |
| Interactive map, GPS picker, distance search | Phase 7 |
| Admin dashboard for advertisement moderation | Phase 8 |
| S3/GCS file upload (binary images) | Phase 9 |
| Docker deployment | Phase 9 |
