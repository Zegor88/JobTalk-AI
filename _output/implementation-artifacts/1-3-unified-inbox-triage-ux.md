# Story 1.3: Unified Inbox & Triage UX

Status: done

## Story

As a user,
I want to quickly archive or delete emails with a swipe,
so that I can triage my inbox effortlessly.

## Acceptance Criteria

1. **Given** the user is viewing the Unified Inbox
   **When** the user swipes left on an email list item ≥40% of screen width
   **Then** the UI must instantly reveal a green Archive action background and optimistically remove the item from the list (Dexie `archived=true` + filter via `useLiveQuery`)
2. **Given** an item has just been archived or deleted
   **When** the action completes
   **Then** a 3-second Snackbar must appear at the bottom of the screen with an "Undo" button; clicking Undo must restore `archived=false` / `deleted=false` in Dexie, instantly re-rendering the item in the list via `useLiveQuery`
3. **Given** a screen reader user is navigating the inbox
   **When** focusing on an email list item
   **Then** visually hidden `<button>` elements with `aria-label="Archive"` and `aria-label="Delete"` must be present and functional (trigger same Dexie mutation as swipe)
4. **Given** the user taps on an email list item
   **When** the tap registers (without triggering swipe logic)
   **Then** the app must navigate to `/thread/:threadId` which reads from Dexie via `useLiveQuery` — zero network call

## Tasks / Subtasks

- [x] Task 1: Dexie Schema Migration v1 → v2 (AC: 1, 2) ⚠️ MUST DO FIRST
  - [x] Open `app/models/db.client.ts`
  - [x] Add `archived: boolean` and `deleted: boolean` fields to the `Email` interface
  - [x] Add `version(2).stores({...})` migration block — include `archived` and `deleted` as indexed fields (see **Dexie Migration Blueprint**)
  - [x] Update `app/services/mock.server.ts` — add `archived: false, deleted: false` to all 10 mock email objects

- [x] Task 2: Create `SwipeableEmailListItem` Component (AC: 1, 3)
  - [x] Create `app/components/features/SwipeableEmailListItem.tsx`
  - [x] Create `app/components/features/SwipeableEmailListItem.module.css`
  - [x] Implement pointer events gesture detection (see **Swipe Gesture Blueprint**)
  - [x] Swipe left (Archive): green (#22c55e is forbidden — use `var(--color-archive)` — add to `index.css`) background reveal
  - [x] Swipe right (Delete): red (`var(--color-danger)`) background reveal
  - [x] 40% screen-width threshold auto-triggers action; <40% snaps back
  - [x] Include visually hidden `<button aria-label="Archive">` and `<button aria-label="Delete">` (see SR Blueprint)
  - [x] Display: sender initial avatar circle, subject, snippet, relative date, `priorityScore` badge slot (leave empty for now — Story 2.1 fills it)
  - [x] Add `will-change: transform` to swipeable element for 60fps

- [x] Task 3: Create `Snackbar` Component (AC: 2)
  - [x] Create `app/components/ui/Snackbar.tsx`
  - [x] Create `app/components/ui/Snackbar.module.css`
  - [x] Slides in from bottom via CSS `transform: translateY(100%)` → `translateY(0)` transition
  - [x] Props: `message: string`, `onUndo: () => void`, `onDismiss: () => void`
  - [x] Auto-dismiss after 3000ms (use `useEffect` + `setTimeout`; clear on unmount)
  - [x] `position: fixed; bottom: calc(var(--nav-height) + var(--space-4))`

- [x] Task 4: Update `home.tsx` for Optimistic Triage (AC: 1, 2, 4)
  - [x] Update `useLiveQuery` query to filter: `.filter(e => !e.archived && !e.deleted)`
  - [x] Wrap each list item with `<SwipeableEmailListItem>`
  - [x] Add `snackbarState: { message: string; emailId: string; action: 'archive' | 'delete' } | null` via `useState`
  - [x] On archive: `await db.emails.update(id, { archived: true })` → show Snackbar
  - [x] On delete: `await db.emails.update(id, { deleted: true })` → show Snackbar
  - [x] On Undo: `await db.emails.update(id, { archived: false, deleted: false })`
  - [x] Render `<Snackbar>` conditionally at bottom of page
  - [x] Tap on email item: `<Link to={`/thread/${email.threadId}`}>` (React Router `Link`)

- [x] Task 5: Create Thread View Route (AC: 4)
  - [x] Create `app/routes/thread.$threadId.tsx` (note: `$threadId` — React Router dynamic segment)
  - [x] Register in `app/routes.ts`: `route("/thread/:threadId", "routes/thread.$threadId.tsx")`
  - [x] Use `useParams` to get `threadId`
  - [x] Use `useLiveQuery(() => db?.emails.where("threadId").equals(threadId).toArray(), [threadId])`
  - [x] Display thread messages with subject, snippet, date — no network call

- [x] Task 6: Write Tests (AC: 1, 2, 3, 4)
  - [x] `app/components/features/SwipeableEmailListItem.test.tsx` — renders, shows hidden SR buttons
  - [x] `app/components/ui/Snackbar.test.tsx` — renders message, Undo click fires callback
  - [x] Update `app/models/db.client.test.ts` — add schema v2 test: archived/deleted fields persist and filter correctly
  - [x] Run `npm test` — ALL tests must pass including BottomNav (regression)

## Dev Notes

---

### ⚠️ CRITICAL: Dexie Schema Migration Blueprint

The Email schema from Story 1.2 is **v1** and lacks `archived`/`deleted`. You **MUST** bump to `version(2)` — failing to do this causes IndexedDB errors for users with cached v1 data.

```ts
// app/models/db.client.ts — full replacement
import Dexie, { type EntityTable } from "dexie";

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  date: string;          // ISO 8601
  isRead: boolean;
  priorityScore: "high" | "low" | null;
  archived: boolean;     // ← NEW in v2
  deleted: boolean;      // ← NEW in v2
}

export interface Thread {
  id: string;
  subject: string;
  lastMessageDate: string;
}

class JobTalkDB extends Dexie {
  emails!: EntityTable<Email, "id">;
  threads!: EntityTable<Thread, "id">;

  constructor() {
    super("jobtalk-ai");
    this.version(1).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore",
      threads: "id, subject, lastMessageDate",
    });
    // v2: adds archived and deleted fields
    this.version(2).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore, archived, deleted",
      threads: "id, subject, lastMessageDate",
    }).upgrade(tx => {
      // Migrate existing rows — set defaults
      return tx.table("emails").toCollection().modify(email => {
        if (email.archived === undefined) email.archived = false;
        if (email.deleted === undefined) email.deleted = false;
      });
    });
  }
}

let db: JobTalkDB;
if (typeof window !== "undefined") {
  db = new JobTalkDB();
}
export { db };
```

---

### ⚠️ CRITICAL: Mock Data Update

Update ALL 10 emails in `app/services/mock.server.ts` to include `archived: false, deleted: false`:

```ts
{ id: "e1", threadId: "t1", ..., archived: false, deleted: false },
// repeat for all 10 emails
```

---

### ⚠️ CRITICAL: Route Registration

Append to `app/routes.ts` (do NOT remove existing routes):

```ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/api/sync", "routes/api.sync.ts"),
  route("/thread/:threadId", "routes/thread.$threadId.tsx"),  // ← ADD THIS
] satisfies RouteConfig;
```

---

### ⚠️ CRITICAL: Add CSS Tokens to `index.css`

Add to `:root` block in `app/index.css` (no hardcoded hex anywhere in components):

```css
/* Triage action colors */
--color-archive: #16a34a;   /* green-600 — Archive swipe reveal */
/* --color-danger already defined as #DC2626 — reuse for Delete */

/* Swipe gesture */
--swipe-action-width: 80px;
--transition-swipe: 200ms ease-out;
```

---

### Swipe Gesture Blueprint

Use **Pointer Events API** (works for both touch and mouse; no extra lib needed):

```tsx
// app/components/features/SwipeableEmailListItem.tsx
import { useRef, useState, type PointerEvent } from "react";
import styles from "./SwipeableEmailListItem.module.css";

interface Props {
  email: Email;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export function SwipeableEmailListItem({ email, onArchive, onDelete, onClick }: Props) {
  const startXRef = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [action, setAction] = useState<"archive" | "delete" | null>(null);
  const THRESHOLD = window.innerWidth * 0.4;

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    startXRef.current = e.clientX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const dx = e.clientX - startXRef.current;
    setTranslateX(dx);
    setAction(dx < 0 ? "archive" : dx > 0 ? "delete" : null);
  }

  function handlePointerUp() {
    if (translateX < -THRESHOLD) {
      onArchive(email.id);
    } else if (translateX > THRESHOLD) {
      onDelete(email.id);
    } else {
      setTranslateX(0); // Snap back
      setAction(null);
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* Action background — renders BEHIND the item */}
      <div
        className={styles.actionPanel}
        data-action={action}
        aria-hidden="true"
      />
      {/* Swipeable content */}
      <div
        className={styles.item}
        style={{ transform: `translateX(${translateX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { setTranslateX(0); setAction(null); }}
        onClick={onClick}
        role="listitem"
      >
        {/* Content */}
        <p className={styles.subject}>{email.subject}</p>
        <p className={styles.snippet}>{email.snippet}</p>

        {/* Screen Reader: visually hidden action buttons */}
        <button
          type="button"
          className={styles.srOnly}
          aria-label="Archive"
          onClick={e => { e.stopPropagation(); onArchive(email.id); }}
        >Archive</button>
        <button
          type="button"
          className={styles.srOnly}
          aria-label="Delete"
          onClick={e => { e.stopPropagation(); onDelete(email.id); }}
        >Delete</button>
      </div>
    </div>
  );
}
```

---

### CSS Module Blueprint

```css
/* app/components/features/SwipeableEmailListItem.module.css */
.wrapper {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
}

.actionPanel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  transition: background-color var(--transition-base);
}

.actionPanel[data-action="archive"] { background-color: var(--color-archive); }
.actionPanel[data-action="delete"] { background-color: var(--color-danger); }

.item {
  position: relative;
  padding: var(--space-4);
  background-color: var(--color-surface);
  will-change: transform;
  transition: transform var(--transition-swipe);
  touch-action: pan-y; /* Allow vertical scroll; horizontal is our swipe */
  min-height: var(--touch-target);
  cursor: pointer;
}

.subject {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.snippet {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

/* SR-only utility — visually hidden but accessible */
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

### Snackbar Blueprint

```tsx
// app/components/ui/Snackbar.tsx
import { useEffect } from "react";
import styles from "./Snackbar.module.css";

interface Props {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function Snackbar({ message, onUndo, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={styles.snackbar} role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" onClick={onUndo}>Undo</button>
    </div>
  );
}
```

```css
/* app/components/ui/Snackbar.module.css */
.snackbar {
  position: fixed;
  bottom: calc(var(--nav-height) + var(--space-4));
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--color-text-primary);
  color: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  z-index: 200;
  min-height: var(--touch-target);
  font-size: var(--text-sm);
  animation: slideUp 200ms ease-out;
}

.snackbar button {
  background: none;
  border: none;
  color: var(--color-ai-accent);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
  min-height: var(--touch-target);
  min-width: var(--touch-target);
}

@keyframes slideUp {
  from { transform: translateX(-50%) translateY(100%); }
  to   { transform: translateX(-50%) translateY(0); }
}
```

---

### Home Route Update Blueprint

Key changes to `app/routes/home.tsx`:

```tsx
import { useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { SwipeableEmailListItem } from "~/components/features/SwipeableEmailListItem";
import { Snackbar } from "~/components/ui/Snackbar";

// ... (meta + clientLoader unchanged from Story 1.2)

type SnackbarState = { emailId: string; message: string; action: "archive" | "delete" } | null;

export default function Home() {
  const emails = useLiveQuery(
    () => db?.emails.filter(e => !e.archived && !e.deleted).toArray(),
    []
  );
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  async function handleArchive(id: string) {
    await db.emails.update(id, { archived: true });
    setSnackbar({ emailId: id, message: "Email archived", action: "archive" });
  }

  async function handleDelete(id: string) {
    await db.emails.update(id, { deleted: true });
    setSnackbar({ emailId: id, message: "Email deleted", action: "delete" });
  }

  async function handleUndo() {
    if (!snackbar) return;
    await db.emails.update(snackbar.emailId, { archived: false, deleted: false });
    setSnackbar(null);
  }

  return (
    <main style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Inbox</h1>
      {!emails ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      ) : emails.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Inbox zero! 🎉</p>
      ) : (
        <ul style={{ listStyle: "none" }}>
          {emails.map(email => (
            <SwipeableEmailListItem
              key={email.id}
              email={email}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onClick={() => {/* navigation handled by Link inside component */}}
            />
          ))}
        </ul>
      )}
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          onUndo={handleUndo}
          onDismiss={() => setSnackbar(null)}
        />
      )}
    </main>
  );
}
```

> **Note:** The `onClick` on `SwipeableEmailListItem` should navigate. You can either pass `navigate(\`/thread/${email.threadId}\`)` (using `useNavigate`) or wrap the content area in `<Link to={...}>`. If using `<Link>`, ensure click events don't conflict with pointer swipe detection — use `onClick` on the surrounding `<div>` and stop propagation in SR buttons.

---

### Thread Route Blueprint

```tsx
// app/routes/thread.$threadId.tsx
import { useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";

export function meta() {
  return [{ title: "JobTalk AI — Thread" }];
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();

  const emails = useLiveQuery(
    () => db?.emails
      .where("threadId")
      .equals(threadId ?? "")
      .sortBy("date"),
    [threadId]
  );

  return (
    <main style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Thread</h1>
      {!emails ? (
        <p>Loading…</p>
      ) : emails.map(email => (
        <div key={email.id} style={{ marginBottom: "var(--space-4)", padding: "var(--space-4)", backgroundColor: "var(--color-surface)", borderRadius: "8px" }}>
          <p style={{ fontWeight: "var(--font-semibold)", fontSize: "var(--text-sm)" }}>{email.subject}</p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>{email.date}</p>
          <p style={{ marginTop: "var(--space-2)" }}>{email.snippet}</p>
        </div>
      ))}
    </main>
  );
}
```

---

### Architecture Compliance

- **Local-First:** UI mutations go to Dexie FIRST, `useLiveQuery` auto-updates DOM. No network call before action.
- **CSS Modules:** `SwipeableEmailListItem.module.css` and `Snackbar.module.css` — NO inline styles except CSS variable `style={{}}` references.
- **No hardcoded hex** anywhere — use only tokens from `index.css`.
- **No JS animation libs** — all transitions via `transition` + `transform` CSS only.
- **Touch targets:** `.item` min-height = `var(--touch-target)` (44px). Snackbar Undo button: 44px × 44px.
- **File suffixes:** `SwipeableEmailListItem.tsx` in `app/components/features/` (feature-aware, uses Email type). `Snackbar.tsx` in `app/components/ui/` (pure/dumb — no Dexie calls).
- **Route file naming:** `thread.$threadId.tsx` matches React Router dynamic segment convention established in architecture.md.

---

### Previous Story Intelligence (Story 1.2)

- `home.tsx` currently has `useLiveQuery(() => db?.emails.orderBy("date").reverse().toArray(), [])` — you MUST change this query to add `.filter(e => !e.archived && !e.deleted)`.
- Dexie singleton exported from `app/models/db.client.ts` — guard `db?.` is critical before any method call (SSR safety).
- `clientLoader.hydrate = true` is already set in `home.tsx` — **DO NOT REMOVE IT**.
- `app/routes.ts` already has `index` + `/api/sync` — only ADD the `/thread/:threadId` route, don't replace existing.
- `app/index.css` already has `--color-danger: #DC2626` and `--transition-base: 250ms ease` — reuse these. ADD `--color-archive` and `--transition-swipe`.
- 4 tests currently pass (2 DB + 2 BottomNav) — your changes must not regress these.

---

### Cross-Story Context

- **Story 2.1** will read `email.priorityScore` and render a badge in `SwipeableEmailListItem`. Add a `{/* priority badge slot */}` comment in the component for easy injection.
- **Story 2.2** will add `AISummaryCard` to the thread view — keep `thread.$threadId.tsx` structure simple and extensible.
- **Story 2.3** will add `SmartReplyChip` — no impact on this story.

---

### Git / Branch Convention

- Branch: `develop` (current — do NOT create a new branch)
- Commit format: `feat: <description>` (Conventional Commits)
- Example: `feat: implement swipeable inbox triage with optimistic undo snackbar`

---

### References

- [Source: epics.md#Story 1.3]
- [Source: ux-design-specification.md#SwipeableEmailListItem]
- [Source: ux-design-specification.md#Feedback Patterns]
- [Source: ux-design-specification.md#Swipe Patterns]
- [Source: ux-design-specification.md#Accessibility Strategy]
- [Source: architecture.md#Enforcement Guidelines]
- [Source: architecture.md#Component Boundaries]
- [Source: architecture.md#Structure Patterns]
- [Source: project-context.md#Framework-Specific Rules]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking) — Agent Dev — validate-create-story

### Completion Notes List

- validate-create-story applied: 8 critical issues fixed, 5 enhancements added, 3 optimizations applied
- CRITICAL FIX: Dexie schema migration v1→v2 blueprint added (archived/deleted fields + `.upgrade()` migration)
- CRITICAL FIX: Mock data update instruction added (archived/deleted default false for all 10 emails)
- CRITICAL FIX: Route registration for `/thread/:threadId` explicitly documented with exact `app/routes.ts` diff
- CRITICAL FIX: Swipe gesture blueprint using Pointer Events API (not vague "CSS transform" instruction)
- CRITICAL FIX: CSS Module blueprints for both components provided (`.module.css` files)
- CRITICAL FIX: `useLiveQuery` filter updated to exclude `archived`/`deleted` items (home.tsx query change)
- CRITICAL FIX: Snackbar state shape (`SnackbarState` type) and all handler functions blueprinted
- CRITICAL FIX: Thread route uses `useParams` + `useLiveQuery` — no network call, instant load
- ENHANCEMENT: Added `--color-archive` and `--transition-swipe` tokens to `index.css` instruction
- ENHANCEMENT: `touch-action: pan-y` on `.item` to prevent scroll conflict with swipe
- ENHANCEMENT: `will-change: transform` for 60fps swipe animation
- ENHANCEMENT: SR button `e.stopPropagation()` to prevent accidental navigation
- ENHANCEMENT: Cross-story priority badge slot comment added for Story 2.1
- IMPLEMENTATION: Successfully implemented SwipeableEmailListItem and Snackbar, integrated into home.tsx with Optimistic UI updates to Dexie v2. Created Thread view.
- IMPLEMENTATION: All tests pass, including new ones for SwipeableEmailListItem and Snackbar, and updated db.client.test.ts. Fix applied to tests for React testing-library `cleanup()` between tests.
- Story 1.3 status updated to: review

### File List

- `app/models/db.client.ts` (modified)
- `app/services/mock.server.ts` (modified)
- `app/index.css` (modified)
- `app/routes.ts` (modified)
- `app/routes/home.tsx` (modified)
- `app/routes/thread.$threadId.tsx` (new)
- `app/components/features/SwipeableEmailListItem.tsx` (new)
- `app/components/features/SwipeableEmailListItem.module.css` (new)
- `app/components/features/SwipeableEmailListItem.test.tsx` (new)
- `app/components/ui/Snackbar.tsx` (new)
- `app/components/ui/Snackbar.module.css` (new)
- `app/components/ui/Snackbar.test.tsx` (new)
- `app/models/db.client.test.ts` (modified)

## Change Log

- 2026-05-15: validate-create-story applied — 8 critical issues resolved, full implementation blueprints added (Amelia / Claude Sonnet 4.6 Thinking)
- 2026-05-15: Completed implementation of all tasks — added SwipeableEmailListItem, Snackbar, Dexie v2 migration, and thread view route. All tests passing. (Amelia / Gemini 3.1 Pro Low)

### Review Findings
- [x] [Review][Patch] Pointer events firing on hover [`SwipeableEmailListItem.tsx`:52] — `handlePointerMove` does not check if pointer is down (`isDraggingRef` relies on `dx > 5` regardless of click). This triggers swipe on hover.
- [x] [Review][Patch] Missing inbox date sorting [`home.tsx`:48] — `useLiveQuery` drops `.orderBy("date").reverse()` from Story 1.2, replacing it with only `.filter(...)`, removing sorting.
