# Basis — single-container deployment for Railway / Render / Fly.io
# Debian-slim (glibc) is used so better-sqlite3's prebuilt native binary
# loads without a musl recompile.

FROM node:22-slim AS builder
WORKDIR /app
# Build tools are a safety net in case a better-sqlite3 prebuild is unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# libstdc++ etc. are already present in slim; copy the built app + deps.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./

# SQLite lives here — mount a persistent volume at /app/data to keep data
# across deploys (see DEPLOYMENT.md). Without a volume it is ephemeral and
# the demo account is simply re-seeded on each boot.
ENV DATABASE_PATH=/app/data/basis.db
VOLUME /app/data

# Hosts inject $PORT; default to 3000 for local `docker run`.
ENV PORT=3000
EXPOSE 3000

# Migrations run automatically on boot too, but we run them explicitly first
# so a failure surfaces before the server claims to be healthy. Seed is
# idempotent. The app fails closed if SESSION_SECRET is unset in production.
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx tsx scripts/seed.ts && npx next start -H 0.0.0.0 -p ${PORT}"]
