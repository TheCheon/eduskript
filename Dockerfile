# Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
# Install pnpm
RUN npm install -g pnpm
WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Builder
FROM node:18-alpine AS builder
# Install pnpm
RUN npm install -g pnpm
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
