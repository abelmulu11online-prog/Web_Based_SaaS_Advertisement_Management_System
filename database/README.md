# Database — Advertising Platform

PostgreSQL database structure. Schema and migrations will be designed in Phase 3.

## Folder structure

```
database/
├── migrations/   # Versioned SQL migration files (up + down)
├── seeds/        # Seed data for development and testing
└── schema/       # Reference SQL schema definitions (not run directly)
```

## Planned tables (Phase 3)

| Table | Purpose |
|-------|---------|
| `users` | Advertiser and customer accounts |
| `roles` | User roles (advertiser, admin) |
| `subscription_plans` | Available plan tiers and pricing |
| `subscriptions` | User ↔ plan membership with period |
| `advertisements` | Ad listings with status |
| `ad_images` | Images attached to ads |
| `ad_categories` | Category taxonomy |
| `locations` | GPS coordinates and address data |
| `notifications` | In-app notification records |
| `analytics_events` | View/click events per ad |

## Migration naming convention

```
YYYYMMDDHHMMSS_description.sql
e.g. 20260101000001_create_users_table.sql
```

## Tools (Phase 3)

Database migrations will use **node-pg-migrate** or raw SQL scripts.
