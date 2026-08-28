# tests/

Top-level tests directory for integration and end-to-end tests that span both frontend and backend.

Unit tests for each layer live alongside the code they test:
- Backend unit tests → `backend/tests/`
- Frontend component tests → inside each `features/` or `components/` folder (future)

## Folders

| Folder | Purpose |
|--------|---------|
| `integration/` | API integration tests — test backend routes end-to-end against a real database |
| `e2e/` | End-to-end browser tests (Playwright or Cypress — planned) |

Tests will be implemented progressively alongside each feature phase.
