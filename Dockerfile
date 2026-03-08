# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://prisma:prisma@localhost:5432/prisma
ENV NX_DAEMON=false
RUN npx prisma generate --schema ./libs/db/prisma/schema.prisma
RUN npx nx build api --configuration=production
RUN npx nx build web

# Stage 3: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy webpack-generated dist (includes generated package.json)
COPY --from=build /app/apps/api/dist/ ./

# Install production runtime deps from generated package.json
RUN npm ci --omit=dev

# Install prisma CLI for migrations
RUN npm install prisma --no-save

# Copy Prisma schema + migrations (needed for migrate deploy)
COPY --from=build /app/libs/db/prisma/ ./prisma/

# Copy Prisma generated client and query engine from build stage
COPY --from=build /app/node_modules/.prisma/ ./node_modules/.prisma/

# Copy built frontend static files
COPY --from=build /app/apps/web/dist/ ./public/

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV FRONTEND_DIST_PATH=/app/public
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
