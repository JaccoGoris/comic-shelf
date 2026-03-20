# Installation

Comic Shelf is designed to be self-hosted using Docker Compose. All you need is Docker — no Node.js or build tools required.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)

## Quick Start

### 1. Create a `docker-compose.yml`

```yaml
services:
  app:
    image: ghcr.io/jaccogoris/comic-shelf:latest
    container_name: comic-shelf
    restart: unless-stopped
    ports:
      - '${PORT:-3000}:3000'
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_USER: ${POSTGRES_USER:-comic_shelf}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-comic_shelf}
      POSTGRES_DB: ${POSTGRES_DB:-comic_shelf}
      PORT: '3000'
      JWT_SECRET: ${JWT_SECRET:-changeme}
      JWT_EXPIRATION: ${JWT_EXPIRATION:-7d}
      METRON_USERNAME: ${METRON_USERNAME:-}
      METRON_PASSWORD: ${METRON_PASSWORD:-}
      METRON_API_BASE_URL: ${METRON_API_BASE_URL:-https://metron.cloud}
      OIDC_ISSUER_URL: ${OIDC_ISSUER_URL:-}
      OIDC_CLIENT_ID: ${OIDC_CLIENT_ID:-}
      OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET:-}
      OIDC_REDIRECT_URI: ${OIDC_REDIRECT_URI:-}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s

  postgres:
    image: postgres:16-alpine
    container_name: comic-shelf-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-comic_shelf}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-comic_shelf}
      POSTGRES_DB: ${POSTGRES_DB:-comic_shelf}
    volumes:
      - comic_shelf_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-comic_shelf}']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  comic_shelf_data:
```

### 2. Create a `.env`

```ini
# ── Database ──────────────────────────────────────────────
POSTGRES_USER=comic_shelf
POSTGRES_PASSWORD=change-me
POSTGRES_DB=comic_shelf

# ── Auth ──────────────────────────────────────────────────
# Generate a strong secret, e.g.: openssl rand -hex 32
JWT_SECRET=change-me-to-a-long-random-secret
JWT_EXPIRATION=7d

# ── Metron API (optional) ─────────────────────────────────
# Register at https://metron.cloud to enable UPC barcode lookups
METRON_USERNAME=
METRON_PASSWORD=

# ── OIDC (optional) ───────────────────────────────────────
# Leave OIDC_CLIENT_ID empty to disable OIDC login
OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=
```

### 3. Start the stack

```bash
docker compose up -d
```

The app will be available at `http://localhost:3000`. On first run, the app will automatically guide you through creating the admin account.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_USER` | No | `comic_shelf` | PostgreSQL username |
| `POSTGRES_PASSWORD` | **Yes** | — | PostgreSQL password |
| `POSTGRES_DB` | No | `comic_shelf` | PostgreSQL database name |
| `PORT` | No | `3000` | Port the app listens on |
| `JWT_SECRET` | **Yes** | — | Secret used to sign JWTs — use a long random string |
| `JWT_EXPIRATION` | No | `7d` | How long login sessions last |
| `METRON_USERNAME` | No | — | Metron API username (for UPC lookup) |
| `METRON_PASSWORD` | No | — | Metron API password (for UPC lookup) |
| `METRON_API_BASE_URL` | No | `https://metron.cloud` | Metron API base URL |
| `OIDC_ISSUER_URL` | No | — | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | No | — | OIDC client ID (leave empty to disable OIDC) |
| `OIDC_CLIENT_SECRET` | No | — | OIDC client secret |
| `OIDC_REDIRECT_URI` | No | — | OIDC callback URL |

See [Environment Variables](/deployment/environment-variables) for the full reference.
