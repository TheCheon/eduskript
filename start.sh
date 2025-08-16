#!/bin/sh
set -e

echo "Fixing data directory permissions..."

# Fix ownership of the data directory to nextjs user
chown -R nextjs:nodejs /app/data

echo "Starting database migration as nextjs user..."

# Debug: Check migrations directory structure
echo "Debug: Checking migration files..."
find /app/prisma/migrations -name "*.sql" || echo "No migration files found"

# Always ensure database exists with proper schema
echo "Ensuring database schema is up to date..."
su nextjs -s /bin/sh -c "cd /app && npx prisma db push"

echo "Database migration completed. Starting application..."

# Start the application as nextjs user
exec su nextjs -s /bin/sh -c "cd /app && node server.js"