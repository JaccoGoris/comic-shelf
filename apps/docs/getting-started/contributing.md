# Contributing

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **Docker** and **Docker Compose**
- **Git**

## Clone the Repository

```bash
git clone https://github.com/JaccoGoris/comic-shelf.git
cd comic-shelf
```

## Install Dependencies

```bash
npm install
```

This installs all workspace dependencies for the Nx monorepo (API, web app, shared libs).

## Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Key variables for local development:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/comic_shelf` |
| `POSTGRES_PASSWORD` | DB password for Docker | `postgres` |
| `JWT_SECRET` | Secret for signing JWTs | *(required)* |
| `METRON_USERNAME` | Metron API username | *(optional)* |
| `METRON_PASSWORD` | Metron API password | *(optional)* |

## Start the Dev Stack

```bash
npm run dev
```

This starts:
- **PostgreSQL** via Docker Compose
- **NestJS API** on `http://localhost:3000`
- **Vite web app** on `http://localhost:4200`

## Individual Services

```bash
# API only
npm exec nx serve api

# Web app only
npm exec nx serve web

# Docs site
npm exec nx serve docs
```
