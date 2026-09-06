# context/

React Context providers for global state that doesn't belong in a server cache (TanStack Query).

Use Context for:
- Current authenticated user session
- UI theme / locale preferences
- Notification/toast state

Do NOT use Context as a general data cache — use TanStack Query for all server data.

## Planned contexts (future phases)

| File | Purpose |
|------|---------|
| `AuthContext.jsx` | Current user session, login/logout helpers |
| `NotificationContext.jsx` | App-wide toast/alert messages |
