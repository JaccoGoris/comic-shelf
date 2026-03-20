# API Architecture

The API is built with **NestJS 11** and follows NestJS module conventions.

## Modules

| Module | Path | Purpose |
|---|---|---|
| `AppModule` | `apps/api/src/app/` | Root module — wires everything together |
| `AuthModule` | `apps/api/src/auth/` | JWT auth, OIDC, guards, strategies |
| `UsersModule` | `apps/api/src/users/` | User CRUD (admin only) |
| `ComicsModule` | `apps/api/src/comics/` | Comic CRUD, UPC lookup |
| `BackupModule` | `apps/api/src/backup/` | Export/import |
| `MetronModule` | `apps/api/src/metron/` | Metron API proxy |

## Guards

Guards are registered globally in `AuthModule`:

- **`JwtAuthGuard`** — validates the `access_token` cookie on every request
- **`RolesGuard`** — enforces `@Roles()` decorator requirements

Use `@Public()` to bypass JWT auth on public endpoints.

## Database Access

All database access goes through Prisma, configured in `libs/db`. Services inject `PrismaService` for queries.
