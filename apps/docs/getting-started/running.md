# Running the App

## Start Everything

```bash
npm run dev
```

This starts:
- **PostgreSQL** via Docker Compose
- **NestJS API** on `http://localhost:3000`
- **Vite web app** on `http://localhost:4200`

## First-Time Setup

On first run, the app will automatically guide you through creating the admin account.

## Individual Services

```bash
# API only
npm exec nx serve api

# Web app only
npm exec nx serve web

# Docs site
npm exec nx serve docs
```
