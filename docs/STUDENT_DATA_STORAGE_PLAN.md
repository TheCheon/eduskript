# Student Data Storage Plan

## Current State

- **PostgreSQL (Koyeb)**: App metadata (users, classes, permissions, content)
- **IndexedDB (Browser)**: Student code editor state, annotations, user preferences
- **Scaleway Object Storage**: Available for blob storage (snaps, files)

## Student Data Types

| Data Type | Size | Access Pattern | Current Storage |
|-----------|------|----------------|-----------------|
| Code editor state | ~10-50KB per page | Read/write frequently | IndexedDB |
| Annotations/drawings | ~5-20KB per page | Read/write frequently | IndexedDB |
| User preferences | <1KB | Read on load | IndexedDB |
| Snaps (images) | ~50-150KB each | Write once, read occasionally | Not persisted |

## Options Analysis

### Option 1: Local-First (Recommended)

**Architecture:**
- All student data stays in IndexedDB
- Export button lets students download their work
- Teachers get Scaleway bucket for sharing snaps to classes

**Pros:**
- Zero server cost for student data
- Fastest possible latency (local)
- Maximum privacy (data never leaves device)
- Scales infinitely (each student stores their own data)
- Works offline

**Cons:**
- Lost if browser data cleared
- No cross-device sync
- Students must manually export important work

**Cost:** $0 for student storage

### Option 2: Bucket-Only for Students

**Architecture:**
- Student data stored as JSON files in Scaleway bucket
- Path: `students/{pseudonym}/{pageId}.json`
- Snaps: `students/{pseudonym}/snaps/{snapId}.jpg`
- No PostgreSQL involvement for student work

**Pros:**
- Cross-device sync
- Survives browser clears
- Very cheap (~€0.012/GB/month)
- Simple - no DB schema changes

**Cons:**
- Network latency on every save
- Eventual consistency challenges
- Need to handle conflicts
- Privacy: data on server (even if encrypted)

**Cost estimate (3000 students, 50 snaps each):**
- Snaps: 18GB × €0.012 = €0.22/month
- JSON state: ~500MB × €0.012 = €0.006/month
- Total: ~€0.25/month

### Option 3: PostgreSQL for Metadata + Bucket for Blobs

**Architecture:**
- PostgreSQL: Student work metadata, references
- Bucket: Actual snap images, large blobs

**Pros:**
- Queryable metadata
- Can track student progress

**Cons:**
- Most expensive option
- PostgreSQL row per student interaction = DB bloat
- Overkill for personal study data

**Cost:** ~€20-30/month (DB) + €0.25 (storage)

### Option 4: Hybrid Local-First + Optional Cloud

**Architecture:**
- Default: IndexedDB (local)
- Optional: "Save to cloud" button syncs to Scaleway bucket
- Teachers: Always cloud-backed

**Pros:**
- Best of both worlds
- Students choose their privacy level
- Pay only for what's used

**Cons:**
- More complex implementation
- Two code paths to maintain

## Recommendation

### Phase 1: Local-First (Now)

Keep current IndexedDB approach for students:
- Code editor state ✓ (already implemented)
- Annotations ✓ (already implemented)
- Snaps: Add to IndexedDB, auto-cleanup after 30 days

Add "Export my work" feature for students who want backups.

### Phase 2: Teacher Cloud Storage (Next)

Implement Scaleway bucket for teachers only:
- Snaps they want to share with classes
- Shared annotations/highlights
- Lesson materials

### Phase 3: Optional Student Cloud (Future, if needed)

If students request cross-device sync:
- Implement bucket-based sync as opt-in
- Use pseudonym as folder path (privacy-preserving)
- Encrypt data at rest

## Implementation Details

### Scaleway Integration

```typescript
// Environment variables needed
SCW_ACCESS_KEY=xxx
SCW_SECRET_KEY=xxx
SCW_BUCKET_NAME=eduskript-data
SCW_REGION=fr-par
SCW_ENDPOINT=https://s3.fr-par.scw.cloud
```

### Bucket Structure (Phase 2+)

```
eduskript-data/
├── teachers/
│   └── {userId}/
│       ├── snaps/
│       │   └── {snapId}.jpg
│       └── shared/
│           └── {classId}/
│               └── {snapId}.jpg
└── students/  (Phase 3, opt-in only)
    └── {pseudonym}/
        ├── state/
        │   └── {pageId}.json
        └── snaps/
            └── {snapId}.jpg
```

### IndexedDB Schema (Current)

```typescript
// Already implemented in code-editor
interface UserPageData {
  pageId: string
  code: string
  files: FileData[]
  fontSize: number
  editorWidth: number
  canvasTransform: Transform
  versions: Version[]
}

// Add for snaps
interface SnapData {
  id: string
  pageId: string
  imageData: string  // base64 or blob URL
  position: { x: number, y: number }
  createdAt: Date
  expiresAt: Date  // 30 days from creation
}
```

## Cost Summary

| Scenario | Monthly Cost |
|----------|--------------|
| Local-only (current) | €0 |
| + Teacher cloud snaps | ~€1-5 |
| + Student opt-in cloud | ~€5-10 |
| Full cloud for everyone | ~€25-35 |

## Decision

**Go with Option 1 (Local-First) + Option 4 Phase 2 (Teacher Cloud)**

Rationale:
- Student data is personal study aids - doesn't need server persistence
- Teachers have legitimate sharing use cases worth paying for
- Can always add student cloud sync later if requested
- Simplest architecture, lowest cost, best privacy

## Next Steps

1. [ ] Add snap storage to IndexedDB with 30-day expiry
2. [ ] Add "Export my work" button for students
3. [ ] Implement Scaleway integration for teacher snaps
4. [ ] Add "Share snap to class" feature for teachers
