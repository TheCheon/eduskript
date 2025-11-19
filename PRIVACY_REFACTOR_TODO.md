# Privacy-First Refactor - Implementation TODO

## Completed ✅
- [x] Updated Prisma schema:
  - Made User.email optional (for students)
  - Added oauthProvider and oauthProviderId fields
  - Added identityConsent and consentedAt to ClassMembership
  - Marked IdentityRevealRequest as deprecated
- [x] Added bio field to session/JWT
- [x] Fixed profile settings subdomain validation
- [x] Removed success alerts from save operations
- [x] Removed separate privacy-requests page (integrated into My Classes)

## Remaining Work 🚧

### 1. Privacy Adapter (HIGH PRIORITY)
**File:** `src/lib/privacy-adapter.ts`

**Current Issues:**
- Line 52: Still stores hashed email in User.email field
- Line 41-44: Still generates pseudonym from email

**Required Changes:**
- For students with OAuth:
  - Store OAuth provider + provider ID instead of email
  - Generate pseudonym from `hash(oauthProvider:oauthProviderId)`
  - **NEVER store email in database**
  - Set email field to NULL
- Auto-enrollment logic (lines 63-93):
  - Keep this, but set `identityConsent = true` when auto-enrolling
  - Update to use new ClassMembership.identityConsent field

### 2. Bulk Import API
**File:** `src/app/api/classes/[id]/bulk-import/route.ts`

**Current Issues:**
- Lines 156-190: Creates IdentityRevealRequest with plaintext email storage

**Required Changes:**
- Remove email storage completely
- Only create PreAuthorizedStudent entries (pseudonym only)
- When student matches pseudonym → Don't store email, just flag as "pending join"
- Email is hashed and immediately discarded after creating PreAuthorizedStudent

### 3. Join Invite Flow
**File:** `src/app/api/classes/join/[inviteCode]/route.ts`

**Current State:** Partially implemented (lines 107-155)

**Required Changes:**
- Add `identityConsent` parameter to POST body
- When creating ClassMembership:
  ```typescript
  {
    classId,
    studentId,
    identityConsent: body.identityConsent || false,
    consentedAt: body.identityConsent ? new Date() : null
  }
  ```
- If student was pre-authorized AND consents → Set identityConsent = true

### 4. Student Roster API
**File:** `src/app/api/classes/[id]/students/route.ts`

**Required Changes:**
- Check ClassMembership.identityConsent for each student
- If `identityConsent = false`:
  - Show pseudonym only
  - Do NOT include email or name
- If `identityConsent = true`:
  - For OAuth students: Fetch email from OAuth provider (real-time) OR
  - For OAuth students: Query Account table for provider info, fetch from provider
  - For legacy students: Show stored email (if exists)

**Critical:** NEVER query User.email for students - it should be NULL

### 5. My Classes UI
**File:** `src/app/dashboard/my-classes/page.tsx`

**Current State:** Shows identity reveal requests (lines 154-204)

**Required Changes:**
- Instead of showing "Identity Requests", show "Join Requests"
- Query PreAuthorizedStudent where pseudonym matches current user
- Message: "Teacher [Name] invited you to join [Class]. They will be able to identify you if you join."
- NO email displayed
- Buttons: "Join Class" (consent) or "Decline"
- On "Join Class":
  - Create ClassMembership with identityConsent = true
  - Delete PreAuthorizedStudent entry

### 6. Join Page UI
**File:** `src/app/classes/join/[inviteCode]/page.tsx`

**Required Changes:**
- Add checkbox: "☐ Allow teacher to see my identity"
- Default: unchecked (anonymous)
- Pass `identityConsent` to POST /api/classes/join/[inviteCode]
- If teacher has pre-authorized this email:
  - Show warning: "This teacher has your email. If you join, they will be able to identify you."
  - Disable anonymous option (must consent)

### 7. Auth Callbacks
**File:** `src/lib/auth.ts`

**Required Changes:**
- OAuth callback:
  - Extract provider and providerAccountId
  - For students: Store in oauthProvider and oauthProviderId
  - For students: Set email = NULL
  - Generate pseudonym from `hash(oauthProvider:oauthProviderId)`
- Session callback:
  - For students: Don't include email in session
  - For teachers: Include email normally

### 8. Student Signup Flow
**Create New File:** `src/app/api/auth/student-signup/route.ts`

**Purpose:** Handle student OAuth signup with privacy checks

**Flow:**
1. Student clicks OAuth button with `?accountType=student` param
2. After OAuth success, check PreAuthorizedStudent for matching pseudonym
3. If matches found:
   - Show: "You've been invited to [X] classes"
   - Option to join with identity consent
4. Create user with oauthProvider/oauthProviderId, email = NULL

### 9. Migration Script
**Create New File:** `scripts/migrate-to-oauth-only.ts`

**Purpose:** Migrate existing students to OAuth-only

**Tasks:**
- For all users where accountType = 'student':
  - Set email = NULL
  - If they have OAuth accounts: populate oauthProvider/oauthProviderId
  - Regenerate pseudonym from OAuth if possible
- Migrate approved IdentityRevealRequests:
  - Find matching ClassMembership
  - Set identityConsent = true, consentedAt = respondedAt
- Drop IdentityRevealRequest table

### 10. Teacher Class Roster UI
**File:** `src/app/dashboard/classes/page.tsx` and related

**Required Changes:**
- Show pseudonym for students with identityConsent = false
- For identityConsent = true:
  - Fetch email from OAuth provider
  - OR query Account table → OAuth provider API
  - Display with indicator: "✓ Identified"

## Testing Checklist

- [ ] Student signs up with OAuth (GitHub/Google/Microsoft)
- [ ] Student email is NOT stored in database
- [ ] Student joins class via invite link anonymously
- [ ] Teacher sees pseudonym only for anonymous students
- [ ] Teacher bulk-imports student emails
- [ ] Student sees join request (without email displayed)
- [ ] Student joins with consent
- [ ] Teacher can now see student's real identity
- [ ] Student can join second class anonymously
- [ ] Export roster only includes emails for consented students

## Privacy Verification

After implementation, verify:
1. `SELECT email FROM users WHERE accountType = 'student'` → All NULL
2. No student emails in IdentityRevealRequest table (deprecated)
3. PreAuthorizedStudent only contains pseudonym hashes
4. ClassMembership.identityConsent correctly controls visibility

## Deployment Notes

1. Run migration script on production
2. Clear all student emails from database
3. Force re-authentication for existing students (OAuth only)
4. Monitor for any email leaks in logs
5. Update privacy policy to reflect zero-email-storage for students
