# Docker Deployment

Comic Shelf ships with Docker Compose configurations for both development and production.

## Development

```bash
docker compose up -d
```

Starts PostgreSQL, the NestJS API, and the Vite dev server with hot reload.

## Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

The production compose file uses the pre-built Docker image from GitHub Container Registry.

## Image

The Docker image is published to `ghcr.io/jaccogoris/comic-shelf` on every release via GitHub Actions.

## Ports

| Service | Port |
|---|---|
| Web app + API | `3000` |
| PostgreSQL | `5432` (not exposed in production) |
