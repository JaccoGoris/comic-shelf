# Claude Instructions for Comic Shelf

## UI Framework

- **Always use [Mantine v8](https://mantine.dev/)** for all UI components — never use plain HTML elements for UI (no `<button>`, `<input>`, `<select>`, `<table>`, etc.).
- Use Mantine components: `Button`, `TextInput`, `Select`, `Table`, `Card`, `Badge`, `Alert`, `Modal`, `Pagination`, `Loader`, `Skeleton`, etc.
- Use **Mantine style props** (e.g., `mt="md"`, `p="lg"`, `c="dimmed"`) and `createStyles` / CSS Modules only when Mantine style props are insufficient. **Do not use SCSS modules.**
- Always prefer npm over pnpm for CLI commands to ensure consistent environment

## Theme & Dark Mode

- The app uses `MantineProvider` with `defaultColorScheme="auto"` (follows OS preference) and a manual toggle in the header.
- **Primary color is `violet`** — configured in the theme via `createTheme({ primaryColor: 'violet' })`.
- Always ensure components look correct in both light and dark mode. Use Mantine color tokens (e.g., `color="dimmed"`, `color="red"`) rather than hardcoded hex values.
- Never hardcode light-only colors like `#fff`, `#fafafa`, `#333`. Let Mantine's color scheme handle backgrounds and text colors.

## Mantine Packages in Use

| Package                  | Purpose                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `@mantine/core`          | Core components                                                                                             |
| `@mantine/hooks`         | Utility hooks                                                                                               |
| `@mantine/notifications` | Toast notifications for user feedback                                                                       |
| `@mantine/modals`        | Confirm dialogs (e.g., delete confirmation) — use `modals.openConfirmModal()` instead of `window.confirm()` |
| `@mantine/dropzone`      | File upload via drag-and-drop                                                                               |
| `@tabler/icons-react`    | Icons (Mantine's recommended icon set)                                                                      |

## Component Patterns

- **Layout**: Uses `AppShell` with `AppShell.Header` and `AppShell.Main`.
- **Navigation**: Use `Button` with `component={Link}` from react-router-dom for nav links.
- **Dark mode toggle**: `ActionIcon` in the header using `useMantineColorScheme()` + `useComputedColorScheme()`.
- **Forms**: Use Mantine form components (`TextInput`, `Select`, `FileInput`, `Dropzone`).
- **Feedback**: Use `notifications.show()` for toast messages, `Alert` for inline messages.
- **Confirmations**: Use `modals.openConfirmModal()` for destructive actions.
- **Loading states**: Use `Loader` or `Skeleton` components.
- **Lists/Grids**: Use `SimpleGrid` for responsive grid layouts, `Card` for items.
- **Buttons**: Use `CSButton` from `apps/web/src/app/components/cs-button.tsx` for all action and form buttons.
  Defaults to `justify="space-between"`, `miw={160}` and the icon in `rightSection` prop. Only use plain Mantine `Button` for
  back/navigation links (`variant="subtle"`), icon-only buttons, or `size="xs"` small buttons.

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

## Database Schema Changes

When adding a new DB field, update the backup system to keep it schema-resilient:

1. Add field to `BackupComicDto` in `libs/shared-types/src/index.ts`
2. Add to export mapping in `apps/api/src/backup/backup.service.ts` (`exportAll`)
3. Add to `scalarData` import mapping in `backup.service.ts` (`importBackup`)
4. Bump `CURRENT_BACKUP_VERSION` in `apps/api/src/backup/backup-migrations.ts`
5. Add a `migrateVNtoVN1()` function with sensible defaults for missing data
6. Register the migration function in the `migrations` map in `backup-migrations.ts`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
