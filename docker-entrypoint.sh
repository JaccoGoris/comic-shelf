#!/bin/sh
set -e

# Build DATABASE_URL from individual parts if not already set (mirrors apps/api/src/main.ts)
if [ -z "$DATABASE_URL" ]; then
  POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  POSTGRES_USER="${POSTGRES_USER:-comic_shelf}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-comic_shelf}"
  POSTGRES_DB="${POSTGRES_DB:-comic_shelf}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
fi

echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting Comic Shelf..."
exec node main.js
