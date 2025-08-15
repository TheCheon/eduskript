#!/bin/sh
set -e

echo "Fixing data directory permissions..."

# Fix ownership of the data directory to nextjs user
chown -R nextjs:nodejs /app/data

echo "Starting database migration as nextjs user..."

# Debug: Check migrations directory structure
echo "Debug: Checking migration files..."
find /app/prisma/migrations -name "*.sql" || echo "No migration files found"

# Check if database exists and handle accordingly
if [ -f "/app/data/prod.db" ]; then
    echo "Database exists, attempting to resolve migration state..."
    # Reset migration state and reapply
    su nextjs -s /bin/sh -c "cd /app && npx prisma migrate resolve --applied 0_init || true"
    su nextjs -s /bin/sh -c "cd /app && npx prisma migrate deploy"
else
    echo "Fresh database, creating schema with db push..."
    # For completely fresh database, use db push 
    su nextjs -s /bin/sh -c "cd /app && npx prisma db push"
fi

echo "Database migration completed. Starting application..."

# Start the application as nextjs user
exec su nextjs -s /bin/sh -c "cd /app && node server.js"