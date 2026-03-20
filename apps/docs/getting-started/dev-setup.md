# Development Setup

## Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/comic_shelf` |
| `POSTGRES_PASSWORD` | DB password for Docker | `postgres` |
| `JWT_SECRET` | Secret for signing JWTs | *(required)* |
| `METRON_USERNAME` | Metron API username | *(required for UPC lookup)* |
| `METRON_PASSWORD` | Metron API password | *(required for UPC lookup)* |

See [Environment Variables](/deployment/environment-variables) for the full reference.

## Start the Database

```bash
docker compose up -d db
```

## Run Migrations

```bash
npm run db:migrate
```
