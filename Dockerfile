FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    ALARKIVE_DATA_DIR=/app/data \
    ALARKIVE_ASSETS_DIR=/app/data/assets
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs alarkive \
    && mkdir -p /app/data /app/scripts /app/drizzle \
    && chown -R alarkive:nodejs /app
COPY --from=builder --chown=alarkive:nodejs /app/.next/standalone ./
COPY --from=builder --chown=alarkive:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=alarkive:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=alarkive:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=alarkive:nodejs /app/scripts/docker-migrate.mjs /app/scripts/docker-backup.mjs /app/scripts/docker-restore.mjs /app/scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x /app/scripts/docker-entrypoint.sh
USER alarkive
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
