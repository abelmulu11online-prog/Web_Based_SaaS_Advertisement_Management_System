# hooks/

Custom React hooks shared across the application.

Each hook file should:
- Be named `use<HookName>.js`
- Contain a single exported hook
- Have a brief JSDoc comment describing its purpose

## Planned hooks (future phases)

| Hook | Purpose |
|------|---------|
| `useAuth.js` | Access current user and auth state |
| `useDebounce.js` | Debounce a value for search inputs |
| `usePagination.js` | Manage page/offset state |
| `useLocalStorage.js` | Read/write to localStorage with state sync |
