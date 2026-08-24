# Advertising Platform

A web-based subscription advertising platform where individuals and companies can advertise products, services, skills, businesses, jobs, and other listings.

## Project Overview

Advertisers subscribe to a plan, create listings with details, images, contact info, and GPS location, and manage everything from a dashboard. Customers browse, search, and contact advertisers directly. Revenue comes from advertiser subscription fees.

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React.js + Vite                   |
| Backend     | Node.js + Express.js              |
| Database    | PostgreSQL                        |
| Auth        | JWT (planned)                     |
| File Storage| S3-compatible (planned)           |
| DevOps      | Docker + Docker Compose (planned) |

## Repository Structure

```
advertising-platform/
├── frontend/     # React + Vite SPA
├── backend/      # Node.js + Express API (modular monolith)
├── database/     # Migrations, seeds, and schema definitions
├── docs/         # Architecture decisions, API docs, guides
├── infra/        # Docker, CI/CD, environment configs
├── tests/        # Integration and end-to-end tests
├── .gitignore
├── README.md
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 15
- npm >= 9

### Frontend (development)
```bash
cd frontend
npm install
npm run dev
```

### Backend (development)
```bash
cd backend
npm install
npm run dev
```

## Development Team

Three-person team. See `docs/` for architecture decisions and contribution guidelines.

## Phases

- **Phase 1** ✅ Project structure and React frontend setup
- **Phase 2** — Backend API foundation
- **Phase 3** — Database schema design
- **Phase 4** — Authentication
- **Phase 5** — Advertisement features
- **Phase 6** — Subscription and payments
- **Phase 7** — Maps and GPS
- **Phase 8** — Admin dashboard
- **Phase 9** — Deployment and Docker
