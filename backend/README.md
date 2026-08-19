# Backend — Advertising Platform

Node.js + Express modular monolith API.

## Structure

```
src/
├── modules/              # Feature modules — each owns its full vertical slice
│   ├── auth/             # Register, login, JWT
│   ├── users/            # User profiles
│   ├── advertisements/   # Ad listings (CRUD, search)
│   ├── subscriptions/    # Plans and advertiser subscriptions
│   ├── locations/        # GPS / geocoding
│   ├── notifications/    # In-app notifications
│   ├── analytics/        # Ad performance metrics
│   └── admin/            # Platform administration
├── middleware/           # errorHandler, notFound, authenticate
├── config/               # Environment config (reads from .env)
├── db/                   # PostgreSQL connection pool
├── utils/                # asyncHandler, sendSuccess, sendError
├── app.js                # Express app factory
└── server.js             # HTTP server entry point
```

## Each module contains

| File | Responsibility |
|------|---------------|
| `*.routes.js` | URL → controller mapping |
| `*.controller.js` | HTTP parsing, response sending |
| `*.service.js` | Business logic |
| `*.repository.js` | All SQL / database access |

## Scripts

```bash
npm run dev     # Start with --watch (auto-restart on file change)
npm start       # Production start
npm run lint    # ESLint
```

## Environment variables

Create a `.env` file in this directory:

```
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=advertising_platform
DB_USER=postgres
DB_PASSWORD=yourpassword

JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

CORS_ORIGINS=http://localhost:5173
```
