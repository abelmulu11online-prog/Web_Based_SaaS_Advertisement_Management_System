# Backend — Local Discovery & Self-Advertising Platform

Node.js + Express modular monolith API.

## Structure

```
src/
├── modules/              # Feature modules — each owns its full vertical slice
│   ├── health/           # GET /api/health — database + API status
│   ├── auth/             # Register, login, JWT  (Phase 4)
│   ├── users/            # User profiles          (Phase 4)
│   ├── advertisements/   # Provider listings      (Phase 5)
│   ├── subscriptions/    # Plans and billing      (Phase 6)
│   ├── locations/        # GPS / geocoding        (Phase 7)
│   ├── analytics/        # Listing performance    (Phase 9)
│   ├── notifications/    # In-app notifications   (future)
│   └── admin/            # Platform administration (Phase 8)
├── middleware/
│   ├── authenticate.js   # JWT guard stub — Phase 4
│   ├── errorHandler.js   # Centralised error handler
│   ├── notFound.js       # 404 handler
│   └── validate.js       # Zod validation middleware
├── config/               # Environment config (reads from .env)
├── db/                   # PostgreSQL connection pool (node-postgres)
├── utils/
│   ├── index.js          # asyncHandler, sendSuccess, sendError, createError
│   └── logger.js         # Pino structured logger
├── app.js                # Express app factory (middleware + routes)
└── server.js             # HTTP server entry point + graceful shutdown
```

## Each module contains

| File | Responsibility |
|------|---------------|
| `*.routes.js` | URL → controller mapping |
| `*.controller.js` | HTTP parsing, response sending |
| `*.service.js` | Business logic |
| `*.repository.js` | All SQL / database access |

## API response format

**Success:**
```json
{ "success": true, "message": "Human readable", "data": {} }
```

**Error:**
```json
{ "success": false, "message": "Human readable", "error": { "code": "ERROR_CODE" } }
```

## Scripts

```bash
npm run dev        # Start with --watch (auto-restart on file change)
npm start          # Production start
npm run lint       # ESLint
node --test tests/**/*.test.js   # Run tests
```

## Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description | Required in prod? |
|----------|-------------|:-----------------:|
| `PORT` | HTTP port (default 3000) | No |
| `NODE_ENV` | `development` / `production` / `test` | No |
| `DATABASE_URL` | Full PostgreSQL connection URL | Yes (or DB_* fields) |
| `DB_HOST` | PostgreSQL host | If no DATABASE_URL |
| `DB_PORT` | PostgreSQL port (default 5432) | If no DATABASE_URL |
| `DB_NAME` | Database name | If no DATABASE_URL |
| `DB_USER` | Database user | If no DATABASE_URL |
| `DB_PASSWORD` | Database password | If no DATABASE_URL |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes |
| `JWT_SECRET` | JWT signing secret | **Yes — app fails if absent** |
| `JWT_EXPIRES_IN` | Token expiry (default `7d`) | No |

## Health check

```
GET /api/health
```

Returns `200` when the API and database are healthy, `503` when the database is unreachable.
