# Teacher Broadcast and Student Work Viewing System

Extend the real-time events system so teachers can broadcast annotations to classes and view/annotate student work.

## Core Principle

**Persist first, broadcast second.** Every teacher annotation is always saved to the database. Broadcasting is a feature that happens as a side effect of saving - if students are online, they see updates in real-time; if not, they see them when they load the page.

## Requirements Summary

- **Interactive overlay**: Teachers add feedback annotations on top of student work
- **New records with target**: Store teacher annotations with `targetType`/`targetId` fields
- **Live broadcast**: Students see teacher strokes in real-time (always subscribed, no opt-out)
- **All data types**: Annotations, code, snaps, quiz answers visible to teachers
- **Show all at once**: When viewing a student, display all data types simultaneously
- **Client-side merging**: Different colors for class vs individual feedback, with toggle to show/hide
- **Context-driven targeting**: Teacher's class/student selection automatically determines targetType/targetId

---

## Schema Changes

### Extend UserData Model

**File:** `prisma/schema.prisma` (lines 505-523)

Add two new fields to enable targeted annotations:

```prisma
model UserData {
  // ... existing fields ...

  // NEW: Targeting for teacher broadcasts and feedback
  targetType  String?  @map("target_type")  // null | 'class' | 'student'
  targetId    String?  @map("target_id")    // classId or studentId

  // Update unique constraint
  @@unique([userId, adapter, itemId, targetType, targetId])

  // Add index for querying broadcasts/feedback
  @@index([targetType, targetId, adapter, itemId])
}
```

**Migration:** Add columns, backfill existing rows with `null`, update unique constraint.

---

## Event Types

### Add New Events

**File:** `src/lib/events/types.ts`

```typescript
// Already exists, will use as-is:
interface TeacherAnnotationsUpdateEvent {
  type: 'teacher-annotations-update'
  classId: string
  pageId: string
  canvasData: string
  timestamp: number
}

// NEW: Teacher feedback to individual student
interface TeacherFeedbackEvent {
  type: 'teacher-feedback'
  studentId: string
  pageId: string
  adapter: string  // 'annotations', etc.
  timestamp: number
}

// NEW: Broadcast mode indicator
interface BroadcastModeEvent {
  type: 'broadcast-mode'
  classId: string
  pageId: string
  active: boolean
  teacherId: string
}
```

---

## API Endpoints

### 1. Extend Existing Sync Endpoint (Unified Save + Broadcast)

**File:** `src/app/api/user-data/sync/route.ts`

Extend `SyncItem` interface to support targeting:

```typescript
interface SyncItem {
  adapter: string
  itemId: string        // pageId
  data: string
  version: number
  updatedAt: number
  // NEW: Optional targeting for teacher broadcasts
  targetType?: 'class' | 'student'  // null = personal data
  targetId?: string                  // classId or studentId
}
```

**Behavior changes:**
- If `targetType` is set, verify user is a teacher and owns the class (or student is in their class)
- Upsert with `targetType`/`targetId` included in unique key
- After save, publish to appropriate channel:
  - `targetType='class'` → publish to `class:{targetId}`
  - `targetType='student'` → publish to `user:{targetId}`

**Benefits of extending existing endpoint:**
- Reuses version control, conflict resolution, batch processing
- Same debouncing/sync engine on client
- Consistent patterns across all user data

### 2. Fetch Student's Work (Teacher)

```
GET /api/classes/[classId]/students/[studentId]/user-data
  ?pageId={pageId}
  &adapters=annotations,code,snaps,quiz-q1
```

Returns all requested data types for teacher viewing.

### 3. Fetch Teacher Annotations (Student)

```
GET /api/student/teacher-annotations?pageId={pageId}
```

Returns both:
- Class broadcasts (where student is enrolled)
- Individual feedback (targeted at this student)

Response structure:
```typescript
{
  classAnnotations: Array<{
    classId: string
    className: string
    data: AnnotationData
    updatedAt: number
  }>
  individualFeedback: {
    data: AnnotationData
    updatedAt: number
  } | null
}
```

---

## Context Changes

### Extend TeacherClassContext

**File:** `src/contexts/teacher-class-context.tsx`

```typescript
interface SelectedStudent {
  id: string
  displayName: string
  pseudonym: string
}

type ViewMode = 'my-view' | 'class-broadcast' | 'student-view'

interface TeacherClassContextValue {
  selectedClass: SelectedClass | null
  setSelectedClass: (classData: SelectedClass | null) => void
  selectedStudent: SelectedStudent | null       // NEW
  setSelectedStudent: (student: SelectedStudent | null) => void  // NEW
  viewMode: ViewMode                            // NEW
  isTeacher: boolean
  isLoading: boolean
}
```

---

## Component Changes

### 1. Extend ClassSelectorFAB

**File:** `src/components/teacher/class-selector-fab.tsx`

- When class selected, show student dropdown
- Fetch students via `/api/classes/[id]/students`
- Display view mode: "My View" | "Class: {name}" | "Student: {name}"
- Add broadcast mode toggle button

### 2. Create TeacherAnnotationLayer

**New file:** `src/components/teacher/teacher-annotation-layer.tsx`

Wraps annotation canvas for teacher with:
- `class-broadcast` mode: Strokes broadcast in real-time (throttled 100ms)
- `student-view` mode: Shows student annotations read-only, teacher draws feedback layer

### 3. Create useTeacherBroadcast Hook

**New file:** `src/hooks/use-teacher-broadcast.ts`

For students to receive teacher annotations:
- Fetches initial state from `/api/student/teacher-annotations`
- Subscribes to `teacher-annotations-update` and `teacher-feedback` events
- Returns `{ classBroadcast, individualFeedback }`

### 4. Modify AnnotationLayer

**File:** `src/components/annotations/annotation-layer.tsx`

Add overlay layers for students:
```
[Student's own annotations - editable]
[Teacher class broadcast - read-only, blue strokes, z-index 15]
[Teacher individual feedback - read-only, red/orange strokes, z-index 20]
```

**Toggle control:** Add button/toggle in annotation toolbar to show/hide teacher feedback layers.

### 5. Create StudentWorkViewer

**New file:** `src/components/teacher/student-work-viewer.tsx`

Displays read-only view of student's:
- Annotations (canvas overlay)
- Code (read-only editors)
- Snaps (image gallery)
- Quiz answers (with correctness)

---

## Event Flow

### Teacher Broadcasting to Class

```
Teacher draws -> handleStrokeComplete() -> buffer strokes
  | (every 100ms)
POST /api/teacher/broadcast
  |
Upsert UserData (targetType='class', targetId=classId)
  |
eventBus.publish('class:{classId}', TeacherAnnotationsUpdateEvent)
  |
Students receive via SSE -> update classBroadcast state
```

### Teacher Viewing/Annotating Student Work

```
Teacher selects student -> GET student user-data
  |
Display StudentWorkViewer (read-only layers)
  |
Teacher draws feedback -> POST /api/teacher/feedback
  |
Upsert UserData (targetType='student', targetId=studentId)
  |
eventBus.publish('user:{studentId}', TeacherFeedbackEvent)
  |
Student receives via SSE -> update individualFeedback state
```

---

## Layer Structure

### Student View (receiving teacher annotations)
```
z-0:  Page content
z-10: Student's own annotations (editable)
z-15: Teacher class broadcast (read-only, blue, 80% opacity)
z-20: Teacher individual feedback (read-only, red, 90% opacity)
```

### Teacher Student View (giving feedback)
```
z-0:  Page content
z-10: Student's annotations (read-only, gray/muted)
z-15: Teacher feedback layer (editable, red strokes)
```

---

## Implementation Order

### Phase 1: Schema & Core API
1. Add `targetType`, `targetId` fields to UserData schema
2. Run migration
3. Extend `/api/user-data/sync` to handle targeting + broadcast events
4. Create `/api/student/teacher-annotations` endpoint
5. Create `/api/classes/[id]/students/[studentId]/user-data` endpoint

### Phase 2: Event System
6. Add `TeacherFeedbackEvent`, `BroadcastModeEvent` to types.ts
7. Verify SSE stream subscriptions work for new event types

### Phase 3: Teacher UI
8. Extend TeacherClassContext with `selectedStudent`, `viewMode`
9. Extend ClassSelectorFAB with student dropdown
10. Extend sync engine to pass `targetType`/`targetId` when teacher has selection
11. Create StudentWorkViewer component

### Phase 4: Student UI
12. Create `useTeacherBroadcast` hook (fetch + subscribe)
13. Modify AnnotationLayer to render teacher overlay layers
14. Add toggle to show/hide teacher feedback
15. Style teacher annotations distinctly (blue for class, red/orange for individual)

### Phase 5: Polish
16. Add broadcast mode visual indicators
17. Test end-to-end flows (class broadcast, individual feedback, persistence)

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add targetType, targetId to UserData |
| `src/lib/events/types.ts` | Add TeacherFeedbackEvent, BroadcastModeEvent |
| `src/app/api/user-data/sync/route.ts` | Handle targeting + publish events |
| `src/lib/userdata/sync-engine.ts` | Pass targetType/targetId from context |
| `src/contexts/teacher-class-context.tsx` | Add selectedStudent, viewMode state |
| `src/components/teacher/class-selector-fab.tsx` | Student dropdown, view mode display |
| `src/components/annotations/annotation-layer.tsx` | Teacher overlay layers + toggle |
| `src/app/api/student/teacher-annotations/route.ts` | NEW: Fetch teacher annotations |
| `src/app/api/classes/[id]/students/[studentId]/user-data/route.ts` | NEW: Fetch student work |
| `src/hooks/use-teacher-broadcast.ts` | NEW: Student receives broadcasts |
| `src/components/teacher/student-work-viewer.tsx` | NEW: View student work |
