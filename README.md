# Comic Shelf

A full-stack comic book collection manager built with NestJS, React, Prisma, and PostgreSQL — orchestrated by Nx.

## Architecture

| Layer        | Tech                   | Port             |
| ------------ | ---------------------- | ---------------- |
| **API**      | NestJS 11, Prisma 6    | `localhost:3000` |
| **Web**      | React 19, Vite 7       | `localhost:4200` |
| **Database** | PostgreSQL 16 (Docker) | `localhost:5432` |

```
apps/
  api/         → NestJS REST API
  web/         → React SPA
libs/
  db/          → Prisma schema, generated client, PrismaService
  shared-types/→ TypeScript interfaces shared between API & web
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Docker](https://www.docker.com/) (for PostgreSQL)
- npm (comes with Node.js)

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Start the database

```sh
npm run db:up
# or: docker compose up -d
```

This starts a PostgreSQL 16 container. Data is stored in a Docker named volume (`comic_shelf_data`), so it **persists across restarts**.

### 3. Generate Prisma client & run migrations

```sh
npm run db:generate
npm run db:migrate
```

### 4. Start the applications

```sh
# Start both API and web:
npm start

# Or start individually:
npm run start:api   # http://localhost:3000/api
npm run start:web   # http://localhost:4200
```

### 5. Import your comic collection

1. Open `http://localhost:4200/import` in your browser
2. Upload your `all-comics.json` file
3. Wait for the import to complete — duplicates are skipped automatically

Or via curl:

```sh
curl -F "file=@/path/to/all-comics.json" http://localhost:3000/api/import
```

## Available Scripts

| Script                | Description                                       |
| --------------------- | ------------------------------------------------- |
| `npm start`           | Start DB + API + Web                              |
| `npm run start:api`   | Start just the API                                |
| `npm run start:web`   | Start just the Web app                            |
| `npm run db:up`       | Start PostgreSQL container                        |
| `npm run db:down`     | Stop PostgreSQL container (data preserved)        |
| `npm run db:reset`    | **Destroy** all data, recreate DB, run migrations |
| `npm run db:studio`   | Open Prisma Studio (data browser)                 |
| `npm run db:migrate`  | Run pending database migrations                   |
| `npm run db:generate` | Regenerate Prisma client                          |

## Data Persistence

PostgreSQL data is stored in a Docker **named volume**. This means:

| Action                                       | Data survives?      |
| -------------------------------------------- | ------------------- |
| Restart app (`nx serve api`)                 | ✅ Yes              |
| Restart container (`docker compose restart`) | ✅ Yes              |
| Stop container (`docker compose down`)       | ✅ Yes              |
| Remove volumes (`docker compose down -v`)    | ❌ No               |
| `npm run db:reset`                           | ❌ No (intentional) |

You only need to re-import after `db:reset` or `docker compose down -v`.

## API Endpoints

### Comics

- `GET /api/comics` — Paginated list with filters (`search`, `publisherId`, `seriesId`, `creatorId`, `characterId`, `genreId`, `read`, `sortBy`, `sortOrder`)
- `GET /api/comics/:id` — Full comic detail with all relations
- `DELETE /api/comics/:id` — Delete a comic

### Import

- `POST /api/import` — Upload a JSON file (multipart form, field: `file`)

### Resources (for filter dropdowns)

- `GET /api/publishers?search=`
- `GET /api/series?search=&publisherId=`
- `GET /api/creators?search=`
- `GET /api/characters?search=`
- `GET /api/genres?search=`
- `GET /api/story-arcs?search=`

## Database Schema

The database is fully normalized:

- **Comic** — all 60 fields from the JSON import, plus parsed price (cents + currency)
- **Publisher** — deduplicated, normalized publisher names
- **Series** — unique per publisher
- **Creator** — linked to comics via role (Writer, Artist, Penciller, etc.)
- **Character** — name + alias parsed from "Iron Man (Tony Stark)" format
- **Genre** — with type (Genre / Subgenre)
- **StoryArc** — linked via join table

## Environment Variables

Copy `.env.example` to `.env` (already done at setup):

```
DATABASE_URL="postgresql://comic_shelf:comic_shelf@localhost:5432/comic_shelf?schema=public"
```

- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
