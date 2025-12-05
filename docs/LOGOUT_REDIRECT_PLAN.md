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
