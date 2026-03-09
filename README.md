# Comic Shelf

A self-hosted comic book collection manager. Track your comics, sync metadata from [Metron](https://metron.cloud), and browse your collection from any device.

## Features

- Password-protected with user accounts (admin + user roles)
- Import your comic collection from a JSON export
- Browse, filter, and search by publisher, series, creator, character, genre, and story arc
- Sync cover images and metadata from the Metron Comic Database
- Mark comics as read, manage wishlists and collection status
- Edit comic details including condition, purchase info, and personal ratings
- Dark mode support

---

## Self-Hosting with Docker Compose

No need to clone the repo — the app is published as a Docker image. Create a `docker-compose.yml`:

```yaml
services:
  comic-shelf:
    image: ghcr.io/jaccogoris/comic-shelf:latest
    container_name: comic-shelf
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      POSTGRES_HOST: comic-shelf-postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      JWT_SECRET: ${JWT_SECRET:-replace-with-a-long-random-secret}
      JWT_EXPIRATION: 7d
      # Optional — needed for Metron metadata sync
      METRON_USERNAME: ${METRON_USERNAME:-""}
      METRON_PASSWORD: ${METRON_PASSWORD:-""}
    depends_on:
      comic-shelf-postgres:
        condition: service_healthy

  comic-shelf-postgres:
    image: postgres:16-alpine
    container_name: comic-shelf-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-comic_shelf}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      POSTGRES_DB: ${POSTGRES_DB:-comic_shelf}
    volumes:
      - comic_shelf_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-comic_shelf}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  comic_shelf_data:
```

Then start it:

```sh
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). On first launch you'll be redirected to `/setup` to create your admin account.

> **Before going live:** replace `changeme` with strong passwords and generate a real `JWT_SECRET` — e.g. `openssl rand -hex 32`.

Migrations run automatically on startup. Data is persisted in the `comic_shelf_data` Docker volume.

---

## First-Time Setup

Regardless of how you run the app, the first-run flow is the same:

1. Open the app — you'll be redirected to `/setup`
2. Create your admin username and password
3. You're in. Additional users can be managed at `/users` (admin only)

---

## Configuration

| Variable              | Default                   | Required | Description                                                   |
| --------------------- | ------------------------- | -------- | ------------------------------------------------------------- |
| `JWT_SECRET`          | —                         | **Yes**  | Secret key for signing JWT tokens — use a long random string  |
| `JWT_EXPIRATION`      | `7d`                      | No       | How long login sessions last (e.g. `1d`, `7d`, `30d`)        |
| `POSTGRES_PASSWORD`   | `comic_shelf`             | No       | PostgreSQL password                                           |
| `POSTGRES_HOST`       | `postgres`                | No       | PostgreSQL hostname (`postgres` in Docker, `localhost` in dev)|
| `POSTGRES_USER`       | `comic_shelf`             | No       | PostgreSQL username                                           |
| `POSTGRES_DB`         | `comic_shelf`             | No       | PostgreSQL database name                                      |
| `PORT`                | `3000`                    | No       | Host port for the app                                         |
| `DB_PORT`             | `5432`                    | No       | Host port for PostgreSQL (only needed for direct DB access)   |
| `METRON_USERNAME`     | —                         | No       | Metron API username (for metadata sync)                       |
| `METRON_PASSWORD`     | —                         | No       | Metron API password (for metadata sync)                       |
| `METRON_API_BASE_URL` | `https://metron.cloud`    | No       | Metron API base URL                                           |

Metron credentials are only needed if you want to sync metadata or add comics via UPC lookup. Sign up at [metron.cloud](https://metron.cloud).

---

## User Management

- The first user created via `/setup` is always an **Admin**
- Admins can add or remove users at `/users`
- Non-admin users can browse and edit the collection but cannot manage users
- Sessions are stored as HTTP-only cookies (not accessible via JavaScript)

---

## Local Development

**Prerequisites:** Node.js >= 20, Docker

```sh
git clone https://github.com/jaccog/comic-shelf.git
cd comic-shelf
npm install
cp .env.example .env   # fill in values — see .env.example for details
npm run dev            # starts PostgreSQL in Docker + API on :3000 + Web on :4200
```

The dev setup runs the API and frontend as separate processes with hot reload. The web app proxies API requests to `:3000`, so you only need to open [http://localhost:4200](http://localhost:4200).

### Scripts

| Script                | Description                                       |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | Start DB + API + Web (dev mode with hot reload)   |
| `npm run build`       | Build API and Web for production                  |
| `npm run start:api`   | Start just the API                                |
| `npm run start:web`   | Start just the Web app                            |
| `npm run db:up`       | Start PostgreSQL container                        |
| `npm run db:down`     | Stop PostgreSQL container (data preserved)        |
| `npm run db:reset`    | Destroy all data, recreate DB, run migrations     |
| `npm run db:studio`   | Open Prisma Studio (data browser)                 |
| `npm run db:migrate`  | Run pending database migrations                   |
| `npm run db:generate` | Regenerate Prisma client                          |

---

## Tech Stack

- **Frontend:** React 19, Vite, Mantine v8
- **Backend:** NestJS 11, Prisma 6
- **Database:** PostgreSQL 16
- **Monorepo:** Nx

## License

MIT — see [LICENSE](./LICENSE)
