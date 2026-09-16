# Frontend — Advertising Platform

React + Vite single-page application.

## Tech

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19 | UI library |
| react-dom | ^19 | DOM renderer |
| react-router-dom | ^7 | Client-side routing |
| axios | latest | HTTP client |
| @tanstack/react-query | ^5 | Server state / data fetching |
| vite | ^8 | Build tool + dev server |
| @vitejs/plugin-react | ^6 | React HMR support |

## Scripts

```bash
npm run dev       # Start dev server on http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # Run oxlint
```

## Path aliases

All `src/` subdirectories are aliased for clean imports:

```js
import apiClient from '@/services/apiClient'
import { ROUTES } from '@/constants'
```

## Folder guide

| Folder | Purpose |
|--------|---------|
| `src/components/ui/` | Pure UI primitives (no business logic) |
| `src/components/layout/` | Header, footer, nav, page wrappers |
| `src/components/common/` | Shared composite components |
| `src/pages/` | Top-level route page components |
| `src/features/` | Feature modules (auth, ads, subscriptions…) |
| `src/services/` | Axios API client and per-resource API calls |
| `src/hooks/` | Shared custom hooks |
| `src/context/` | React Context providers |
| `src/routes/` | Route definitions and protected route wrappers |
| `src/utils/` | Pure helper functions |
| `src/constants/` | App-wide constants and enums |
| `src/types/` | JSDoc type definitions |
| `src/assets/` | Images, icons, fonts |

## Environment variables

Create a `.env.local` file in this directory (never commit it):

```
VITE_API_BASE_URL=http://localhost:3000/api
```
