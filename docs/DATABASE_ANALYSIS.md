# Database Analysis: SQLite vs PostgreSQL on Koyeb

*Analysis Date: 2025-11-26*

## Executive Summary

**Decision: Stay with PostgreSQL**

The migration effort and risks outweigh the marginal cost benefits. Koyeb's SQLite options aren't production-ready, and alternatives like Turso don't provide enough cost savings to justify the migration at this stage.

---

## Current Setup

- **Database:** PostgreSQL with Prisma 7.x (`@prisma/adapter-pg`)
- **Hosting:** Koyeb managed PostgreSQL
- **Schema:** 18 tables, ~500 lines, fully portable (no PostgreSQL-specific features)
- **Free Tier:** 1GB storage, 50 active hours/month, auto-sleeps after 5 min

---

## Options Evaluated

### Option 1: Raw SQLite with Koyeb Volumes

**Pros:**
- Simpler architecture (single file database)
- Faster local development (no Docker needed)
- No managed database cost

**Cons (Critical Issues):**
- Volumes are "public preview - only suitable for testing" per Koyeb docs
- No redundancy - bound to single machine, hardware failure = data loss
- Scale of 1 only - cannot horizontally scale the app
- Cannot use free/eco instances - volumes require paid instance types
- Max 10GB hard limit during preview
- Regions limited to Washington, D.C. and Frankfurt only

**Verdict: Not recommended for production**

---

### Option 2: SQLite + Litestream (Backup to S3)

Litestream continuously replicates SQLite to object storage (S3/Backblaze).

**Pros:**
- More resilient than raw volumes
- Point-in-time recovery possible

**Cons:**
- Complex setup (bundling Litestream, managing S3)
- Still single-writer limitation
- Still has all Koyeb Volume limitations
- Additional S3 costs

**Verdict: Better but still risky for production**

---

### Option 3: Turso (Distributed SQLite)

Turso is a hosted libSQL (SQLite fork) with global edge replication.

**Free Tier:**
- 5GB storage (free forever, no credit card)
- 500M rows read/month
- 10M rows written/month
- 500 databases
- No cold starts - always responsive
- Global edge replicas

**Pros:**
- Production-ready (not preview/beta)
- Generous free tier - likely enough for early stage
- Prisma support via `@prisma/adapter-libsql`
- Global edge - fast reads everywhere
- Easy backups - managed by Turso
- Similar migration pattern to current Prisma adapter setup

**Cons:**
- Another external service to manage
- Write latency to primary (reads from edge)
- Less mature ecosystem than PostgreSQL
- FTS5 available but less powerful than PostgreSQL FTS

**Verdict: If you want SQLite, this is the way**

---

### Option 4: Stay with Koyeb PostgreSQL (Current)

**Free Tier:**
- 1GB storage free
- 50 active hours/month free
- Auto-sleeps after 5 min inactivity (cold starts)
- $0.10/GB for reads/writes beyond free tier

**Pros:**
- Already working - no migration needed
- Managed & reliable - not preview
- Best FTS - PostgreSQL has excellent full-text search
- Familiar - standard PostgreSQL ecosystem
- Horizontal scaling - when needed

**Cons:**
- Cold starts (5 min sleep)
- 1GB limit on free tier (less than Turso's 5GB)
- Database costs if you exceed free tier

---

## Cost Comparison

| Option | Free Tier Storage | Monthly Cost (Paid) | Notes |
|--------|------------------|---------------------|-------|
| Koyeb PostgreSQL | 1GB | ~$7/mo always-on | Current setup |
| Turso | 5GB | $5/mo (Developer) | Best SQLite option |
| Raw SQLite + Volume | N/A | ~$5-10/mo instance | Not recommended |

---

## Full-Text Search Comparison

FTS is mentioned as a future requirement in the roadmap.

| Database | FTS Capability |
|----------|---------------|
| **PostgreSQL** | Excellent - GIN indexes, tsvector, ranking, stemming, multiple languages |
| **SQLite/Turso** | FTS5 - good but simpler, less flexible ranking |

PostgreSQL's FTS is significantly more powerful for advanced search features.

---

## Migration Effort (If Moving to Turso)

If a migration were undertaken:

1. Update Prisma adapter: `@prisma/adapter-pg` → `@prisma/adapter-libsql`
2. Update ~40+ files with Prisma client imports
3. Regenerate Prisma client
4. Data migration from PostgreSQL to Turso
5. Update CI/CD and environment variables
6. Test all database operations

**Estimated effort:** 1-2 days of work plus testing

---

## Recommendation

**Stay with PostgreSQL** for the following reasons:

1. **Already working** - migration has cost (time, risk)
2. **Volumes aren't production-ready** - Koyeb's own docs say so
3. **Future FTS** - PostgreSQL's full-text search is much better
4. **Cost is similar** - Turso's free tier is generous, but so is Koyeb's
5. **Koyeb PostgreSQL will improve** - they're adding larger instances

**Revisit this decision if:**
- Cold starts become a user-impacting problem
- Storage exceeds 1GB significantly
- Koyeb PostgreSQL costs climb unexpectedly

The schema is portable - migration remains possible later without database-specific rewrites.

---

## Sources

- [Koyeb Volumes Documentation](https://www.koyeb.com/docs/reference/volumes)
- [Koyeb PostgreSQL Pricing](https://www.koyeb.com/blog/koyeb-serverless-postgres-pricing)
- [Koyeb Databases Overview](https://www.koyeb.com/docs/databases)
- [Turso Pricing](https://turso.tech/pricing)
- [Koyeb Uptime Kuma Example (Litestream)](https://github.com/koyeb/example-uptime-kuma)
