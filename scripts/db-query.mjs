#!/usr/bin/env node
/**
 * Simple database query utility using pg
 * Usage: node scripts/db-query.mjs "SELECT * FROM users LIMIT 5"
 */

import pg from 'pg'
import { config } from 'dotenv'

config() // Load .env file

const connectionString = process.env.DATABASE_URL

const query = process.argv[2]

if (!query) {
  console.error('Usage: node scripts/db-query.mjs "SELECT * FROM users LIMIT 5"')
  process.exit(1)
}

const client = new pg.Client({ connectionString })

try {
  await client.connect()
  const result = await client.query(query)

  if (result.rows.length === 0) {
    console.log('No rows returned')
  } else {
    console.table(result.rows)
  }
} catch (error) {
  console.error('Query failed:', error.message)
  process.exit(1)
} finally {
  await client.end()
}
