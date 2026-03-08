#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy --schema ./prisma/schema.prisma
echo "Starting Comic Shelf..."
exec node main.js
