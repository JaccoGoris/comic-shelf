# Environment Variables

## Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL password (Docker) |
| `DB_PORT` | No | `5432` | PostgreSQL port |

## API

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | API server port |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `JWT_EXPIRATION` | No | `7d` | JWT token TTL |

## Metron

| Variable | Required | Default | Description |
|---|---|---|---|
| `METRON_USERNAME` | No | — | Metron API username |
| `METRON_PASSWORD` | No | — | Metron API password |
| `METRON_API_BASE_URL` | No | `https://metron.cloud` | Metron API base URL |

## OIDC

| Variable | Required | Default | Description |
|---|---|---|---|
| `OIDC_ISSUER` | No | — | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | No | — | OIDC client ID |
| `OIDC_CLIENT_SECRET` | No | — | OIDC client secret |
| `OIDC_REDIRECT_URI` | No | — | OIDC callback URL |
