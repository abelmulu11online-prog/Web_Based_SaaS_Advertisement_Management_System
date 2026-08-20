# Nathy's Progress — Local Discovery & Self-Advertising Platform

> **Date:** August 20, 2026
> **Author:** Nathy
> **Picking up from:** Abel created the initial folder structure
> **Status:** Backend Task 1 ✅ + Backend Task 2 ✅ — Foundation is solid and ready for the next phase

---

## What This Project Actually Is

Before anything else — the project has been **renamed and redefined** from what Abel originally scaffolded. The folder was called `Web_Based_SaaS_Advertisement_Management_System` but the product is something fundamentally different.

**The real product:**

A **local discovery and self-advertising platform** where individuals, professionals, shops, businesses, and service providers can create public profiles describing what they offer, where they are located, when they are available, their contact information, social media links, services, and photos.

Customers will eventually be able to search and discover providers by keyword, category, service, location, distance, availability, ratings, and verification.

**Examples of providers:**
Plumbers, Electricians, Mechanics, Restaurants, Cafes, Barbers, Tutors, Freelancers, Photographers, Tailors, Phone repair shops, Construction workers, Cleaners, Lawyers, Designers, Local shops, and many more.

The platform will eventually support paid promotions and featured listings — but **advertising is not the core entity**. The core entity is the **provider's public profile**.

---

## What Abel Left Behind

Abel created the folder structure and initial scaffolding. What was there:

```
backend/
├── src/
│   ├── app.js              ← bare bones, cors() with no config, no error handling wired
│   ├── server.js           ← just app.listen(), no graceful shutdown
│   ├── config/index.js     ← basic env config, some hardcoded defaults
│   ├── db/index.js         ← pg Pool created, no health check, no disconnect
│   ├── middleware/
│   │   ├── authenticate.js ← JWT stub (passes all requests — Phase 4)
│   │   ├── errorHandler.js ← basic, inconsistent response format
│   │   └── notFound.js     ← basic 404
│   ├── utils/index.js      ← asyncHandler, sendSuccess, sendError (inconsistent format)
│   └── modules/
│       ├── auth/           ← empty stubs
│       ├── users/          ← empty stubs
│       ├── advertisements/ ← empty stubs
│       ├── subscriptions/  ← empty stubs
│       ├── locations/      ← empty stubs
│       ├── notifications/  ← empty stubs
│       ├── analytics/      ← empty stubs
│       └── admin/          ← empty stubs
├── tests/
│   └── .gitkeep            ← no tests written
├── .env.example
└── package.json            ← express, cors, helmet, dotenv, pg installed
```

The bones were good. The architecture (config → db → middleware → modules → controller/service/repository) was solid and worth keeping. I built on top of it rather than replacing it.

---

## Task 1 — Backend API Foundation

The goal was to take Abel's skeleton and turn it into a **real, working, production-oriented Express API foundation** before touching any business logic.

### What I changed and why

#### `src/config/index.js` — Centralized configuration

Improved the existing config with:

- **`DATABASE_URL` support** — takes precedence over individual `DB_HOST`, `DB_PORT`, etc. fields. This is the standard for cloud deployments (Railway, Supabase, Heroku all give you a single URL).
- **Production fail-fast** — if `NODE_ENV=production` and `JWT_SECRET` is not set, the application **refuses to start** with a clear error message. No silent insecure defaults in production.
- **Convenience booleans** — `config.isDevelopment`, `config.isProduction`, `config.isTest` so you're not doing string comparisons everywhere.

#### `src/db/index.js` — PostgreSQL connection pool

Built on Abel's existing pg Pool with:

- **`checkHealth()`** — borrows a connection, runs `SELECT 1`, releases it. Returns `true`/`false`. Used by the health endpoint and by server startup.
- **`disconnect()`** — gracefully closes the entire pool. Called during SIGINT/SIGTERM shutdown.
- **Pool error listener** — idle connection errors are logged instead of being silently swallowed.
- **SSL handling** — enforces `rejectUnauthorized: true` in production, disabled in development.
- **Pool sizing** — max 10 connections, 30s idle timeout, 5s connection timeout.

#### `src/utils/index.js` — Shared utilities

Fixed the response format inconsistency. The whole API now follows one shape:

```json
// Success
{ "success": true, "message": "Human readable", "data": {} }

// Error
{ "success": false, "message": "Human readable", "error": { "code": "ERROR_CODE" } }
```

Added `createError(message, statusCode, code)` — creates a structured operational error that the central error handler understands. Use this in services and controllers instead of throwing plain `new Error()`.

#### `src/utils/logger.js` — NEW: Pino structured logger

Added a proper logger instead of relying on `console.log`. Pino writes structured JSON logs, which production log systems (CloudWatch, Datadog, etc.) can parse and query.

Key features:
- Redacts `Authorization` header, `cookie` header, `password`, `token` fields from every log line automatically — secrets never end up in log files
- `debug` level in development, `info` in production

#### `src/middleware/errorHandler.js` — Centralized error handler

Completely rewrote it to:
- Handle **Zod validation errors** with a structured `issues` array
- Handle **JSON parse errors** (malformed request body) → `400 INVALID_JSON`
- Handle **payload too large** → `413 PAYLOAD_TOO_LARGE`
- Handle **operational errors** (created with `createError()`) with the correct status code
- For unexpected errors: **logs full stack trace server-side**, returns a safe generic message to the client in production
- **Never exposes SQL errors, stack traces, or internal paths to API clients in production**

#### `src/middleware/notFound.js` — 404 handler

Updated to use the standard error response format with `error.code: 'NOT_FOUND'`.

#### `src/middleware/validate.js` — NEW: Zod validation middleware

Reusable middleware that wraps any Zod schema and validates `req.body`, `req.query`, and `req.params` before they reach the controller. Future controllers just do:

```js
router.post('/profiles', validate(createProfileSchema), profileController.create)
```

If validation fails, the request is rejected with `422 VALIDATION_ERROR` and a list of field-level issues before the controller even runs.

#### `src/app.js` — Express application factory

Wired everything together properly:

- **CORS from config** — reads allowed origins from `config.cors.allowedOrigins` (which reads `CORS_ORIGINS` env var). Rejects unlisted origins with a logged warning. No more open `cors()`.
- **Helmet** — security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Body size limit** — 1MB cap on JSON and URL-encoded bodies
- **pino-http** — request logging middleware. Health endpoint polls are silently suppressed (no log spam when a monitor pings every 10s)
- **All 9 module routers mounted** at their `/api/*` paths
- **`notFound` before `errorHandler`** — correct order is critical for Express error handling

#### `src/server.js` — HTTP server lifecycle

Separated app configuration (`app.js`) from server lifecycle (`server.js`). Added:

- **Startup database check** — logs `PostgreSQL connection verified` or a warning on startup
- **Graceful shutdown** — handles `SIGINT` (Ctrl+C) and `SIGTERM` (Docker/systemd stop). Sequence: stop accepting connections → wait for in-flight requests → close DB pool → exit 0
- **10s safety timeout** — if graceful shutdown hangs for 10 seconds, force-exits
- **`unhandledRejection` + `uncaughtException`** handlers — logs them before dying instead of crashing silently

#### `.env.example` — Updated

Added `DATABASE_URL` as the preferred option, clear comments on what each variable does and whether it's required in production.

#### `src/modules/health/` — NEW: Health module

A proper module following the same controller/service/routes pattern as all future modules.

- `GET /api/health` — publicly accessible, no auth
- Returns `200` when the API and DB are healthy
- Returns `503` when the DB is unreachable
- Response shape:

```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "status": "ok",
    "database": "connected"
  }
}
```

#### Dependencies added in Task 1

| Package | Version | Why |
|---------|---------|-----|
| `pino` | 10.3.1 | Structured JSON logging. Faster than Winston, built-in field redaction |
| `pino-http` | 11.0.0 | HTTP request logging middleware that integrates with Pino |
| `zod` | 4.4.3 | Schema validation. Type-safe, zero dependencies, great ESM support |

---

## Task 2 — Database Architecture & Schema Foundation

With the API foundation solid, the next step was designing and implementing the actual PostgreSQL database schema for the platform.

### Technology decisions

- **Kept `pg` (node-postgres)** — Abel already had it. Adding Prisma just for a connection foundation would bring a heavy CLI, schema files in a different format, and migration ceremony that isn't needed yet. The existing repository pattern (`pool.query(sql, params)`) is clean, explicit, and fast.
- **`gen_random_uuid()`** — PostgreSQL 16 has this built-in. No extensions needed.
- **`TIMESTAMPTZ`** — all timestamps are timezone-aware. UTC in storage, convert at the application layer.
- **SQL migration files** — plain `.sql` files. Readable, diffable in git, no DSL to learn.

### The migration system (`database/migrate.js`)

A lightweight custom migration runner — no third-party library.

How it works:
1. Creates a `schema_migrations` table on first run (tracks what's been applied)
2. Reads all `*.sql` files from `database/migrations/`, sorted by filename (so `001_` always runs before `002_`)
3. Skips files already recorded in `schema_migrations`
4. Wraps each pending migration in a **transaction** — if the SQL fails, the whole migration rolls back and the runner exits with a non-zero code
5. On success, records the filename in `schema_migrations` so it never runs again

Running it twice is completely safe — it just says "No pending migrations."

Commands:
```bash
npm run db:migrate          # run all pending migrations
npm run db:migrate:status   # show which are applied / pending
```

### The seed system (`database/seed.js`)

Seeds **categories** and **services** only — no fake users, no fake profiles. Reference data only.

Safe to run repeatedly — uses `ON CONFLICT (slug) DO UPDATE`, so running it 10 times is the same as running it once.

Seeded:
- **40 categories** — 10 top-level + 30 subcategories
- **30 services** — spread across Plumbing, Electrical, Cleaning, Phone Repair, Photography, Web Development, Hair Salons, Catering

```bash
npm run db:seed
```

---

### The Database Schema

#### Entity Relationship Overview

```
users
  └── profiles  (one user → one profile for now)
        ├── categories      (many profiles → one category, hierarchical)
        ├── locations       (many profiles → one location, PostGIS-ready)
        ├── profile_services  (many-to-many: profiles ↔ services)
        ├── business_hours  (one profile → up to 7 rows, one per weekday)
        ├── social_links    (one profile → many social links, one per platform)
        └── profile_images  (one profile → many images)

categories (self-referential tree)
  └── services  (many services per category)
```

---

#### Table: `users`

The account and authentication identity. Authentication logic (password hashing, JWT, sessions) is **not here yet** — that is Task 4. This is just the database foundation.

```sql
id            UUID          PRIMARY KEY DEFAULT gen_random_uuid()
email         TEXT          UNIQUE  -- nullable (phone-only accounts)
phone         TEXT          UNIQUE  -- nullable (email-only accounts)
password_hash TEXT                  -- nullable for future OAuth accounts
role          TEXT          NOT NULL DEFAULT 'USER'   CHECK IN ('USER', 'ADMIN')
status        TEXT          NOT NULL DEFAULT 'ACTIVE' CHECK IN ('ACTIVE', 'SUSPENDED', 'DELETED')
created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
CONSTRAINT users_has_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
```

Key design decisions:
- Every user must have at least `email` OR `phone` — the CHECK constraint enforces this at the database level, not just the application layer
- `password_hash` is nullable to support future OAuth/social sign-in
- `status = 'DELETED'` is a soft delete — we keep the row so foreign keys don't break
- Partial indexes on `email` and `phone` (only indexes non-null values, smaller and faster)

---

#### Table: `categories`

Hierarchical category tree using a self-referential foreign key. Supports unlimited depth.

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
parent_id   UUID        REFERENCES categories(id) ON DELETE RESTRICT  -- null = top-level
name        TEXT        NOT NULL
slug        TEXT        NOT NULL UNIQUE
description TEXT
icon        TEXT        -- emoji or icon name for UI
is_active   BOOLEAN     NOT NULL DEFAULT TRUE
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Structure after seeding:
```
🏠 Home Services
   ├── Plumbing
   ├── Electrical
   ├── Cleaning
   ├── Painting & Decorating
   ├── Gardening & Landscaping
   └── Security Systems
🍽️ Food & Beverage
   ├── Restaurants
   ├── Cafes & Coffee Shops
   ├── Bakeries & Pastries
   ├── Catering
   └── Street Food & Vendors
💼 Professional Services
   ├── Legal Services
   ├── Accounting & Finance
   ├── Business Consulting
   └── Medical & Healthcare
💇 Beauty & Wellness
   ├── Hair Salons & Barbers
   ├── Spas & Massage
   ├── Fitness & Gyms
   └── Nail Salons
💻 Technology & Repair
   ├── Phone Repair
   ├── Computer & Laptop Repair
   ├── Web Development
   └── Software Development
🎨 Creative & Media
   ├── Photography
   ├── Graphic Design
   └── Videography
🔨 Construction & Trades
   ├── Building & Construction
   ├── Tiling & Flooring
   ├── Roofing
   └── Welding & Metalwork
📚 Education & Tutoring  (no subcategories yet)
🚗 Transport & Logistics (no subcategories yet)
🛍️ Retail & Shops        (no subcategories yet)
```

`ON DELETE RESTRICT` on `parent_id` means you cannot delete a parent category that has children. You must delete or reparent the children first. This is intentional — it prevents accidentally orphaning a subtree.

---

#### Table: `locations`

Geographic information for provider profiles. Designed to be PostGIS-compatible later.

```sql
id            UUID          PRIMARY KEY DEFAULT gen_random_uuid()
country       TEXT
region        TEXT          -- state / province / governorate
city          TEXT
subcity       TEXT          -- district / kebele / ward
neighborhood  TEXT
address       TEXT
latitude      NUMERIC(10,7) CHECK (latitude  BETWEEN -90  AND 90)
longitude     NUMERIC(10,7) CHECK (longitude BETWEEN -180 AND 180)
created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
```

When PostGIS is added (a future migration), we will `ALTER TABLE locations ADD COLUMN geog GEOGRAPHY(POINT, 4326)` and populate it from `latitude`/`longitude`. The structure of this table does not need to change — PostGIS becomes an additional column, not a replacement.

---

#### Table: `profiles` ← The Core Entity

This is what the whole platform is about. A public profile/listing for a provider.

```sql
id              UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE
display_name    TEXT        NOT NULL
slug            TEXT        NOT NULL UNIQUE       -- used in public URLs: /p/{slug}
description     TEXT
category_id     UUID        REFERENCES categories(id) ON DELETE RESTRICT
location_id     UUID        REFERENCES locations(id)  ON DELETE SET NULL
contact_phone   TEXT
contact_email   TEXT
website_url     TEXT
is_published    BOOLEAN     NOT NULL DEFAULT FALSE
is_verified     BOOLEAN     NOT NULL DEFAULT FALSE
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

Key design decisions:
- `user_id` has a `UNIQUE INDEX` — one user, one profile for now. This constraint can be dropped in one migration if multi-profile support is needed later.
- `ON DELETE CASCADE` on `user_id` — deleting a user deletes their profile and everything attached to it
- `ON DELETE RESTRICT` on `category_id` — you cannot delete a category that has profiles pointing to it. Protects data integrity.
- `ON DELETE SET NULL` on `location_id` — a profile can temporarily have no location (e.g. during editing)
- `is_published = FALSE` by default — profiles are private drafts until explicitly published
- `is_verified = FALSE` by default — verification is a manual admin action
- Partial indexes on `is_published` and `is_verified` (only indexes `TRUE` rows — much smaller, hits the most common discovery query pattern)

A profile can represent **anything**: an individual freelancer, a shop, a restaurant, a service provider, a company. The category field is what distinguishes them for discovery purposes.

---

#### Table: `services`

Specific, named services that providers can offer. Linked to a category.

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid()
category_id UUID        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT
name        TEXT        NOT NULL
slug        TEXT        NOT NULL UNIQUE
description TEXT
is_active   BOOLEAN     NOT NULL DEFAULT TRUE
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Services seeded (30 total, examples):
- Plumbing: Pipe Repair, Drain Cleaning, Water Heater Installation, Bathroom Plumbing, Leak Detection
- Electrical: House Wiring, Electrical Repair, Solar Panel Installation, Generator Installation
- Cleaning: Home Cleaning, Office Cleaning, Deep Cleaning, Laundry Service
- Phone Repair: Screen Replacement, Battery Replacement, Software Unlocking, Water Damage Repair
- Photography: Portrait, Event, Product, Real Estate Photography
- Web Development: Website Design, E-commerce Development, Website Maintenance
- Hair Salons: Haircut, Hair Coloring, Beard Trim
- Catering: Event, Wedding, Office Catering

---

#### Table: `profile_services` (Many-to-Many Join)

A plumber can offer multiple services. A service can be offered by many providers.

```sql
profile_id  UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
service_id  UUID  NOT NULL REFERENCES services(id) ON DELETE CASCADE
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY (profile_id, service_id)
```

`ON DELETE CASCADE` on both sides — deleting a profile removes all its service links. Deleting a service (admin operation) removes it from all profiles. The composite primary key prevents the same service being linked to the same profile twice.

---

#### Table: `business_hours`

One row per weekday per profile. Represents normal working hours.

```sql
id          UUID      PRIMARY KEY DEFAULT gen_random_uuid()
profile_id  UUID      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
day_of_week SMALLINT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)
opens_at    TIME
closes_at   TIME
is_closed   BOOLEAN   NOT NULL DEFAULT FALSE
UNIQUE (profile_id, day_of_week)
```

Day convention: `0 = Sunday, 1 = Monday, ..., 6 = Saturday` — matches JavaScript's `Date.getDay()` to avoid conversion bugs between backend and frontend.

A full provider schedule is 7 rows. `is_closed = TRUE` means closed all day (the opens/closes times are ignored). Real-time availability, exceptions, and holidays are a **future feature**.

---

#### Table: `social_links`

Normalized social media links — one row per platform per profile.

```sql
id          UUID  PRIMARY KEY DEFAULT gen_random_uuid()
profile_id  UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
platform    TEXT  NOT NULL CHECK (platform IN (
              'FACEBOOK', 'INSTAGRAM', 'TELEGRAM', 'WHATSAPP',
              'TIKTOK', 'LINKEDIN', 'YOUTUBE', 'TWITTER', 'SNAPCHAT', 'OTHER'))
url         TEXT  NOT NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE (profile_id, platform)
```

Why a table instead of columns (`facebook_url`, `instagram_url`, etc.)? Because adding a new platform (say, Threads) requires **zero schema changes** — just add a new row. With columns, you'd need a migration to add a new column for every new platform forever.

---

#### Table: `profile_images`

Image metadata for provider galleries.

```sql
id          UUID    PRIMARY KEY DEFAULT gen_random_uuid()
profile_id  UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
image_url   TEXT    NOT NULL
storage_key TEXT    -- S3 key / GCS path / local filename (null until storage is built)
alt_text    TEXT    -- for screen readers
sort_order  INTEGER NOT NULL DEFAULT 0
is_primary  BOOLEAN NOT NULL DEFAULT FALSE
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

`storage_key` is `NULL` for now — it will be populated when file upload (S3/GCS/local) is implemented in a future task. The table structure doesn't need to change for that.

A partial index on `is_primary = TRUE` makes fetching the cover image for any profile instant.

---

### Cascade / Restrict Behavior Summary

This is important to understand before writing any DELETE queries:

| Operation | Behavior |
|-----------|----------|
| Delete a **user** | Cascades → deletes their profile, which cascades to hours, social links, images, and service links |
| Delete a **profile** | Cascades → business_hours, social_links, profile_images, profile_services |
| Delete a **category** that has profiles | **RESTRICTED** — will error. Remove profiles first. |
| Delete a **category** that has subcategories | **RESTRICTED** — will error. Remove children first. |
| Delete a **service** that profiles use | **RESTRICTED** — will error. Remove from profile_services first. |
| Delete a **location** | Profile's `location_id` becomes NULL (SET NULL) |

---

### Indexes Created (28 total)

| Table | Index | Why |
|-------|-------|-----|
| users | `idx_users_email` (partial) | Login lookup, uniqueness check |
| users | `idx_users_phone` (partial) | Phone login lookup |
| users | `idx_users_status` | Filter active/suspended users |
| users | `idx_users_role` | Filter admins |
| categories | `idx_categories_parent_id` | Fetch children of a category |
| categories | `idx_categories_slug` | Lookup by slug |
| categories | `idx_categories_is_active` | Filter active categories |
| locations | `idx_locations_city` | Filter by city |
| locations | `idx_locations_region` | Filter by region |
| locations | `idx_locations_country` | Filter by country |
| locations | `idx_locations_lat_lng` | Composite geo queries (pre-PostGIS) |
| profiles | `idx_profiles_user_id` (unique) | One profile per user, direct lookup |
| profiles | `idx_profiles_slug` | Public URL lookup `/p/{slug}` |
| profiles | `idx_profiles_category_id` | Filter by category |
| profiles | `idx_profiles_location_id` | Filter by location |
| profiles | `idx_profiles_is_published` (partial) | Discovery — only published profiles |
| profiles | `idx_profiles_is_verified` (partial) | Filter verified providers |
| services | `idx_services_category_id` | Services in a category |
| services | `idx_services_slug` | Lookup by slug |
| services | `idx_services_is_active` | Filter active services |
| profile_services | `idx_profile_services_service_id` | Which profiles offer a service |
| business_hours | `idx_business_hours_profile_id` | All hours for a profile |
| social_links | `idx_social_links_profile_id` | All links for a profile |
| profile_images | `idx_profile_images_profile_id` | All images for a profile |
| profile_images | `idx_profile_images_primary` (partial) | Fast primary image fetch |

---

## Tests

Tests use **Node.js built-in test runner** (`node:test`) — zero extra dependencies.

### `tests/api.test.js` — API Foundation Tests (8 tests)

| Test | What it checks |
|------|---------------|
| Health endpoint shape (200 or 503) | Correct HTTP status, `success`/`message`/`data` fields present |
| Health connected/disconnected response | Correct values based on DB state |
| 404 for unknown routes | `NOT_FOUND` code, correct shape |
| 404 for completely unknown paths | Same |
| Malformed JSON → 400 | `INVALID_JSON` code, no crash |
| Response format — success | All 3 required fields present |
| Response format — error | All 3 required fields + `error.code` present |
| Helmet security headers | `x-content-type-options` header present |

### `tests/schema.test.js` — Database Schema Tests (48 tests)

| Suite | Tests |
|-------|-------|
| Tables exist | All 10 tables verified to exist |
| UUID primary keys | UUIDs are auto-generated and valid format |
| users table | Email uniqueness, phone uniqueness, contact CHECK, role CHECK, status CHECK, default role |
| categories table | Slug uniqueness, self-reference, invalid parent_id rejected, is_active default |
| locations table | Full row insert, latitude range CHECK, longitude range CHECK |
| Profile → User relationship | Link correct, slug unique, is_published default, is_verified default, category join, location join, user cascade |
| Category delete restriction | Cannot delete category with profiles referencing it |
| Profile ↔ Services many-to-many | Multiple services per profile, cascade on profile delete, duplicate rejected |
| Business hours | Full week insert, unique(profile_id, day_of_week), day_of_week CHECK, cascade on profile delete |
| Social links | Unique per platform, platform CHECK, cascade on profile delete |
| Profile images | Multiple images, is_primary default, cascade on profile delete |
| Seed data sanity | Top-level categories exist, plumbing → home-services hierarchy, pipe-repair → plumbing, ≥20 services |

**Results: 56/56 tests pass, 0 failures, ESLint clean.**

---

## Current Project Structure

```
backend/
├── database/
│   ├── migrations/
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_categories.sql
│   │   ├── 003_create_locations.sql
│   │   ├── 004_create_profiles.sql
│   │   ├── 005_create_services.sql
│   │   ├── 006_create_profile_services.sql
│   │   ├── 007_create_business_hours.sql
│   │   ├── 008_create_social_links.sql
│   │   └── 009_create_profile_images.sql
│   ├── migrate.js    ← migration runner
│   └── seed.js       ← reference data seeder
│
├── src/
│   ├── config/
│   │   └── index.js          ← all env vars, fail-fast in prod
│   ├── db/
│   │   └── index.js          ← pg Pool, checkHealth(), disconnect()
│   ├── middleware/
│   │   ├── authenticate.js   ← JWT stub (Phase 4)
│   │   ├── errorHandler.js   ← centralized, safe, consistent format
│   │   ├── notFound.js       ← 404 handler
│   │   └── validate.js       ← Zod validation middleware
│   ├── utils/
│   │   ├── index.js          ← asyncHandler, sendSuccess, sendError, createError
│   │   └── logger.js         ← Pino structured logger with redaction
│   ├── modules/
│   │   ├── health/           ← GET /api/health (IMPLEMENTED ✅)
│   │   │   ├── health.controller.js
│   │   │   ├── health.service.js
│   │   │   └── health.routes.js
│   │   ├── auth/             ← stub (Phase 4)
│   │   ├── users/            ← stub (Phase 4)
│   │   ├── advertisements/   ← stub (Phase 5)
│   │   ├── subscriptions/    ← stub (Phase 6)
│   │   ├── locations/        ← stub (Phase 7)
│   │   ├── analytics/        ← stub (Phase 9)
│   │   ├── notifications/    ← stub (future)
│   │   └── admin/            ← stub (Phase 8)
│   ├── app.js                ← Express factory, all middleware + routes wired
│   └── server.js             ← HTTP lifecycle, graceful shutdown
│
├── tests/
│   ├── api.test.js           ← 8 API foundation tests
│   └── schema.test.js        ← 48 schema integrity tests
│
├── .env.example              ← copy to .env and fill in
├── .env                      ← your local config (gitignored)
├── eslint.config.js          ← ESLint v9 flat config
├── package.json
└── README.md
```

---

## API Response Format (Standard — All Endpoints)

Every response from this API follows one of two shapes:

```json
// Success (2xx)
{
  "success": true,
  "message": "Human readable description",
  "data": { ... }
}

// Error (4xx / 5xx)
{
  "success": false,
  "message": "Human readable description",
  "error": {
    "code": "MACHINE_READABLE_CODE"
  }
}

// Validation error (422)
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "issues": [
      { "path": "body.email", "message": "Invalid email" }
    ]
  }
}
```

---

## Dependencies (All Pinned)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.22.2 | HTTP framework |
| `cors` | 2.8.6 | CORS middleware |
| `helmet` | 7.2.0 | Security headers |
| `dotenv` | 16.6.1 | `.env` loading |
| `pg` | 8.23.0 | PostgreSQL client (node-postgres) |
| `pino` | 10.3.1 | Structured JSON logging |
| `pino-http` | 11.0.0 | HTTP request logging |
| `zod` | 4.4.3 | Schema validation |
| `eslint` | 9.39.5 | Linting (dev) |

---

## How to Initialize a Fresh Database (For New Team Members)

This is the exact sequence to get the backend running from a clean clone.

### Prerequisites

- Node.js 18 or higher (`node --version`)
- PostgreSQL 13 or higher running locally (we use PostgreSQL 16)
- Git clone of the repo

### Step 1 — Install dependencies

```bash
cd backend
npm install
```

### Step 2 — Create the database

Connect to your PostgreSQL instance and create the database:

```sql
CREATE DATABASE local_discovery;
```

If you're using pgAdmin, right-click Databases → Create → Database → name it `local_discovery`.

If you have `psql` in your PATH:
```bash
psql -U postgres -c "CREATE DATABASE local_discovery;"
```

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill it in:

```env
PORT=3000
NODE_ENV=development

# Use this single URL (easiest):
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/local_discovery

# CORS — your frontend dev server address
CORS_ORIGINS=http://localhost:5173

# JWT — not used yet, but required to exist
JWT_SECRET=any-long-random-string-for-development
JWT_EXPIRES_IN=7d
```

Replace `YOUR_PASSWORD` with your actual PostgreSQL password.

### Step 4 — Run migrations

```bash
npm run db:migrate
```

Expected output:
```
[migrate] Running 9 pending migration(s)...
[migrate]   → 001_create_users.sql          ✓
[migrate]   → 002_create_categories.sql     ✓
[migrate]   → 003_create_locations.sql      ✓
[migrate]   → 004_create_profiles.sql       ✓
[migrate]   → 005_create_services.sql       ✓
[migrate]   → 006_create_profile_services.sql ✓
[migrate]   → 007_create_business_hours.sql ✓
[migrate]   → 008_create_social_links.sql   ✓
[migrate]   → 009_create_profile_images.sql ✓
[migrate] All migrations applied successfully.
```

### Step 5 — Seed reference data

```bash
npm run db:seed
```

Expected output:
```
[seed] Seeding categories...
[seed]   ✓ 40 categories
[seed] Seeding services...
[seed]   ✓ 30 services
[seed] Seed completed successfully.
```

### Step 6 — Verify everything

```bash
# Check migration status
npm run db:migrate:status

# Run all tests
npm test

# Run linter
npm run lint
```

All 56 tests should pass. Lint should be clean.

### Step 7 — Start the server

```bash
npm run dev
```

You should see:
```json
{"level":30,"msg":"Server listening on http://localhost:3000","port":3000,"env":"development"}
{"level":30,"msg":"PostgreSQL connection verified"}
```

### Step 8 — Verify in your browser or Postman

```
GET http://localhost:3000/api/health
```

Should return:
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "status": "ok",
    "database": "connected"
  }
}
```

---

## Package Scripts Reference

| Script | Command | What it does |
|--------|---------|-------------|
| `npm run dev` | `node --watch src/server.js` | Start dev server with auto-restart |
| `npm start` | `node src/server.js` | Start production server |
| `npm test` | `node --test tests/api.test.js tests/schema.test.js` | Run all tests |
| `npm run lint` | `eslint src/` | Check for code issues |
| `npm run db:migrate` | `node database/migrate.js` | Run pending migrations |
| `npm run db:migrate:status` | `node database/migrate.js --status` | Show migration state |
| `npm run db:seed` | `node database/seed.js` | Seed categories and services |

---

## What's Already Live

| Route | Status | Description |
|-------|--------|-------------|
| `GET /api/health` | ✅ Live | API + database health check |
| `POST /api/auth/*` | 🔲 Stub | Phase 4 — Authentication |
| `GET/PUT /api/users/*` | 🔲 Stub | Phase 4 — User profiles |
| `GET/POST/PUT/DELETE /api/ads/*` | 🔲 Stub | Phase 5 — Provider listings |
| `GET /api/subscriptions/*` | 🔲 Stub | Phase 6 — Plans & billing |
| `GET /api/locations/*` | 🔲 Stub | Phase 7 — Maps & geocoding |
| `GET /api/admin/*` | 🔲 Stub | Phase 8 — Admin dashboard |
| `GET /api/analytics/*` | 🔲 Stub | Phase 9 — Listing analytics |
| `GET/PUT /api/notifications/*` | 🔲 Stub | Future phase |

---

## What's Next — Phase 3 / Task 3

The foundation is complete. The next person picks up from here and implements:

### Task 3 — Authentication & User Accounts

The database table (`users`) is already there. What's needed:

- **`POST /api/auth/register`** — create user, hash password with `bcrypt`/`argon2`, return JWT
- **`POST /api/auth/login`** — verify credentials, return JWT + refresh token
- **`POST /api/auth/logout`** — invalidate refresh token
- **`POST /api/auth/refresh-token`** — issue new access token from refresh token
- **`src/middleware/authenticate.js`** — the stub is there, wire it up with real JWT verification
- **Password hashing** — add `bcryptjs` or `argon2` dependency
- **JWT** — add `jsonwebtoken` dependency
- **Refresh token storage** — decide: database table or Redis
- **Repository pattern** — `auth.repository.js` should do all SQL, `auth.service.js` should have all logic

The validation middleware (`src/middleware/validate.js`) is already there — just create Zod schemas for the auth request bodies and use `validate(schema)` on the routes.

The response format is already standardized — use `sendSuccess()` and `sendError()` from `src/utils/index.js`.

The logger is already there — use `import logger from '../../utils/logger.js'`.

Do **not** log passwords or tokens — the logger has automatic redaction for `password`, `token`, and `Authorization` header.

---

## Known Decisions to Revisit Later

| Decision | Current State | When to revisit |
|----------|--------------|----------------|
| One profile per user | `UNIQUE INDEX` on `profiles.user_id` | If multi-profile support is needed, drop the unique index |
| `day_of_week` 0-6 (Sunday-based) | JS `Date.getDay()` convention | Documented — frontend should match |
| PostGIS geo search | Plain `NUMERIC` lat/lng for now | When "find providers within X km" is built — add `geography` column via new migration |
| Social platform list | CHECK constraint in SQL | Adding a new platform needs a migration to update the CHECK — intentional, keeps data controlled |
| No refresh token table | Not built yet | Needed in Task 3 — decide between DB table or Redis |

---

*Built by Nathy — August 20, 2026*
*PostgreSQL 16 · Node.js 24 · Express 4 · node-postgres 8 · Pino 10 · Zod 4 · ESLint 9*
