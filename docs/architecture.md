# Architecture Overview

## System Design

The platform follows a **client-server** architecture with a clear separation between the frontend SPA, the backend API, and the database.

```
┌─────────────────────────────────────────────────────┐
│                   Browser (SPA)                      │
│           React + Vite  (port 5173 dev)              │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / REST JSON
                       ▼
┌─────────────────────────────────────────────────────┐
│              Backend API (Node.js + Express)         │
│              Modular Monolith  (port 3000)           │
│                                                      │
│  modules: auth | users | ads | subscriptions        │
│           locations | notifications | analytics      │
│           admin                                      │
└──────────────────────┬──────────────────────────────┘
                       │ pg (node-postgres)
                       ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Database  (port 5432)        │
└─────────────────────────────────────────────────────┘
```

## Key decisions

- **Modular monolith** — single deployable unit, but code organised by feature module. Can be split into microservices later if needed.
- **No platform transactions** — no buying/selling between advertisers and customers inside the platform.
- **Revenue model** — advertiser subscription fees only.
- **JWT authentication** — stateless, issued on login, verified on protected routes.
- **S3-compatible file storage** — images uploaded by advertisers stored externally (planned).

## Future phases

See `README.md` at the project root for the full phase roadmap.
