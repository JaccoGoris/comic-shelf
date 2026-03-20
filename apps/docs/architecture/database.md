# Database

Comic Shelf uses **PostgreSQL 16** with **Prisma 7** as the ORM.

## Schema Location

The Prisma schema lives at `libs/db/prisma/schema.prisma`.

## Key Models

- **`Comic`** — the core entity; stores title, issue number, series, publisher, cover, UPC, read status, etc.
- **`Series`** — a tracked series (name, publisher, Metron ID)
- **`User`** — auth user with role (`ADMIN` or `USER`)

## Running Migrations

```bash
npm run db:migrate
```

This runs `prisma migrate dev` against your local database.

## Generating the Client

```bash
npx prisma generate --schema=libs/db/prisma/schema.prisma
```

The generated client is imported from `@comic-shelf/db` in backend services.
