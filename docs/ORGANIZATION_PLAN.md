# Organization Groundwork Plan

## Status: IMPLEMENTED (2025-12-13) + Front Pages & Custom Domains (2025-12-13)

This document describes the groundwork needed to support multi-tenant organizations in Eduskript.

---

## Problem Statement

Currently, Eduskript is user-centric:
- Individual teachers create accounts and own content
- Collaboration is peer-to-peer between teachers
- Admin capabilities are global (platform-level only)

**Need:** Schools and organizations want to:
- Pay per organization (not per teacher)
- Have registered domains that all belong to one organization
- Have organization admins who manage users within their org
- Control content at the organization level
- Have an organization-branded page

**Goal:**
- Lay the groundwork
- Turn Eduskript itself into the first organization
- All users belong to at least one organization (Eduskript by default)

---

## Key Design Decisions

1. **All users belong to Eduskript org by default** - No "independent" users. Simplifies the model.
2. **Multi-org membership** - Users can be in multiple orgs (e.g., Eduskript + school). No "primary" org concept needed.
3. **Org admin = teacher only** - Only `accountType="teacher"` can be org owner/admin. Students can only be members.
4. **Platform admin transcends orgs** - `isAdmin=true` is a superuser across all orgs.

---

## Data Model

### New Models

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String                          // "Eduskript"
  slug        String   @unique                // "eduskript" - for org page URL
  description String?
  logoUrl     String?

  // Settings
  allowMemberPages    Boolean @default(true)  // Members can have personal pages
  requireEmailDomain  String?                 // e.g., "@school.edu" - auto-join on signup

  // Billing groundwork (payment provider TBD)
  billingPlan         String   @default("free") // "free" | "school" | "enterprise"

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     OrganizationMember[]
}

model OrganizationMember {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           String   @default("member")  // "owner" | "admin" | "member"

  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}
```

### User Model Extension

```prisma
model User {
  // ... existing fields ...

  // Organization membership (via junction table)
  organizationMemberships OrganizationMember[]

  // Individual billing groundwork (payment provider TBD)
  billingPlan         String   @default("free") // "free" | "pro" | etc.
}
```

### Roles

| Role | Capabilities |
|------|-------------|
| `owner` | Full control: billing, delete org, transfer ownership |
| `admin` | Manage members: invite, remove, reset passwords, edit roles |
| `member` | Basic access: view org page, listed as member |

---

## Implementation Plan

### Phase 1: Database & Core Models

1. **Add Prisma models**
   - `Organization` model
   - `OrganizationMember` junction table
   - Update `User` model with relation

2. **Create migration**
   - Run `pnpm db:generate && pnpm db:push`

3. **Seed Eduskript as first organization**
   - Create "Eduskript" organization with slug "eduskript"
   - Add existing admin user(s) as owner
   - Add ALL existing users as members (everyone belongs to Eduskript by default)

### Phase 2: Organization Admin API

4. **API routes** (`/api/organizations/[orgId]/...`)
   - `GET /members` - List org members
   - `POST /members` - Add member (by email or invite)
   - `PATCH /members/[userId]` - Change role
   - `DELETE /members/[userId]` - Remove member
   - `POST /members/[userId]/reset-password` - Admin password reset

5. **Auth helpers** (`src/lib/org-auth.ts`)
   - `requireOrgAdmin(orgId)` - Check if user is org admin/owner
   - `getOrgMembership(userId, orgId)` - Get user's role in org

### Phase 3: Organization Dashboard

6. **Dashboard pages** (`/dashboard/org/[orgId]/...`)
   - `/members` - Member list with role badges
   - `/settings` - Org name, logo, domain restrictions
   - `/invite` - Generate invite links or bulk import

7. **Navigation update**
   - Show "Organization" nav item for org admins
   - Context-aware: show org name in header

### Phase 4: User Management Features

8. **Org admin capabilities**
   - View all members (teachers & students in org)
   - Create new users within org
   - Reset member passwords
   - Remove members from org
   - Cannot delete users (only platform admin can)

9. **Auto-join by email domain**
   - If `requireEmailDomain` set, new signups with matching email auto-join
   - OAuth signups check email domain

### Phase 5: Organization Page

10. **Public org page** (`/org/[slug]`)
    - Organization landing page
    - List of member teachers (if allowed)
    - Shared content showcase

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add Organization, OrganizationMember |
| `src/lib/org-auth.ts` | Create | Org-level auth helpers |
| `src/app/api/organizations/[orgId]/members/route.ts` | Create | Member CRUD API |
| `src/app/dashboard/org/[orgId]/members/page.tsx` | Create | Member management UI |
| `src/app/dashboard/org/[orgId]/settings/page.tsx` | Create | Org settings UI |
| `src/components/dashboard/sidebar.tsx` | Modify | Add org nav for admins |
| `prisma/seed-org.ts` | Create | Seed Eduskript organization |

---

## Migration Strategy

1. **All users → Eduskript org**: Existing users become members of Eduskript org
2. **Platform admin remains**: `isAdmin` flag for platform-level operations (superuser across all orgs)
3. **Org admin is additive**: Org admins only manage their org's users
4. **Content unaffected**: Existing content ownership unchanged

---

## Security Considerations

- Org admins cannot access other orgs
- Org admins cannot elevate to platform admin
- Password resets by org admin logged for audit
- Member removal doesn't delete user (they keep personal content)
- Email domain validation prevents org impersonation

---

## Phase 5: Organization Front Pages & Custom Domains (IMPLEMENTED)

### Organization Front Pages

Organizations can have customizable public landing pages at `/org/[slug]`.

**Features:**
- Markdown-based content editor (reuses FrontPageEditor component)
- Draft/published state (only published visible to public)
- Version history with restore capability
- Member directory showing admin/owner teachers

**Files:**
- `prisma/schema.prisma` - Extended FrontPage with `organizationId`
- `src/app/api/frontpage/organization/[orgId]/route.ts` - Front page CRUD API
- `src/app/dashboard/org/[orgId]/frontpage/page.tsx` - Dashboard editor
- `src/app/org/[slug]/page.tsx` - Public organization page
- `src/components/dashboard/frontpage-editor.tsx` - Extended with `type="organization"`

### Custom Domains

Organizations can use custom domains (e.g., `eduskript.org`) that resolve to their org page.

**Features:**
- Add multiple custom domains per organization
- DNS TXT record verification for domain ownership
- Primary domain selection
- Middleware-based domain resolution

**Verification Flow:**
1. Admin adds domain (e.g., `school.edu`)
2. System generates verification token
3. Admin adds DNS TXT record: `_eduskript-verify.school.edu = [token]`
4. Admin clicks "Verify" - system checks DNS
5. Once verified, domain can be set as primary

**Files:**
- `prisma/schema.prisma` - Added CustomDomain model
- `src/app/api/organizations/[orgId]/domains/route.ts` - Domain CRUD
- `src/app/api/organizations/[orgId]/domains/[domainId]/route.ts` - Delete, set primary
- `src/app/api/organizations/[orgId]/domains/[domainId]/verify/route.ts` - DNS verification
- `src/app/api/internal/resolve-domain/route.ts` - Internal lookup for middleware
- `src/app/dashboard/org/[orgId]/domains/page.tsx` - Domain management UI
- `src/proxy.ts` - Custom domain resolution and rewriting (Next.js 16 uses proxy instead of middleware)

### Eduskript as Default Landing Page

The Eduskript organization page is the default landing page, implemented using the standard custom domain system (no special cases):

**How it works:**
- `eduskript.org` is registered as a verified custom domain for the Eduskript org
- Production: eduskript.org resolves via custom domain → `/org/eduskript`
- Development: localhost/127.0.0.1/192.168.* resolves directly → `/org/eduskript` (small dev exception in proxy.ts)
- `src/app/page.tsx` simplified to redirect fallback

**Files:**
- `src/proxy.ts` - Dev routing: localhost → eduskript org
- Database: `custom_domains` table contains eduskript.org → eduskript org mapping
- `src/app/page.tsx` - Redirect fallback to `/org/eduskript`