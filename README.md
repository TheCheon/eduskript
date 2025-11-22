# Eduskript - Modern Education Platform

A comprehensive, multi-tenant education platform built with Next.js, TypeScript, Prisma, and NextAuth. Eduskript allows teachers to create and manage educational content using markdown with advanced features like versioning, LaTeX math, and syntax highlighting.

## Recent Updates (2025-11-22)

### ✅ Simplified Routing Architecture
- **Removed subdomain routing** - Simplified to path-based routing only (`eduskript.org/username/...`)
- **Database migration** - Renamed `User.subdomain` → `User.username`
- **Removed custom domain support** - Cleaner architecture focused on core functionality
- **Updated 56+ files** - Complete migration across database, API, UI, tests, and documentation

### ✅ Enhanced Seed Data
- **User-friendly seeding** - No longer creates dummy users, only content for current user
- **Auto-refresh** - Content library automatically refreshes after seeding (no manual page reload)
- **Simplified workflow** - New users can quickly get started with example algebra content

## MVP

- [x] persistent file hosting
- [x] ~~subdomain routing~~ Replaced with username-based path routing (`eduskript.org/username/...`)
   - [x] change structure vocabulary to the following: a user has a "webpage" that they can describe in their settings (change that). on this webpage, they have several "collections" (current called "scripts", so rename that) that have "skripts" which contain "pages".
   - [x] ~~custom domain support~~ Removed in favor of simpler path-based routing
- [x] username-based routing fully implemented
- [ ] sign up for teachers using email verification
- [ ] transfer old components

## Preference
- [ ] student/class handling
   - [ ] crypto logic
   - [ ] sign up invite
   - [ ] data service
- [ ] infrastructure for paid components
