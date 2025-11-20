# ----------------------------
# Base stage: Node.js setup
# ----------------------------
FROM node:22-slim AS base
WORKDIR /app

# Install runtime deps for Prisma / SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ----------------------------
# Deps stage: install dependencies
# ----------------------------
FROM base AS deps

# Install build dependencies for native modules (oniguruma)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ----------------------------
# Builder stage: build app & generate Prisma client
# ----------------------------
FROM base AS builder
WORKDIR /app

# Copy deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Capture git commit info during build
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
ARG GIT_COMMIT_SHA
ARG GIT_COMMIT_MESSAGE
ARG BUILD_TIME
ENV NEXT_PUBLIC_GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV NEXT_PUBLIC_GIT_COMMIT_MESSAGE=${GIT_COMMIT_MESSAGE}
ENV NEXT_PUBLIC_BUILD_TIME=${BUILD_TIME}
LABEL git-commit-sha=${GIT_COMMIT_SHA}
LABEL git-commit-message=${GIT_COMMIT_MESSAGE}
LABEL build-time=${BUILD_TIME}

# Dummy DATABASE_URL at build time for Prisma
ENV DATABASE_URL="file:/app/data/dummy.db"

# Generate Prisma client first
RUN corepack enable pnpm && pnpm prisma generate

# Build app
RUN pnpm build

# ----------------------------
# Runner stage: production image
# ----------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install sudo for permission fixes and enable pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable pnpm

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    echo "nextjs ALL=(ALL) NOPASSWD: /bin/chown, /bin/chmod" >> /etc/sudoers

# Copy Next.js standalone output (most dependencies bundled)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy pnpm store and create symlinks for Prisma packages
# (marked as serverExternalPackages so not bundled by Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm
RUN mkdir -p node_modules/@prisma node_modules/@libsql node_modules/prisma && \
    ln -s ../.pnpm/@prisma+client@7.0.0_prisma@7.0.0_@types+react@19.2.2_react-dom@19.2.0_react@19.2.0__re_f27ab0a588f3a3c93c5aed3dd3fe1042/node_modules/@prisma/client node_modules/@prisma/client && \
    ln -s ../.pnpm/@prisma+adapter-libsql@7.0.0_@libsql+client@0.14.1_@prisma+client@7.0.0/node_modules/@prisma/adapter-libsql node_modules/@prisma/adapter-libsql && \
    ln -s ../.pnpm/@libsql+client@0.14.1/node_modules/@libsql/client node_modules/@libsql/client && \
    ln -s ../.pnpm/prisma@7.0.0/node_modules/prisma node_modules/prisma

# Create persistent directories (uploads + SQLite)
RUN mkdir -p /app/data /app/uploads && \
    chown -R nextjs:nodejs /app/data /app/uploads && \
    chmod -R 755 /app/data /app/uploads

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh && chown nextjs:nodejs /app/start.sh

EXPOSE 3000

# Switch to non-root user
USER nextjs

CMD ["/app/start.sh"]
