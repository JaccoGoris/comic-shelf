# Frontend Architecture

The frontend is built with **React 19**, **Vite**, and **Mantine v8**.

## Key Patterns

### Component Library
All UI uses Mantine components — no raw HTML `<button>`, `<input>`, or `<table>` elements. Primary color is `violet`.

### Routing
React Router v6 handles client-side routing. Auth-protected routes use wrapper components:
- `RequireAuth` — redirects to login if not authenticated
- `RequireAdmin` — redirects if not admin
- `RequireSetup` — redirects to `/setup` if no admin exists

### State & Data Fetching
Data fetching uses axios with a global client (`apps/web/src/api/client.ts`) configured with `withCredentials: true` for cookie-based auth. A 401 interceptor handles session expiry.

### Forms
Mantine's form utilities with `mantine-form-zod-resolver` for Zod schema validation.

### Notifications & Confirmations
- **Toasts**: `notifications.show()` from `@mantine/notifications`
- **Confirmations**: `modals.openConfirmModal()` from `@mantine/modals`

## File Structure

```
apps/web/src/
├── api/           # axios client, API functions
├── app/
│   ├── components/ # shared components (CSButton, etc.)
│   └── pages/     # route-level page components
├── auth/          # auth context, route guards
└── main.tsx       # MantineProvider, AuthProvider, router
```
