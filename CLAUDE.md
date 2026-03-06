# Claude Instructions for Comic Shelf

## UI Framework

- **Always use [Mantine v8](https://mantine.dev/)** for all UI components — never use plain HTML elements for UI (no `<button>`, `<input>`, `<select>`, `<table>`, etc.).
- Use Mantine components: `Button`, `TextInput`, `Select`, `Table`, `Card`, `Badge`, `Alert`, `Modal`, `Pagination`, `Loader`, `Skeleton`, etc.
- Use **Mantine style props** (e.g., `mt="md"`, `p="lg"`, `c="dimmed"`) and `createStyles` / CSS Modules only when Mantine style props are insufficient. **Do not use SCSS modules.**

## Theme & Dark Mode

- The app uses `MantineProvider` with `defaultColorScheme="auto"` (follows OS preference) and a manual toggle in the header.
- **Primary color is `violet`** — configured in the theme via `createTheme({ primaryColor: 'violet' })`.
- Always ensure components look correct in both light and dark mode. Use Mantine color tokens (e.g., `color="dimmed"`, `color="red"`) rather than hardcoded hex values.
- Never hardcode light-only colors like `#fff`, `#fafafa`, `#333`. Let Mantine's color scheme handle backgrounds and text colors.

## Mantine Packages in Use

| Package | Purpose |
|---|---|
| `@mantine/core` | Core components |
| `@mantine/hooks` | Utility hooks |
| `@mantine/notifications` | Toast notifications for user feedback |
| `@mantine/modals` | Confirm dialogs (e.g., delete confirmation) — use `modals.openConfirmModal()` instead of `window.confirm()` |
| `@mantine/dropzone` | File upload via drag-and-drop |
| `@tabler/icons-react` | Icons (Mantine's recommended icon set) |

## Component Patterns

- **Layout**: Uses `AppShell` with `AppShell.Header` and `AppShell.Main`.
- **Navigation**: Use `Button` with `component={Link}` from react-router-dom for nav links.
- **Dark mode toggle**: `ActionIcon` in the header using `useMantineColorScheme()` + `useComputedColorScheme()`.
- **Forms**: Use Mantine form components (`TextInput`, `Select`, `FileInput`, `Dropzone`).
- **Feedback**: Use `notifications.show()` for toast messages, `Alert` for inline messages.
- **Confirmations**: Use `modals.openConfirmModal()` for destructive actions.
- **Loading states**: Use `Loader` or `Skeleton` components.
- **Lists/Grids**: Use `SimpleGrid` for responsive grid layouts, `Card` for items.

## Tech Stack

- **Frontend**: React 19, Vite, Mantine v8, react-router-dom v6
- **Backend**: NestJS 11, Prisma 6
- **Database**: PostgreSQL 16 (Docker)
- **Monorepo**: Nx
- **Shared types**: `@comic-shelf/shared-types` (libs/shared-types)

## Metron API Integration

- The app integrates with the [Metron Comic Database API](https://metron.cloud) for adding comics by UPC lookup.
- **Authentication**: HTTP Basic Auth — credentials are stored in `.env` as `METRON_USERNAME` and `METRON_PASSWORD`.
- **Rate limits**: The Metron API enforces **20 requests per minute** and **5,000 requests per day**. The backend `MetronService` has an in-memory rate limiter to respect these limits. Never bypass or disable the rate limiter.
- **Base URL**: Configured via `METRON_API_BASE_URL` in `.env` (default: `https://metron.cloud`).
- All Metron API calls are proxied through the backend — never call the Metron API directly from the frontend.
