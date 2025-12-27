# Completed Features

This file tracks features that have been fully implemented and deployed.

*Last updated: 2025-12-27*

---

## AI Edit with Streaming & Merge Editor (December 2025)

**Goal:** Let teachers use AI to edit content with VS Code-like review experience.

**Implementation:**
- **Merge Editor**: CodeMirror `unifiedMergeView` with per-chunk accept/reject buttons
- **Streaming**: Two-phase (plan → generate each page) with SSE real-time progress
- **Progressive Review**: Review completed pages while AI generates remaining ones
- **Early Save**: "Save X Ready" button for partial results

**Key Files:**
- `src/components/ai/merge-editor.tsx` - Unified merge view
- `src/components/ai/ai-edit-modal.tsx` - Progressive UI
- `src/hooks/use-ai-edit.ts` - SSE handling
- `src/app/api/ai/edit/route.ts` - Streaming API

---

## Custom AI Prompts (December 2025)

**Goal:** Organizations and teachers can configure custom AI instructions.

**Implementation:**
- **Organization Prompts**: Org admins set guidelines for all teachers
- **Teacher Prompts**: Personal preferences in page settings
- **Hierarchy**: Org → Teacher (both prepended to AI context)

**UI Locations:**
- Org admins: `/dashboard/org/[orgId]/settings` → AI Assistant
- Teachers: `/dashboard/settings` → AI Assistant

**Key Files:**
- `prisma/schema.prisma` - `aiSystemPrompt` on User model
- `src/app/dashboard/org/[orgId]/settings/page.tsx` - Org prompt UI
- `src/components/dashboard/page-settings.tsx` - Teacher prompt UI
- `src/app/api/user/ai-prompt/route.ts` - Teacher prompt API

---

- resize / layout box component to simplify positioning: currently i think the resizable components (images and excalidraw) each have their own implementation of resize and alignmet gizmos, correct? if so, we could wrap them both in a alignment and resizer gizmo if that makes sense.

rendering pipeline:
- we unified the pipelines as far as possible so we only have ONE compileMDX()
- we render ssr in markdown-renderer-server and csr in markdown-renderer-client.
- before rendering, we create a skriptfiles object that we can pass to plugins if they need files. skriptfiles contains all skript files and their resolved urls on scaleway or video providers. in markdown-renderer-server we get this from the database, in markdown-renderer-client from the file browser component. the skriptfiles contains a environment attribute ("ssr" or "csr").
- then we first convert markdown stuff to mdx components WITHOUT adapting filenames AT ALL! so ![](video.mp4) becomes <MuxVideo src="video.mp4" />, ![](picture.png) becomes <Image src="picture.png">, ![](drawing.excalidraw) or ![](drawing2.excalidraw.md) become <ExcalidrawImage src="drawing.excalidraw" />  or <ExcalidrawImage src="drawing2.excalidraw.md">
- we then pass filelist to the components and they resolve the filenames they are given themselves usling filelist.



## 🔄 Subdomain Routing Removal (2025-11-22)

**Goal**: Simplify architecture by removing complex subdomain routing in favor of username-based path routing.

**Completed:**
- ✅ **Database Migration** - Renamed `User.subdomain` → `User.username`
- ✅ **Removed Custom Domain Model** - Dropped `CustomDomain` table and all related functionality
- ✅ **Simplified Proxy** - Removed all subdomain detection and rewriting logic
- ✅ **Path-Based Routing** - All public pages now use `eduskript.org/username/...` structure
- ✅ **Updated 56+ Files** - Complete migration across database, API, UI, tests, and documentation
- ✅ **All Tests Passing** - 256 tests validated after migration
- ✅ **Production Build** - Fixed Suspense boundaries for Next.js 16 static generation
- ✅ **Enhanced Seed Data** - No longer creates dummy users, auto-refresh after seeding

**Files Removed:**
- `/src/app/api/domains/**` - Custom domain endpoints
- `/src/app/api/user/custom-domains/**` - User domain management
- `/src/app/dashboard/settings/domains/**` - Domain settings UI
- `/src/components/CustomDomainHandler.tsx` - Subdomain detection component
- `/src/components/dashboard/custom-domains.tsx` - Domain management UI
- `/src/components/dashboard/domain-settings.tsx` - Domain settings form

**Benefits:**
- Simpler architecture without complex subdomain handling
- Works reliably on all hosting platforms (especially Koyeb)
- Easier to understand and maintain
- Cleaner URL structure
- No DNS configuration needed for new users

---

## ✅ Privacy-Preserving Class Management (Phase 0.5)

**Completed: 2025-01-XX**

**Class Management System:**
- ✅ Created Class model with invite codes and teacher ownership
- ✅ Created ClassMembership junction table for many-to-many relationships
- ✅ Created PreAuthorizedStudent model for bulk import before signup
- ✅ Teacher-facing UI: `/dashboard/classes` for class list and creation
- ✅ Teacher-facing UI: `/dashboard/classes/[id]` for class details with:
  - Bulk email import (CSV/paste) that hashes emails to pseudonyms
  - Client-side localStorage mapping (email → pseudonym) for teacher verification
  - Student lookup tool to check enrollment status
  - Invite link generation and sharing
- ✅ Student-facing UI: `/classes/join/[inviteCode]` for joining classes
- ✅ Student-facing UI: `/dashboard/my-classes` for viewing enrolled classes
- ✅ Auto-enrollment via PrivacyAdapter during student signup
- ✅ API endpoints:
  - `GET/POST /api/classes` - List and create classes
  - `POST /api/classes/[id]/bulk-import` - Bulk import student emails
  - `GET /api/classes/[id]/students` - Get class roster
  - `GET/POST /api/classes/join/[inviteCode]` - Preview and join class
  - `GET /api/classes/my-classes` - Student's enrolled classes
- ✅ Cryptographically random 16-character invite codes (2^64 combinations)
- ✅ Server-side email hashing (HMAC-SHA256) - emails never stored in cleartext
- ✅ Client-side localStorage for email-to-pseudonym mapping
- ✅ Role-based sidebar navigation (Teachers see "Classes", Students see "My Classes")

---

## ✅ Microsoft Authentication & GDPR Privacy Infrastructure (Phase 0)

**Completed: 2025-01-XX**

**Microsoft OAuth Integration:**
- ✅ Added AzureADProvider to NextAuth configuration
- ✅ Transferred Azure AD credentials from informatikgarten.ch
- ✅ Updated environment configuration (.env, .env.example)
- ✅ Configured OAuth scopes: `openid profile email offline_access`
- ✅ Enabled PrismaAdapter for OAuth providers

**Privacy-Preserving Student Data Model:**
- ✅ Created pseudonym generation utilities (`src/lib/privacy/pseudonym.ts`)
  - HMAC-SHA256 hashing for stable, verifiable pseudonyms
  - Teacher verification without storing student PII
- ✅ Updated User schema with privacy fields:
  - `accountType` (teacher/student)
  - `studentPseudonym` (hashed identifier)
  - `gdprConsentAt` (consent timestamp)
  - `lastSeenAt` (for inactive account cleanup)
- ✅ Created StudentProgress model (page completion tracking)
- ✅ Created StudentSubmission model (assignments, grades, feedback)
- ✅ Updated auth callbacks to generate pseudonyms automatically
- ✅ Updated TypeScript types for session/JWT

**GDPR Compliance Endpoints:**
- ✅ Data export endpoint: `GET /api/user/data-export`
  - GDPR Article 15 - Right to Access
  - Exports all user data as downloadable JSON
- ✅ Account deletion endpoint: `DELETE /api/user/account`
  - GDPR Article 17 - Right to Erasure
  - Anonymizes student submissions (preserves teacher records)
  - Cascade deletes all other user data
- ✅ Account info endpoint: `GET /api/user/account`
  - Shows user stats and data counts

---

## 🔧 Recent Infrastructure Improvements (2025-01-15)

**Build Configuration & CI/CD**:
- ✅ **Next.js 16 Migration** - Updated ESLint configuration for Next.js 16
  - Migrated from `next lint` to direct `eslint .` (Next.js 16 removed built-in lint command)
  - Converted ESLint config to flat config format (eslint.config.mjs)
  - Fixed pnpm version mismatch in GitHub Actions workflow
  - Updated TypeScript configuration to exclude test directories from production builds
  - Resolved all 19 ESLint errors (React hooks patterns, variable declarations)
  - Build now passes successfully with zero errors

**Subdomain Routing Fixes**:
- ✅ **Preview Button URL Generation** - Fixed incorrect URL construction in page builder
  - Preview button now correctly generates URLs like `eduadmin.eduskript.org` instead of `eduadmin.org`
  - Properly detects base domain vs subdomain (eduskript.org vs dashboard.eduskript.org)
- ✅ **Native Subdomain Support** - CustomDomainHandler now recognizes `.eduskript.org` subdomains
  - Added detection for both `.eduskript.org` (production) and `.localhost` (development)
  - Automatically rewrites subdomain URLs to `/{subdomain}` path for proper routing
  - Users can now access their pages via `username.eduskript.org` and see correct content

**UI Cleanup**:
- ✅ **Removed Duplicate Footer** - Cleaned up redundant VersionFooter component
  - Kept GitInfo component in bottom right (expandable git commit info)
  - Removed full-width VersionFooter from main page

**User Data Service**:
- ✅ **IndexedDB Persistence Layer** - Created comprehensive local storage system
  - Dexie-based database with compound primary key [pageId, componentId]
  - Singleton service pattern with debounced saves (1 second default)
  - React hook (useUserData) for component integration
  - Type-safe data structures for annotations and code editor state
  - Migrated annotations from old implementation to new service
  - Added code editor persistence (files, settings, canvas transform)
  - Foundation for future remote sync when student accounts exist

**Files Modified**:
- `.github/workflows/ci.yml` - Removed hardcoded pnpm version
- `package.json` - Updated lint script to use eslint directly
- `eslint.config.mjs` - Migrated to flat config format
- `tsconfig.json` - Excluded test/review directories
- `src/components/CustomDomainHandler.tsx` - Added native subdomain detection
- `src/components/dashboard/page-builder-interface.tsx` - Fixed preview URL logic
- `src/app/page.tsx` - Removed duplicate footer
- `src/lib/userdata/` - New user data service directory
  - `types.ts` - TypeScript interfaces for user data
  - `schema.ts` - Dexie database schema
  - `userDataService.ts` - Singleton service with CRUD operations
  - `hooks.ts` - useUserData React hook
- `src/lib/markdown.ts` - Added pageId to MarkdownContext
- `src/components/public/annotatable-content.tsx` - Pass pageId through context
- `src/components/markdown/markdown-renderer.tsx` - Pass pageId to CodeEditor
- `src/components/annotations/annotation-layer.tsx` - Migrated to use new service
- `src/components/public/code-editor/index.tsx` - Added persistence support

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

---

## ✅ Python Code Editor with Turtle Graphics (Phase 1.1)

**Completed: 2025-01-12**

**Goal**: Interactive Python code editor for students to learn programming with turtle graphics

**All tasks completed:**

**Phase 1.1.1: Setup Skulpt and Core Infrastructure** ✅
- ✅ Copied Skulpt files to public directory (`skulpt.min.js`, `skulpt-stdlib.js`)
- ✅ Created basic component structure at `src/components/public/code-editor/`
- ✅ Set up TypeScript types for Skulpt and editor config

**Phase 1.1.2: CodeMirror Integration** ✅
- ✅ Implemented CodeMirror 6 with Python language support
- ✅ Configured theme switching (light/dark mode with VSCode themes)
- ✅ Added line numbers and basic editing features
- ✅ Configured Python syntax highlighting
- ✅ Added editor controls (Run, Stop, Reset, Clear output)

**Phase 1.1.3: Skulpt Python Execution** ✅
- ✅ Configured Skulpt runtime with output capture
- ✅ Set up turtle graphics canvas with pan/zoom
- ✅ Error handling and display
- ✅ Execution limits for safety
- ✅ Canvas features: hideable, fullscreen mode, pan and zoom with mouse

**Phase 1.1.4: Terminal Output** ✅
- ✅ Terminal output area for print() statements
- ✅ Error messages with proper formatting
- ✅ Color-coded output types (stdout, stderr, warnings)
- ✅ Scrollable output with clear button

**Phase 1.1.5: Multi-File Support** ✅
- ✅ File tabs UI for multiple Python files
- ✅ Add/remove/rename file functionality (double-click to rename)
- ✅ Switch between files in editor
- ✅ Python import system with Skulpt custom modules
- ✅ Cross-file imports (with/without .py extension)

**Phase 1.1.6: Markdown Integration** ✅
- ✅ Custom remark plugin for code editor blocks (` ```python editor` syntax)
- ✅ Support initial code in markdown
- ✅ Render editor in public pages via hydration
- ✅ Editor toolbar button for inserting code blocks

**Phase 1.1.7: Advanced Features** ✅
- ✅ Client-side Python autocomplete:
  - Keyword and builtin function completion
  - Turtle graphics method completion
  - Module member completion (math, random, turtle)
  - Auto-trigger on dot notation
  - User-defined function/class/variable extraction and completion

**Phase 1.1.8: Unified VSCode Theme** ✅
- ✅ Replaced Shiki with CodeMirror for static code blocks
- ✅ All editors now use identical VSCode Light/Dark themes
- ✅ Support for code annotations: `[!code ++]`, `[!code --]`, `[!code highlight]`, `[!code focus]`
- ✅ Consistent syntax highlighting across interactive and static code

**Implementation Architecture:**
- **Editor**: CodeMirror 6 with Python language support
- **Python Runtime**: Skulpt.js (browser-based Python interpreter)
- **UI Layout**: Left = code editor with file tabs, Right = turtle canvas (pan/zoom, hideable), Bottom = terminal output
- **Multi-file**: Tab-based interface with add/remove/rename
- **Autocomplete**: Client-side language server with keyword, builtin, module, and user-defined symbol completion
- **Storage**: Component state (no persistence - resets on page reload)

**Key Files:**
- `/src/components/public/code-editor/index.tsx` - Main editor component
- `/src/components/public/code-editor/types.ts` - TypeScript definitions
- `/src/components/public/code-editor/python-completions.ts` - Client-side language intelligence
- `/src/lib/remark-plugins/code-editor.ts` - Markdown integration plugin
- `/src/components/markdown/codemirror-code-block.tsx` - Static code block renderer
- `/src/lib/rehype-plugins/codemirror-highlight.ts` - Syntax highlighting plugin
- `/src/components/dashboard/codemirror-editor.tsx` - Toolbar integration (~line 542)
- `/public/js/skulpt.min.js`, `/public/js/skulpt-stdlib.js` - Python runtime

**Future Enhancements:**
- Context-aware cross-file completion
- Auto-save to localStorage
- Code history/undo for sessions
- Share code snippets
- Keyboard shortcuts (Ctrl+Enter to run)

---

## ✅ Infrastructure & Build System (2025-01-15)

**Completed: 2025-01-15**

**Goal**: Migrate to Next.js 16 and fix critical infrastructure issues

**All tasks completed:**

**Next.js 16 Migration** ✅
- ✅ Migrated from `next lint` to `eslint .` (Next.js 16 removed built-in lint)
- ✅ Converted ESLint config to flat config format (eslint.config.mjs)
- ✅ Fixed pnpm version mismatch in GitHub Actions workflow
- ✅ Updated TypeScript config to exclude test directories from builds
- ✅ Resolved all 19 ESLint errors (React hooks, variable declarations)
- ✅ Build passes successfully with zero errors

**Subdomain Routing** ✅
- ✅ Fixed preview button URL generation in page builder
- ✅ Added native subdomain detection for `.eduskript.org` and `.localhost`
- ✅ Automatic path rewriting for subdomain URLs
- ✅ Users can access pages via `username.eduskript.org`

**UI Cleanup** ✅
- ✅ Removed duplicate VersionFooter component
- ✅ Kept GitInfo component in bottom right

**Key Files:**
- `.github/workflows/ci.yml` - Removed hardcoded pnpm version
- `package.json` - Updated lint script
- `eslint.config.mjs` - Flat config format
- `tsconfig.json` - Excluded test/review directories
- `src/components/CustomDomainHandler.tsx` - Subdomain detection
- `src/components/dashboard/page-builder-interface.tsx` - Preview URL logic


# DOM Morphing Plan for Flicker-Free Live Preview

## Problem

When markdown is updated in the live preview, React unmounts and remounts all components because MDX compilation creates a NEW component function each time. React sees different component types and does a full DOM replacement, causing visual flicker and loss of interactive component state.

**Current behavior:**
1. User types in editor
2. MDX compiles → creates new `MDXContent` component function
3. React sees different component type → full unmount/remount
4. All interactive components (CodeEditor, Tabs, Callouts) lose state
5. Visual flicker as DOM is destroyed and rebuilt

## Solution: DOM Morphing with React Portals

Instead of replacing the entire React tree on each update:
1. Render MDX to static HTML string (using `renderToStaticMarkup`)
2. Use `morphdom` to diff and patch only changed DOM elements
3. Mount interactive components (CodeEditor, Tabs, Callout, etc.) via React portals into the morphed DOM

This preserves:
- Existing DOM structure where content hasn't changed
- Interactive component state (form inputs, expanded callouts, code editor content)
- Scroll position naturally (morphdom doesn't move unchanged content)

## Implementation

### 1. Install morphdom

```bash
pnpm add morphdom
pnpm add -D @types/morphdom
```

### 2. Create Static Component Variants

File: `src/lib/mdx-static-components.tsx`

Create simplified versions of interactive components that render placeholder HTML:

```tsx
// Static placeholders for morphdom - these render skeleton HTML with data attributes
// React portals will replace these with interactive components after morphdom runs

export const staticComponents = {
  'code-editor': (props) => (
    <div
      data-component="code-editor"
      data-props={JSON.stringify(props)}
      className="code-editor-placeholder min-h-[200px] bg-muted/20 rounded"
    />
  ),
  'blockquote': BlockquoteStatic, // Handles callouts
  'tabs-container': TabsStatic,
  'question': QuestionStatic,
  // etc.
}
```

### 3. Modify MarkdownRenderer to Use Morphdom

File: `src/components/markdown/markdown-renderer.client.tsx`

```tsx
import morphdom from 'morphdom'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPortal } from 'react-dom'
import { staticComponents } from '@/lib/mdx-static-components'

function MarkdownRendererInner({ content, ... }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const portalsRef = useRef<Map<string, { element: Element; component: ReactNode }>>()
  const [portals, setPortals] = useState<ReactNode[]>([])

  useEffect(() => {
    const processContent = async () => {
      // 1. Compile MDX
      const { default: MDXContent } = await compileMDX(content, ...)

      // 2. Render to static HTML with placeholder components
      const staticHtml = renderToStaticMarkup(
        <MDXContent components={staticComponents} />
      )

      // 3. Morph existing DOM to new structure
      if (containerRef.current) {
        morphdom(containerRef.current, `<div>${staticHtml}</div>`, {
          childrenOnly: true,
          onBeforeElUpdated(fromEl, toEl) {
            // Skip updating elements with matching data-component-id
            if (fromEl.getAttribute('data-component-id') ===
                toEl.getAttribute('data-component-id')) {
              return false // Keep existing element
            }
            return true
          }
        })

        // 4. Find placeholders and create portals for interactive components
        hydrateInteractiveComponents()
      }
    }
    processContent()
  }, [content, ...])

  // Render portals alongside static content
  return (
    <>
      <div ref={containerRef} className="markdown-content prose ..." />
      {portals}
    </>
  )
}
```

### 4. Hydration Strategy for Interactive Components

After morphdom patches the DOM, scan for placeholders and mount React components into them:

```tsx
function hydrateInteractiveComponents() {
  const newPortals: ReactNode[] = []

  // Find all placeholder elements
  const placeholders = containerRef.current.querySelectorAll('[data-component]')

  placeholders.forEach((el, idx) => {
    const componentType = el.getAttribute('data-component')
    const props = JSON.parse(el.getAttribute('data-props') || '{}')
    const id = el.getAttribute('data-component-id') || `${componentType}-${idx}`

    // Create React component based on type
    const Component = interactiveComponents[componentType]
    if (Component) {
      newPortals.push(
        createPortal(
          <Component key={id} {...props} />,
          el
        )
      )
    }
  })

  setPortals(newPortals)
}
```

### 5. Component ID Generation

Generate stable IDs for components based on their content/position:

```tsx
// In static components, generate deterministic IDs
function hashProps(props: unknown): string {
  return hashCode(JSON.stringify(props))
}

// code-editor placeholder
<div
  data-component="code-editor"
  data-component-id={`editor-${hashProps({language, code})}`}
  data-props={...}
/>
```

## File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Add `morphdom` dependency |
| `src/lib/mdx-static-components.tsx` | NEW - Static component variants |
| `src/components/markdown/markdown-renderer.client.tsx` | Refactor to use morphdom + portals |
| `src/lib/mdx-components-factory.tsx` | Keep for server rendering, may split |

## Benefits

1. **No flicker** - DOM elements stay in place if content unchanged
2. **State preservation** - Interactive components keep their state via React portals
3. **Performance** - Only changed DOM nodes are updated
4. **Scroll preservation** - Natural (no scroll jumps from DOM replacement)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| renderToStaticMarkup can't run in client | It can - it's isomorphic. Just imports from 'react-dom/server' |
| Event handlers lost after morph | Portals remount React components which re-attach handlers |
| Complex nested components | Test thoroughly with Tabs-in-Callout scenarios |
| Performance of double render | Static render is fast, measure and optimize if needed |

## Research Notes

**MDX Playground**: Does not solve this problem. Uses simple async compilation + state updates, accepting the remount behavior.

**react-live**: Uses a "fake mount" approach but doesn't preserve state across code changes. Their focus is on live code editing, not content preservation.

**react-markdown**: Previously solved this with HAST → React elements approach, but MDX's component model makes this incompatible.

## Status

**Not yet implemented** - Saved as future optimization idea.


# Plan: Reliable Large File Import with Background Processing

## Status: TODO (Not yet implemented)

This document describes the planned implementation for importing large ZIP files (100-500MB) without degrading server performance.

## Problem

1. **Next.js body size limit**: Next.js enforces a 10MB body size limit BEFORE route handlers run. The `serverActions.bodySizeLimit` config only affects Server Actions, not Route Handlers.
2. **Event loop blocking**: Large ZIP files could block the Node.js event loop during processing
3. **Memory spikes**: Unzipping large files in memory can exhaust available RAM

## Current Workaround

For large imports, use the direct CLI script:
```bash
node scripts/import-direct.mjs <path-to-zip> <user-id>
```

This bypasses HTTP entirely and imports directly via Prisma.

## Planned Solution: S3 Upload + Worker Thread Processing

### Architecture

```
Client                    S3                     Server
  |                       |                        |
  |-- 1. Request URL ---->|                        |
  |<-- Presigned URL -----|                        |
  |                       |                        |
  |-- 2. Upload ZIP ----->|                        |
  |                       |                        |
  |-- 3. Start import --->|----------------------->|
  |<-- Job ID ------------|                        |
  |                       |                        |
  |                       |<-- 4. Download ZIP ----|
  |                       |                        |
  |                       |    [Worker Thread]     |
  |                       |    - Stream unzip      |
  |                       |    - Parse JSON        |
  |                       |    - DB inserts        |
  |                       |                        |
  |-- 5. Poll status ---->|----------------------->|
  |<-- Progress/Complete --|                        |
```

### Flow

1. **Client requests presigned URL** - `POST /api/import/prepare`
2. **Client uploads directly to S3** - Bypasses Next.js entirely
3. **Client starts import job** - `POST /api/import?action=start&s3Key=xxx`
4. **Server spawns worker thread** - Downloads from S3, streams unzip
5. **Client polls for status** - `GET /api/import?action=status&jobId=xxx`

### Benefits

- **No body size limits** - S3 handles the upload
- **Non-blocking** - Worker thread doesn't affect web server
- **Memory efficient** - Streaming ZIP extraction
- **Progress feedback** - Real-time status updates

---

## Implementation Plan

### Phase 1: S3 Presigned URL Upload

**New file: `src/app/api/import/prepare/route.ts`**
```typescript
// POST /api/import/prepare
// Returns: { uploadUrl, s3Key, expiresAt }

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { nanoid } from 'nanoid'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const s3Key = `imports/${session.user.id}/${nanoid()}.zip`
  const { url, expiresAt } = await generatePresignedUploadUrl(s3Key, 'application/zip', 900) // 15 min

  return Response.json({ uploadUrl: url, s3Key, expiresAt })
}
```

**Modify: `src/lib/s3.ts`**
```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<{ url: string; expiresAt: Date }> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn })
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  return { url, expiresAt }
}
```

### Phase 2: Worker Thread for Import Processing

**New file: `src/lib/import-worker.ts`**

The worker thread:
- Downloads ZIP from S3 using streaming
- Uses `yauzl` for memory-efficient ZIP extraction
- Processes files one at a time
- Reports progress via `parentPort.postMessage()`
- Batches database inserts (50 at a time)

```typescript
import { parentPort, workerData } from 'worker_threads'
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import yauzl from 'yauzl'

interface WorkerData {
  s3Key: string
  userId: string
  databaseUrl: string
}

async function processImport() {
  const { s3Key, userId, databaseUrl } = workerData as WorkerData

  try {
    // 1. Download from S3
    parentPort?.postMessage({ type: 'progress', percent: 5, message: 'Downloading from S3...' })
    const zipBuffer = await downloadFromS3(s3Key)

    // 2. Extract and process
    parentPort?.postMessage({ type: 'progress', percent: 10, message: 'Extracting ZIP...' })
    const result = await extractAndProcess(zipBuffer, userId, databaseUrl, (progress) => {
      parentPort?.postMessage({ type: 'progress', ...progress })
    })

    // 3. Cleanup S3
    await deleteFromS3(s3Key)

    // 4. Report completion
    parentPort?.postMessage({ type: 'complete', result })
  } catch (error) {
    parentPort?.postMessage({ type: 'error', error: String(error) })
  }
}

processImport()
```

**New file: `src/lib/import-job-manager.ts`**

```typescript
interface ImportJob {
  id: string
  userId: string
  status: 'pending' | 'downloading' | 'processing' | 'complete' | 'failed'
  progress: number
  message: string
  result?: ImportResult
  error?: string
  createdAt: Date
}

// In-memory job tracking with auto-cleanup
const jobs = new Map<string, ImportJob>()

export function startImportJob(userId: string, s3Key: string): string {
  const jobId = nanoid()

  const job: ImportJob = {
    id: jobId,
    userId,
    status: 'pending',
    progress: 0,
    message: 'Starting import...',
    createdAt: new Date()
  }

  jobs.set(jobId, job)

  // Spawn worker thread
  const worker = new Worker('./import-worker.js', {
    workerData: { s3Key, userId, databaseUrl: process.env.DATABASE_URL }
  })

  worker.on('message', (msg) => {
    if (msg.type === 'progress') {
      job.status = 'processing'
      job.progress = msg.percent
      job.message = msg.message
    } else if (msg.type === 'complete') {
      job.status = 'complete'
      job.progress = 100
      job.result = msg.result
      scheduleCleanup(jobId)
    } else if (msg.type === 'error') {
      job.status = 'failed'
      job.error = msg.error
      scheduleCleanup(jobId)
    }
  })

  return jobId
}

export function getJobStatus(jobId: string): ImportJob | null {
  return jobs.get(jobId) || null
}

function scheduleCleanup(jobId: string) {
  // Auto-delete job after 1 hour
  setTimeout(() => jobs.delete(jobId), 60 * 60 * 1000)
}
```

### Phase 3: Import API Updates

**Modify: `src/app/api/import/route.ts`**

```typescript
// New actions:
// POST /api/import?action=start&s3Key=xxx → Starts worker, returns { jobId }
// GET /api/import?action=status&jobId=xxx → Returns job status

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // ... existing auth check ...

  if (action === 'start') {
    const s3Key = searchParams.get('s3Key')
    if (!s3Key) {
      return Response.json({ error: 'Missing s3Key' }, { status: 400 })
    }

    const jobId = startImportJob(session.user.id, s3Key)
    return Response.json({ jobId })
  }

  // ... existing preview/confirm logic for small files ...
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'status') {
    const jobId = searchParams.get('jobId')
    const job = getJobStatus(jobId)

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    return Response.json(job)
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
```

### Phase 4: Frontend Updates

**Modify: `src/components/dashboard/import-export-settings.tsx`**

```typescript
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB

async function handleImport(file: File) {
  if (file.size > LARGE_FILE_THRESHOLD) {
    // Large file: use S3 + worker thread flow
    await handleLargeFileImport(file)
  } else {
    // Small file: use existing direct upload
    await handleDirectImport(file)
  }
}

async function handleLargeFileImport(file: File) {
  setStatus('preparing')

  // 1. Get presigned URL
  const { uploadUrl, s3Key } = await fetch('/api/import/prepare', {
    method: 'POST'
  }).then(r => r.json())

  // 2. Upload to S3 (with progress)
  setStatus('uploading')
  await uploadToS3(uploadUrl, file, (progress) => {
    setUploadProgress(progress)
  })

  // 3. Start import job
  setStatus('processing')
  const { jobId } = await fetch(`/api/import?action=start&s3Key=${s3Key}`, {
    method: 'POST'
  }).then(r => r.json())

  // 4. Poll for status
  await pollJobStatus(jobId, (job) => {
    setProgress(job.progress)
    setMessage(job.message)

    if (job.status === 'complete') {
      setResult(job.result)
      setStatus('complete')
    } else if (job.status === 'failed') {
      setError(job.error)
      setStatus('failed')
    }
  })
}
```

---

## Files to Create/Modify

### New Files
- `src/app/api/import/prepare/route.ts` - Presigned URL endpoint
- `src/lib/import-worker.ts` - Worker thread for processing
- `src/lib/import-job-manager.ts` - Job tracking

### Modified Files
- `src/lib/s3.ts` - Add `generatePresignedUploadUrl()`
- `src/app/api/import/route.ts` - Add async job flow
- `src/components/dashboard/import-export-settings.tsx` - Progress UI

### Dependencies to Add
```bash
pnpm add @aws-sdk/s3-request-presigner yauzl
pnpm add -D @types/yauzl
```

---

## Progress UI Design

```
+---------------------------------------------+
| Importing: algebra-collection.zip           |
|                                             |
| [################............] 55%          |
|                                             |
| Processing skript 3 of 5: Linear Equations  |
| Pages: 12/15 complete                       |
+---------------------------------------------+
```

---

## Cleanup Strategy

- **S3 temp files**: Auto-delete via S3 lifecycle rule (24h) or immediate delete on success
- **Job records**: Auto-cleanup after 1 hour (in-memory Map with TTL)
- **Worker threads**: Terminate on completion/error

---

## Fallback for Small Files

Files under 10MB continue using the current direct upload flow:
- No S3 required
- Synchronous processing
- Faster for simple imports

This keeps the common case (single skript imports) fast and doesn't require S3 configuration.

---

## Testing

1. **Small file import** (<10MB) - Should use existing direct flow
2. **Large file import** (>10MB) - Should use S3 + worker thread flow
3. **Import cancellation** - Worker should clean up S3 file
4. **Import failure** - Error should propagate to UI, S3 file cleaned up
5. **Concurrent imports** - Multiple jobs should run independently

---

## Security Considerations

- Presigned URLs expire after 15 minutes
- S3 keys include user ID to prevent cross-user access
- Jobs are associated with user ID and only accessible by owner
- S3 files deleted immediately after processing


# Plan: Simplify Logout Redirect with localStorage

## Problem

When users log out from the dashboard, they should return to the public page they were last viewing, not a hardcoded location. Currently:
- Teachers always redirect to `/` (homepage)
- Students redirect to where they signed up (not where they currently are)

**Example:** A teacher visits another teacher's site, goes to dashboard, logs out → gets sent to Eduskript homepage instead of back to the teacher's page they were visiting.

## Current Implementation (Overly Complex)

The current approach uses JWT/session storage:
1. During OAuth signup, extracts `signedUpFromPageSlug` from the `next-auth.callback-url` cookie
2. Stores it in the JWT token
3. Copies to session in session callback
4. On logout, checks `session.user.signedUpFromPageSlug` for students only

**Problems:**
- Only works for students, not teachers
- Tracks where they signed up, not where they currently are
- Complex cookie parsing logic in auth.ts (~30 lines)
- Requires JWT/session type extensions

## Proposed Solution

Use localStorage to track the last visited public page. On logout, redirect there.

### Implementation

#### 1. Create utility: `src/lib/return-page.ts`

```typescript
const RETURN_PAGE_KEY = 'eduskript-return-page'

export function setReturnPage(path: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(RETURN_PAGE_KEY, path)
  }
}

export function getReturnPage(): string {
  if (typeof window === 'undefined') return '/'
  return localStorage.getItem(RETURN_PAGE_KEY) || '/'
}
```

#### 2. Track public page visits: `src/components/public/layout.tsx`

Add useEffect to store current path when visiting public pages.

#### 3. Track homepage visits: `src/app/page.tsx`

Store `/` as return page when visiting homepage.

#### 4. Simplify logout: `src/components/dashboard/nav.tsx`

Replace complex session-based logic with simple `getReturnPage()` call.

#### 5. Remove signedUpFromPageSlug entirely

**Files to clean up:**
- `src/lib/auth.ts` - Remove JWT callback logic that extracts/stores signedUpFromPageSlug
- `src/lib/auth.ts` - Remove session callback that copies signedUpFromPageSlug
- `src/types/next-auth.d.ts` - Remove signedUpFromPageSlug from Session.user and JWT interfaces

## Files to Modify

1. **Create:** `src/lib/return-page.ts`
2. **Modify:** `src/components/public/layout.tsx` - track visits
3. **Modify:** `src/app/page.tsx` - track homepage
4. **Modify:** `src/components/dashboard/nav.tsx` - use getReturnPage()
5. **Cleanup:** `src/lib/auth.ts` - remove signedUpFromPageSlug logic
6. **Cleanup:** `src/types/next-auth.d.ts` - remove type declarations

## Benefits

- Works for everyone (teachers, students, visitors)
- Tracks where they actually ARE, not where they signed up
- Simple localStorage vs JWT/cookie complexity
- Naturally updates as users navigate
- ~50 lines of complex code replaced with ~10 lines

## Edge Cases

- First visit (no localStorage) → fallback to `/`
- localStorage disabled → fallback to `/`


# Annotation System Telemetry Analysis

*Last updated: 2025-11-26*

## Overview

This document tracks stroke telemetry data collected from different devices to understand drawing performance characteristics and optimize the annotation experience.

## Metrics Collected

| Metric | Description |
|--------|-------------|
| `pointCount` | Total raw points captured in stroke |
| `totalLengthPx` | Total stroke length in pixels |
| `lengthPerPoint` | Average distance between consecutive points (px) |
| `durationMs` | Total stroke duration in milliseconds |
| `durationPerPoint` | Time between consecutive points (ms) = sampling interval |
| `device` | iOS / Android / Desktop |
| `pointerType` | pen / touch / mouse |

### Interpreting the Metrics

- **Lower `durationPerPoint`** = higher sampling rate = smoother strokes
- **Lower `lengthPerPoint`** = denser point spacing = less visible choppiness
- **Sampling rate (Hz)** ≈ 1000 / durationPerPoint

---

## Device Test Results

### Linux Desktop + Huion Kamvas Pro 19 (Firefox 145)

**Test Date:** 2025-11-26

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| `durationPerPoint` | **~4.3ms** | Excellent - ~230 Hz sampling |
| `lengthPerPoint` | **~1.3-1.9px** | Very dense point spacing |
| `pointerType` | `pen` | Hardware stylus detected |

**Assessment:** Exceptional drawing experience. The Huion tablet provides ~230 samples/second with points only 1-2 pixels apart. Feels "like paper" with zero perceptible lag.

**Sample Strokes:**
```
pointCount: 239, lengthPerPoint: 1.30px, durationPerPoint: 4.16ms (~240Hz)
pointCount: 116, lengthPerPoint: 1.28px, durationPerPoint: 4.31ms (~232Hz)
pointCount: 319, lengthPerPoint: 1.25px, durationPerPoint: 4.42ms (~226Hz)
pointCount: 87,  lengthPerPoint: 1.09px, durationPerPoint: 4.36ms (~229Hz)
```

---

### Lenovo Yoga 7i + Built-in Stylus (Linux/Firefox)

**Test Date:** 2025-11-26
**Hardware:** Lenovo Yoga 7i 2-in-1 with integrated pen

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| `durationPerPoint` | **~4.0-4.5ms** | Excellent - ~220-250 Hz sampling |
| `lengthPerPoint` | **~0.7-1.5px** | Very dense, consistent spacing |
| `pointerType` | `pen` | Hardware stylus detected |

**Assessment:** Feels great! Very consistent sampling rate and dense point spacing. Built-in digitizer provides excellent low-jitter input.

**Sample Strokes:**
```
pointCount: 253, lengthPerPoint: 1.55px, durationPerPoint: 3.98ms (~251Hz)
pointCount: 244, lengthPerPoint: 1.46px, durationPerPoint: 4.22ms (~237Hz)
pointCount: 179, lengthPerPoint: 1.47px, durationPerPoint: 4.22ms (~237Hz)
pointCount: 146, lengthPerPoint: 1.10px, durationPerPoint: 3.77ms (~265Hz)
pointCount: 116, lengthPerPoint: 1.03px, durationPerPoint: 4.12ms (~243Hz)
```

---

### Lenovo Tab T8 Android Tablet (Chrome)

**Test Date:** 2025-11-26
**Hardware:** Lenovo Tab T8 Android tablet with stylus

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| `durationPerPoint` | **~17-25ms** | Poor - only ~40-60 Hz sampling |
| `lengthPerPoint` | **~3-7px** | Very sparse, visible gaps |
| `pointerType` | `pen` | Hardware stylus detected |

**Assessment:** Clearly the worst experience. The tablet's digitizer samples at only ~40-60 Hz (5-6x slower than other devices), creating obvious gaps between points and laggy response.

**Sample Strokes:**
```
pointCount: 34, lengthPerPoint: 4.88px, durationPerPoint: 17.36ms (~58Hz)
pointCount: 27, lengthPerPoint: 3.70px, durationPerPoint: 21.62ms (~46Hz)
pointCount: 25, lengthPerPoint: 4.88px, durationPerPoint: 18.54ms (~54Hz)
pointCount: 22, lengthPerPoint: 5.27px, durationPerPoint: 20.48ms (~49Hz)
pointCount: 13, lengthPerPoint: 6.12px, durationPerPoint: 24.25ms (~41Hz)
```

**Root Cause:** Hardware limitation - the tablet's digitizer simply doesn't sample fast enough. No software fix can overcome this; interpolation could help mask the gaps but adds latency.

---

### iPad + Third-Party Stylus (Safari)

**Test Date:** 2025-11-26
**Hardware:** iPad with non-Apple stylus

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| `durationPerPoint` | **~2.4-4.6ms** | Excellent! ~220-420 Hz sampling |
| `lengthPerPoint` | **~0.4-4.0px** | Variable - depends on stroke speed |
| `pointerType` | `pen` | Hardware stylus detected |

**Assessment:** Surprisingly good metrics - sampling rate is comparable or even better than Desktop in some cases! Despite this, the user reports strokes feel "choppy" compared to Desktop.

**Sample Strokes:**
```
pointCount: 482, lengthPerPoint: 4.04px, durationPerPoint: 2.38ms (~420Hz)
pointCount: 309, lengthPerPoint: 1.12px, durationPerPoint: 3.34ms (~300Hz)
pointCount: 163, lengthPerPoint: 0.88px, durationPerPoint: 3.25ms (~308Hz)
pointCount: 155, lengthPerPoint: 0.85px, durationPerPoint: 2.99ms (~335Hz)
pointCount: 118, lengthPerPoint: 0.68px, durationPerPoint: 3.91ms (~256Hz)
```

**Mystery:** Numbers look great, but drawing feels worse. Possible explanations:
1. **Third-party stylus jitter** - Cheap pen may introduce wobble/noise not captured by these metrics
2. **Safari rendering pipeline** - May batch canvas updates differently than Firefox
3. **Display refresh rate** - iPad Pro has 120Hz, but Safari may not sync canvas updates
4. **Touch prediction** - iOS may have different touch prediction behavior

---

## Analysis & Recommendations

### Key Findings

1. **~200+ Hz sampling** is required for a good drawing experience
2. **Budget Android tablets** (~50 Hz) are hardware-limited - disregard for now
3. **iPad mystery**: High sampling but choppy feel → likely third-party stylus jitter

### Comparison Summary

| Device | Sampling Rate | Point Spacing | Feel |
|--------|--------------|---------------|------|
| Linux + Huion Kamvas Pro 19 | ~230 Hz | 1.0-1.9px | "Like paper" |
| Lenovo Yoga 7i (built-in pen) | ~220-250 Hz | 0.7-1.5px | "Feels great" |
| iPad + Third-party stylus | ~220-420 Hz | 0.4-4.0px | "Choppy" |
| Lenovo Tab T8 Android | **~40-60 Hz** | 3-7px | **"Horrible"** |

### Next Steps

1. **Add jitter metric** - Calculate standard deviation of point-to-point distances to quantify wobble
2. **Test with Apple Pencil** - Compare third-party vs official stylus on same iPad
3. ~~**Real-time smoothing**~~ ✅ Implemented with 3-point moving average

### Current Smoothing Strategy

**Real-time smoothing implemented** (2025-11-26):

- **During drawing:** 3-point moving average applied in real-time
- **Raw data preserved:** Original points stored for telemetry accuracy
- **After stroke:** Additional 3-point smoothing for final render
- **Configurable:** `REALTIME_SMOOTHING_WINDOW` constant in `simple-canvas.tsx`

**A/B Testing Results:**
| Window Size | Feel | Lag |
|-------------|------|-----|
| 1 (raw) | Most responsive, visible jitter | None |
| 2 (light) | Slightly smoother | Imperceptible |
| 3 (moderate) | **Smoothest, chosen as default** | Imperceptible |

**Implementation Details:**
- Optimized averaging function (no array allocation, direct index access)
- Separate tracking for smoothed render position vs. raw stored points
- Test mode available: `SMOOTHING_TEST_MODE = true` cycles through levels with colors

### Potential Future Improvements

1. **Noise threshold** - Ignore tiny movements (< 0.5px)
2. **Pressure smoothing** - Currently only position is smoothed, not pressure
3. **Adaptive smoothing** - Adjust window based on device detection

### Hardware Considerations

- **Apple Pencil (official)** - Hardware-level noise filtering + prediction
- **Third-party stylus** - May lack noise filtering, introducing visible jitter
- **Browser rendering** - Safari may have different canvas compositing behavior

---

## How to Run Tests

1. Enable annotation mode on any page
2. Draw several strokes (short, long, fast, slow)
3. View telemetry: `curl -s https://localhost:3000/api/debug -k | jq`
4. Clear reports: `curl -s -X DELETE https://localhost:3000/api/debug -k`

### Telemetry Code Location

- Telemetry collection: `src/components/annotations/simple-canvas.tsx` (stopDrawing function)
- Debug API: `src/app/api/debug/route.ts`
