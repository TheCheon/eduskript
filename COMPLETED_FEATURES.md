# Completed Features

This file tracks features that have been fully implemented and deployed.

*Last updated: 2025-01-11*

---

## ✅ Admin User System (Phase 0)

**Completed: 2025-01-08**

**Goal**: The first user to be created should be an administrator that can create, delete and alter existing users, including resetting their password.

**All tasks completed:**
- ✅ Added `isAdmin` and `requirePasswordReset` fields to User schema
- ✅ Created admin seed script (`prisma/seed-admin.js`) that runs on container startup
- ✅ Default admin user: eduadmin@eduskript.org / letseducate (password reset required on first login)
- ✅ Implemented forced password reset flow
  - Password reset page at `/auth/reset-password` with validation
  - API endpoint for password updates with session refresh
  - Dashboard redirect enforcement via middleware
- ✅ Admin-only APIs with proper authentication (`/lib/admin-auth.ts`):
  - User CRUD operations (create, read, update, delete)
  - Admin password reset for users
  - Example data seeder with math and physics content
- ✅ Admin panel UI at `/dashboard/admin`:
  - User management interface with search/filter
  - Create/edit/delete users with proper Radix UI dialogs
  - Reset user passwords with optional force-reset flag
  - Example data seeder accessible from empty page builder state
- ✅ Admin panel link in dashboard sidebar (visible to admins only, with Shield icon)
- ✅ Fixed NextAuth compatibility issue (PrismaAdapter conflicting with CredentialsProvider)
- ✅ Fixed Next.js 15+ async params in API routes (await params Promise)
- ✅ Created `pnpm dev:reset` script for quick database reset + admin seed
- ✅ Example data includes published collections, skripts, and pages with markdown content

**Key Files:**
- `/src/app/dashboard/admin/page.tsx` - Admin panel UI
- `/src/app/api/admin/**` - Admin API endpoints
- `/src/lib/admin-auth.ts` - Admin authentication helper
- `/src/app/auth/reset-password/page.tsx` - Password reset flow
- `/prisma/seed-admin.js` - Admin user seeding
- `/src/app/api/admin/seed-example-data/route.ts` - Example data seeder

---

## ✅ Excalidraw Integration (Phase 1.1)

**Completed: 2025-01-08**

**Goal**: Enable teachers to create and embed drawings as themed SVGs

**All tasks completed:**
- ✅ Research Excalidraw integration approaches
  - ✅ Evaluate `@excalidraw/excalidraw` React component
  - ✅ Test theming capabilities (light/dark mode support)
  - ✅ SVG export functionality
- ✅ Design storage strategy
  - ✅ Store Excalidraw JSON alongside SVG export with naming: `drawingname.excalidraw`, `drawingname.excalidraw.light.svg`, `drawingname.excalidraw.dark.svg`
  - ✅ Use existing file storage system with deduplication
  - ✅ Automatic overwrite support for editing
- ✅ Implement Excalidraw editor modal
  - ✅ Create new component: `src/components/dashboard/excalidraw-editor.tsx`
  - ✅ Add toolbar button to markdown editor (Pencil icon)
  - ✅ Handle drawing creation/editing workflow
- ✅ Implement SVG embedding in markdown
  - ✅ Create custom remark plugin for `![[drawingname.excalidraw]]` syntax (`src/lib/remark-plugins/excalidraw-resolver.ts`)
  - ✅ Support automatic theme switching (light/dark SVG variants)
  - ✅ Integrated into markdown processing pipeline
- ✅ Add drawing management UI
  - ✅ List drawings in skript file browser with special icon
  - ✅ Hide auto-generated SVG files from file list
  - ✅ Edit button for existing drawings (orange Pencil icon)
  - ✅ Delete/rename functionality through standard file operations
- ✅ **Privacy consideration**: Drawings stored on server, no client-side data
- ✅ API endpoint: `/api/excalidraw` for saving/loading drawings

**Key Files:**
- `/src/components/dashboard/excalidraw-editor.tsx` - Excalidraw editor component
- `/src/lib/remark-plugins/excalidraw-resolver.ts` - Markdown integration plugin
- `/src/app/api/excalidraw/route.ts` - API endpoint for saving/loading drawings

---

## ✅ Access Management Dashboard (Phase 3 - Partial)

**Completed: 2025-01-08**

**Tasks completed:**
- ✅ **Collection-level permission overview** showing who has access to what
- ✅ **Clean up the old permission matrix** we no longer use it and went for a simpler UI
- ✅ **Individual skript permission settings** use the same interface as collections
- ✅ **Edge case fix**: when removing access to a skript or collection, the removed user will still see them in their page builder but without title. We now display a placeholder that says "Your access was revoked. This content can no longer be displayed on your page." and no longer display that script or collection on the user's page.

**Key Files:**
- `/src/components/permissions/*` - Permission management UI components
- `/src/lib/permissions.ts` - Permission checking logic
