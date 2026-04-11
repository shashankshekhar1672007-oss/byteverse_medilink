FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Production image ──────────────────────────────────────────────────────────
FROM base AS production

ENV NODE_ENV=production
ENV PORT=5000

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S medilink -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=medilink:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown medilink:nodejs logs

USER medilink

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
