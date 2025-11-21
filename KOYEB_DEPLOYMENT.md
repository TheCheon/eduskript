# Koyeb Deployment Guide

This guide will help you deploy Eduskript to Koyeb with PostgreSQL database.

## Prerequisites

- GitHub account with this repository
- Koyeb account (sign up at https://koyeb.com)
- OAuth credentials (GitHub and/or Google)

## Architecture

**Fully European Solution:**
- **Koyeb**: French company, Frankfurt (Germany) data center
- **PostgreSQL**: Koyeb native database in Frankfurt (EU)
- **All-in-one**: App + Database on same platform

## Step 1: Create Koyeb Account

1. Go to https://koyeb.com
2. Click "Sign Up"
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

## Step 2: Create PostgreSQL Database

1. In Koyeb dashboard, click "Databases" in the left menu
2. Click "Create Database"
3. Configure database:
   - **Name**: `eduskript-db` (or your preferred name)
   - **Region**: `Frankfurt (fra)` (EU region)
   - **PostgreSQL Version**: 17 (latest)
   - **Instance Type**:
     - **Free tier**: 0.25 vCPU, 1GB RAM (for testing)
     - **Paid tier**: Small or larger (for production)
   - **Default Database**: Leave as `koyebdb` or customize
4. Click "Create Database"
5. Wait ~2 minutes for provisioning
6. **Copy the connection string** from the database details page
   - Format: `postgresql://user:password@host:5432/dbname`
   - Save this for Step 4

## Step 3: Create Application Service

1. In Koyeb dashboard, click "Services" or "Create Service"
2. Select "GitHub" as deployment method
3. **Connect GitHub**:
   - Click "Connect GitHub"
   - Authorize Koyeb to access your repositories
   - Select this repository (`eduskript`)
4. **Configure Build**:
   - **Branch**: `main` (or your deployment branch)
   - **Builder**: Nixpacks (auto-detected)
   - **Build Command**: Leave empty (uses package.json scripts)
   - **Run Command**: Leave empty (uses `npm start` from package.json)
5. **Configure Instance**:
   - **Region**: `Frankfurt (fra)` (same as database for low latency)
   - **Instance Type**:
     - **Free tier**: Eco (for testing - will sleep after inactivity)
     - **Paid tier**: Nano or Small (for production)
6. **Don't click Deploy yet** - we need to add environment variables first

## Step 4: Configure Environment Variables

In the Koyeb service configuration, scroll to "Environment Variables" section and add:

### Required Variables

```bash
# Database (from Step 2)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# NextAuth Configuration
NEXTAUTH_URL=https://your-app-name.koyeb.app
NEXTAUTH_SECRET=<generate-a-random-secret>

# OAuth Providers (GitHub)
GITHUB_ID=your-github-oauth-client-id
GITHUB_SECRET=your-github-oauth-client-secret

# OAuth Providers (Google) - Optional
GOOGLE_ID=your-google-oauth-client-id
GOOGLE_SECRET=your-google-oauth-client-secret

# Node Environment
NODE_ENV=production
```

### How to Generate NEXTAUTH_SECRET

Run this command locally:
```bash
openssl rand -base64 32
```

### How to Get OAuth Credentials

**GitHub OAuth:**
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Eduskript
   - **Homepage URL**: `https://your-app-name.koyeb.app`
   - **Authorization callback URL**: `https://your-app-name.koyeb.app/api/auth/callback/github`
4. Click "Register application"
5. Copy Client ID and generate a Client Secret

**Google OAuth:**
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://your-app-name.koyeb.app/api/auth/callback/google`
6. Copy Client ID and Client Secret

## Step 5: Deploy

1. Click "Deploy" button in Koyeb
2. Wait ~3-5 minutes for build and deployment
3. Monitor deployment logs for any errors
4. Once deployed, you'll get a URL like: `https://your-app-name.koyeb.app`

## Step 6: Run Database Migrations

After first deployment, you need to run migrations to create database tables.

**Option A: Using Koyeb Console (Recommended)**

1. Go to your service in Koyeb dashboard
2. Click "Console" tab
3. Run:
```bash
pnpm prisma migrate deploy
```

**Option B: Using Koyeb CLI**

1. Install Koyeb CLI:
```bash
npm install -g @koyeb/cli
```

2. Login:
```bash
koyeb login
```

3. Get your service ID:
```bash
koyeb service list
```

4. Run migration:
```bash
koyeb service exec <service-id> -- pnpm prisma migrate deploy
```

## Step 7: Create Initial Database (Optional)

If you want to create the initial database schema without migrations:

```bash
# In Koyeb console
pnpm prisma db push
```

Or seed the database with sample data:

```bash
# In Koyeb console
node prisma/seed-admin.js
```

This creates an admin user:
- Email: `eduadmin@eduskript.org`
- Password: `letseducate`
- **Important**: Change password on first login!

## Step 8: Configure Custom Domain (Optional)

### Add Wildcard Domain Support

For multi-tenant subdomain routing (e.g., `teacher.eduskript.org`):

1. In Koyeb service settings, go to "Domains"
2. Click "Add Domain"
3. Enter your domain: `eduskript.org`
4. Enable "Wildcard" option (adds `*.eduskript.org`)
5. Koyeb will provide DNS configuration:

**DNS Configuration (at your domain registrar):**

Add these records:
```
Type: CNAME
Name: @
Value: <your-service>.koyeb.app

Type: CNAME
Name: *
Value: <your-service>.koyeb.app
```

Or if CNAME for @ is not supported:
```
Type: A
Name: @
Value: <koyeb-provided-ip>

Type: A
Name: *
Value: <koyeb-provided-ip>
```

6. Wait 5-10 minutes for DNS propagation
7. SSL certificates will be auto-provisioned via Let's Encrypt

### Update OAuth Redirect URLs

After adding custom domain, update OAuth apps:

**GitHub:**
- Homepage URL: `https://eduskript.org`
- Callback URL: `https://eduskript.org/api/auth/callback/github`

**Google:**
- Authorized redirect URI: `https://eduskript.org/api/auth/callback/google`

**Update Environment Variable:**
```bash
NEXTAUTH_URL=https://eduskript.org
```

## Monitoring & Logs

### View Logs

In Koyeb dashboard:
1. Go to your service
2. Click "Logs" tab
3. Filter by time range or search keywords

### View Metrics

1. Go to "Metrics" tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Request rate
   - Response time

### Database Metrics

1. Go to "Databases" in left menu
2. Click your database
3. View:
   - Connection count
   - Storage usage
   - Query performance

## Scaling

### Application Scaling

**Vertical Scaling (Increase Resources):**
1. Go to service settings
2. Change "Instance Type" to larger size
3. Redeploy

**Horizontal Scaling (Multiple Instances):**
1. Go to service settings
2. Increase "Instances" count
3. Load balancing is automatic

### Database Scaling

1. Go to database settings
2. Change instance type to larger size
3. Koyeb handles migration automatically

## Troubleshooting

### Deployment Fails

**Check build logs:**
1. Go to service → Deployments
2. Click failed deployment
3. View build logs

**Common issues:**
- Missing environment variables
- Database connection failed (check DATABASE_URL)
- Build timeout (upgrade to paid tier for faster builds)

### Application Errors

**Check runtime logs:**
1. Service → Logs
2. Look for error messages

**Common issues:**
- Database not migrated: Run `pnpm prisma migrate deploy`
- OAuth misconfigured: Check redirect URLs match
- NEXTAUTH_SECRET not set: Add environment variable

### Database Connection Issues

**Verify database is running:**
1. Go to Databases
2. Check status is "Running"

**Test connection:**
```bash
# In Koyeb console
node test-db-connection.js
```

**Check connection string:**
- Must start with `postgresql://`
- Must include username, password, host, port, and database name
- No extra spaces or quotes

### Prisma Migration Issues

**Reset database (CAUTION: Deletes all data):**
```bash
pnpm prisma migrate reset --force
```

**Apply migrations manually:**
```bash
pnpm prisma migrate deploy
```

**Check migration status:**
```bash
pnpm prisma migrate status
```

## Cost Estimates

### Free Tier (Development/Testing)

- **Application**: Eco instance (free, sleeps after inactivity)
- **Database**: Free tier (1GB storage, 5 hours/month compute)
- **Total**: €0/month
- **Limitations**:
  - App sleeps after inactivity (~30 seconds wake time)
  - Limited database uptime
  - Not suitable for production

### Paid Tier (Production)

**Small Project (~1000 users):**
- **Application**: Nano instance (~€7-10/month)
- **Database**: Small instance (~€27-35/month)
- **Total**: ~€35-45/month

**Alternative (Cheaper for Small Projects):**
- Use Koyeb for app (~€10/month)
- Use Scaleway PostgreSQL (~€15/month)
- Total: ~€25/month

## Migrating from VPS

If you're migrating from an existing VPS deployment:

### 1. Export Data (If Needed)

**From SQLite:**
```bash
sqlite3 ./data/dev.db .dump > backup.sql
```

**Convert to PostgreSQL:**
- Manual conversion required (SQLite → PostgreSQL)
- Or start fresh with no data

**From PostgreSQL:**
```bash
pg_dump $OLD_DATABASE_URL > backup.sql
```

### 2. Import to Koyeb Database

**Using Koyeb Console:**
```bash
psql $DATABASE_URL < backup.sql
```

**Or using pg_restore:**
```bash
pg_restore -d $DATABASE_URL backup.dump
```

### 3. Update DNS

Point your domain to Koyeb instead of VPS:
1. Update DNS records (see Step 8)
2. Wait for propagation (~5-10 minutes)
3. Test new deployment thoroughly
4. Keep old VPS running for rollback if needed

### 4. Monitor

After migration:
- Check logs for errors
- Test all functionality
- Monitor performance
- Verify OAuth still works

## Rollback Plan

If something goes wrong:

1. **DNS Rollback**: Point DNS back to old VPS (~10 minutes)
2. **Koyeb Rollback**: In service → Deployments → Click "Redeploy" on previous successful deployment
3. **Database Rollback**: Restore from backup (if you took one)

## Security Best Practices

1. **Rotate Secrets**: Change NEXTAUTH_SECRET regularly
2. **Environment Variables**: Never commit secrets to Git
3. **Database Backups**: Enable automatic backups in Koyeb database settings
4. **SSL/TLS**: Always enabled by Koyeb (Let's Encrypt)
5. **Access Control**: Use Koyeb's IP whitelisting for database if needed

## Additional Resources

- Koyeb Documentation: https://koyeb.com/docs
- Koyeb CLI Reference: https://koyeb.com/docs/cli
- Prisma 7 Documentation: https://pris.ly/d/prisma7
- Next.js Deployment: https://nextjs.org/docs/deployment
- Koyeb Community: https://community.koyeb.com

## Support

**Koyeb Issues:**
- Koyeb Support: https://koyeb.com/support
- Koyeb Status: https://status.koyeb.com

**Application Issues:**
- Check logs first
- Review this guide
- Check GitHub Issues: https://github.com/your-username/eduskript/issues

## Summary Checklist

- [ ] Create Koyeb account
- [ ] Create PostgreSQL database (Frankfurt region)
- [ ] Copy database connection string
- [ ] Create Koyeb service from GitHub
- [ ] Add all environment variables
- [ ] Deploy application
- [ ] Run database migrations
- [ ] Test application at Koyeb URL
- [ ] (Optional) Configure custom domain
- [ ] (Optional) Update OAuth redirect URLs
- [ ] Monitor logs and metrics
- [ ] Create admin user or seed data
- [ ] Test multi-tenant subdomain routing
- [ ] Set up automatic backups

**Congratulations! Your application is now deployed on Koyeb!** 🎉
