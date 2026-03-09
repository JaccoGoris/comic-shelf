#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting Comic Shelf..."
exec node main.js
