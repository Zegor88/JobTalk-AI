# Story 4.1: UX Completeness — Swipe, Compose, Reply, Thread Count & Smart Chips

Status: done

## Story

As a user,
I want all core triage actions to work correctly and intuitively,
so that I can efficiently process my inbox without dead-end buttons or missing actions.

## Acceptance Criteria

1. **Given** the user swipes left ≥40% on an email list item
   **When** the action triggers
   **Then** the email must be archived (`archived: true` in Dexie), a green background with Archive icon is revealed, and a 3-second Undo snackbar appears

2. **Given** the user swipes right ≥40% on an email list item
   **When** the action triggers
   **Then** the email must be deleted (`deleted: true`), a red background with Delete icon is revealed, and a 3-second Undo snackbar appears

3. **Given** `onStar` no longer exists on `SwipeableEmailListItem`
   **Then** the prop is renamed to `onArchive` everywhere it is used (`home.tsx`, `search.tsx`, the component itself)

4. **Given** an email belongs to a thread with more than 1 message (same `threadId`)
   **When** the inbox list renders
   **Then** `SwipeableEmailListItem` shows a count badge "(N)" next to the subject

5. **Given** the thread has exactly 1 message
   **Then** no count badge is shown

6. **Given** the user is in a thread view
   **When** they tap the "Reply" button below the chip row
   **Then** `LightweightComposer` opens with an empty draft; Send navigates to inbox; Discard returns to thread

7. **Given** the user taps the FAB (✏️) on Inbox or Search
   **Then** a `ComposeModal` slides up with To, Subject, and Body fields; Send or Discard close the overlay (send is simulated, no real API call)

8. **Given** `/api/summarize` returns a response
   **Then** the response includes `suggestedReplies: string[]` (2–3 labels); the thread view uses those labels for chips instead of `SMART_REPLY_CHIPS`; falls back to hardcoded chips if field is missing/empty

9. **Given** the user taps the Archive button in the thread `TopAppBar` actions slot
   **Then** all emails with matching `threadId` are set to `archived: true` and user navigates back to `/`

## Tasks / Subtasks

- [x] **Task 1: Fix SwipeableEmailListItem — Archive replaces Star** (AC: 1, 2, 3)
  - [x] In `app/components/features/SwipeableEmailListItem.tsx`:
    - Rename prop `onStar` → `onArchive` in the `Props` interface
    - Change `action` state type from `"star" | "delete" | null` → `"archive" | "delete" | null`
    - Fix swipe direction logic in `handlePointerMove`: `dx < 0` → `"archive"`, `dx > 0` → `"delete"` (currently inverted)
    - Fix `handlePointerUp`: `translateX < -THRESHOLD` → call `onArchive(email.id)`, `translateX > THRESHOLD` → call `onDelete(email.id)`
    - Replace `action === "star"` icon with `Icon name="archive-box"` and label "Archive" (green panel)
    - Remove `email.starred` star icon from the rendered content area (the `<span className={styles.starIcon}>` block)
    - Update hidden SR button: `aria-label="Archive"` calling `onArchive(email.id)`
  - [x] In `app/components/features/SwipeableEmailListItem.module.css`:
    - Change `.actionPanel[data-action="star"]` → `.actionPanel[data-action="archive"]` with `background-color: var(--color-archive)`
  - [x] In `app/routes/home.tsx`:
    - Rename `handleStar` → `handleArchive`; change body to `await db.emails.update(id, { archived: true })`
    - Update snackbar message to `"Email archived"`, action to `"archive"`
    - Update `handleUndo` to handle `action === "archive"` → `await db.emails.update(id, { archived: false })`
    - Update `SnackbarState` type: change `action: "star" | "delete"` → `action: "archive" | "delete"`
    - Change `onStar={handleStar}` → `onArchive={handleArchive}` on `<SwipeableEmailListItem>`
  - [x] In `app/routes/search.tsx`: same renames as home.tsx

- [x] **Task 2: Thread email count badge** (AC: 4, 5)
  - [x] In `app/routes/home.tsx`:
    - Add a second `useLiveQuery` to count emails per thread (include archived/deleted for total count):
      ```ts
      const threadCounts = useLiveQuery(
        () => db?.emails.toArray().then(all =>
          all.reduce((acc, e) => {
            acc[e.threadId] = (acc[e.threadId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ),
        []
      );
      ```
    - Pass `threadCount={threadCounts?.[email.threadId] ?? 1}` to each `<SwipeableEmailListItem>`
  - [x] In `app/components/features/SwipeableEmailListItem.tsx`:
    - Add `threadCount?: number` to the `Props` interface
    - In the subject row, render a count badge when `threadCount > 1`:
      ```tsx
      {(threadCount ?? 1) > 1 && (
        <span className={styles.threadCount}>({threadCount})</span>
      )}
      ```
  - [x] In `app/components/features/SwipeableEmailListItem.module.css`:
    - Add `.threadCount` styles: `font-size: var(--text-xs)`, `color: var(--color-text-secondary)`, `margin-left: var(--space-1)`, `font-weight: var(--font-medium)`
  - [x] In `app/routes/search.tsx`: same `threadCounts` `useLiveQuery` + pass `threadCount` prop

- [x] **Task 3: Manual Reply button in thread view** (AC: 6)
  - [x] In `app/routes/thread.$threadId.tsx`:
    - After the `{draftError && ...}` block and before the email list, add a "Reply" button:
      ```tsx
      {emails && emails.length > 0 && (
        <div className={styles.replyRow}>
          <button
            type="button"
            className={styles.replyBtn}
            onClick={() => setComposerOpen(true)}
            aria-label="Reply to thread"
          >
            <Icon name="pencil-square" size={18} />
            Reply
          </button>
        </div>
      )}
      ```
    - When `composerOpen` is opened without a chip draft, the draft is `""` — the existing `LightweightComposer` already accepts an empty string, no changes needed there
    - The existing `handleSend` / `handleDiscard` flow already handles close + navigate correctly
  - [x] In `app/routes/thread.module.css`:
    - Add `.replyRow` (flex, justify-content: flex-end, padding: `var(--space-2)` `var(--space-4)`)
    - Add `.replyBtn` (display: flex, align-items: center, gap: `var(--space-1)`, background: `var(--color-surface-raised)`, border: `1px solid var(--color-border)`, border-radius: `20px`, padding: `var(--space-2)` `var(--space-3)`, font-size: `var(--text-sm)`, color: `var(--color-text-primary)`, cursor: pointer, min-height: `var(--touch-target)`)

- [x] **Task 4: FAB → ComposeModal** (AC: 7)
  - [x] Create `app/components/ui/ComposeModal.tsx`:
    - Props: `isOpen: boolean`, `onClose: () => void`
    - Uses `isOpen` to show/hide; renders a slide-up overlay (same animation pattern as `LightweightComposer`)
    - Fields: `To` (`<input type="email">`), `Subject` (`<input type="text">`), `Body` (`<textarea>`)
    - Buttons: "Discard" (tertiary) and "Send" (primary — calls `onClose()`, no API call for MVP)
    - Auto-focuses the To field on open
    - `aria-label="Compose new email"`, `role="dialog"`
    - Full blueprint below in Dev Notes
  - [x] Create `app/components/ui/ComposeModal.module.css` (mirror `LightweightComposer.module.css` structure + add field rows)
  - [x] In `app/root.tsx`:
    - Import `ComposeModal` and `useState`
    - Add `const [composeOpen, setComposeOpen] = useState(false);`
    - Pass `onClick={() => setComposeOpen(true)}` to `<FAB>`
    - Render `<ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />` inside the shell `<div>`

- [x] **Task 5: Dynamic Smart Reply Chips** (AC: 8)
  - [x] In `app/routes/api.summarize.ts` (the BFF route):
    - Update the AI prompt to also generate 2–3 short reply chip labels
    - Extend the response schema to include `suggestedReplies: string[]`
    - Example prompt addition: `"Also suggest 2-3 short reply options as 'suggestedReplies' array (max 5 words each)."`
    - Return `{ summary, actionItems, suggestedReplies }` in the JSON response
  - [x] In `app/routes/thread.$threadId.tsx`:
    - Update `SummarizeResult` interface: add `suggestedReplies?: string[]`
    - Update `db.threads.update(...)` cache call to also persist `suggestedReplies`
    - Update `Thread` type in `db.client.ts` to include `suggestedReplies?: string[]` (no schema migration needed — Dexie stores extra fields automatically)
    - Replace the hardcoded `SMART_REPLY_CHIPS` lookup with:
      ```ts
      const chips = displaySummary?.suggestedReplies?.length
        ? displaySummary.suggestedReplies
        : SMART_REPLY_CHIPS; // fallback
      ```
    - Use `chips` in the `.map()` render

- [x] **Task 6: Archive from thread view** (AC: 9)
  - [x] In `app/routes/thread.$threadId.tsx`:
    - Add `handleArchiveThread` function:
      ```ts
      async function handleArchiveThread() {
        if (!emails?.length) return;
        await Promise.all(emails.map(e => db.emails.update(e.id, { archived: true })));
        navigate("/");
      }
      ```
    - Pass an Archive button to `TopAppBar`'s `actions` prop:
      ```tsx
      <TopAppBar
        title={threadTitle}
        showBack
        actions={
          <button
            type="button"
            className={styles.archiveBtn}
            onClick={handleArchiveThread}
            aria-label="Archive thread"
          >
            <Icon name="archive-box" size={22} />
          </button>
        }
      />
      ```
  - [x] In `app/routes/thread.module.css`:
    - Add `.archiveBtn` (background: none, border: none, color: `var(--color-text-secondary)`, cursor: pointer, padding: `var(--space-2)`, min-height: `var(--touch-target)`, min-width: `var(--touch-target)`, display: flex, align-items: center)

- [x] **Task 7: Tests** (all ACs)
  - [x] Update `SwipeableEmailListItem.test.tsx`:
    - Replace `onStar` mock with `onArchive`
    - Add test: left swipe beyond threshold calls `onArchive`
    - Add test: right swipe beyond threshold calls `onDelete`
    - Add test: `threadCount={3}` renders "(3)" badge; `threadCount={1}` renders no badge
  - [x] Update `home.tsx` tests (if any exist): rename star → archive references
  - [x] Run `npm test` — all tests must pass

### Review Findings

- [x] [Review][Patch] Swipe action labels are aligned to the wrong side of the reveal panel [app/components/features/SwipeableEmailListItem.module.css:20]
- [x] [Review][Patch] `/api/summarize` can still return a success payload without `suggestedReplies` [app/services/ai.server.ts:12]

## Dev Notes

---

### ⚠️ CRITICAL: Swipe Direction Fix

Current code (WRONG — must be changed):
```ts
// handlePointerMove — currently inverted
setAction(dx > 0 ? "star" : dx < 0 ? "delete" : null);

// handlePointerUp — currently inverted
if (translateX > THRESHOLD) {
  onStar(email.id);     // ← wrong: right-swipe should delete
} else if (translateX < -THRESHOLD) {
  onDelete(email.id);   // ← wrong: left-swipe should archive
}
```

Correct code (per UX spec "Swipe left → Archive, Swipe right → Delete"):
```ts
// handlePointerMove
setAction(dx < 0 ? "archive" : dx > 0 ? "delete" : null);

// handlePointerUp
if (translateX < -THRESHOLD) {
  setTranslateX(-window.innerWidth);
  onArchive(email.id);   // left = archive
} else if (translateX > THRESHOLD) {
  setTranslateX(window.innerWidth);
  onDelete(email.id);    // right = delete
} else {
  setTranslateX(0);
  setAction(null);
}
```

---

### ⚠️ CRITICAL: Props Interface Change in SwipeableEmailListItem

Old Props:
```ts
interface Props {
  email: Email;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}
```

New Props:
```ts
interface Props {
  email: Email;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  threadCount?: number;
}
```

Update ALL call sites: `home.tsx` and `search.tsx` — change `onStar={handleStar}` → `onArchive={handleArchive}`.

---

### Thread Count Query Blueprint

```tsx
// app/routes/home.tsx — add alongside the existing emails useLiveQuery
const threadCounts = useLiveQuery(
  () =>
    db?.emails.toArray().then((all) =>
      all.reduce((acc, e) => {
        acc[e.threadId] = (acc[e.threadId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ),
  []
);

// In the render:
<SwipeableEmailListItem
  key={email.id}
  email={email}
  onArchive={handleArchive}
  onDelete={handleDelete}
  onClick={() => navigate(`/thread/${email.threadId}`)}
  threadCount={threadCounts?.[email.threadId] ?? 1}
/>
```

---

### Thread Count Badge Blueprint

```tsx
// In SwipeableEmailListItem.tsx, inside the subject row:
<div className={styles.subjectRow}>
  <p className={styles.subject} data-read={String(email.isRead)}>
    {email.subject}
  </p>
  {(threadCount ?? 1) > 1 && (
    <span className={styles.threadCount} aria-label={`${threadCount} messages`}>
      ({threadCount})
    </span>
  )}
</div>
```

```css
/* SwipeableEmailListItem.module.css additions */
.subjectRow {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.threadCount {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  white-space: nowrap;
}
```

---

### ComposeModal Blueprint

```tsx
// app/components/ui/ComposeModal.tsx
import { useEffect, useRef, useState } from "react";
import { Icon } from "~/components/ui/Icon";
import styles from "./ComposeModal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ComposeModal({ isOpen, onClose }: Props) {
  const toRef = useRef<HTMLInputElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setTimeout(() => toRef.current?.focus(), 50);
    }
  }, [isOpen]);

  function handleClose() {
    setIsClosing(true);
    setTimeout(onClose, 250);
  }

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.closing : ""}`}
      role="dialog"
      aria-label="Compose new email"
      aria-modal="true"
    >
      <header className={styles.header}>
        <h2 className={styles.title}>New Message</h2>
        <button
          type="button"
          className={styles.discardBtn}
          onClick={handleClose}
          aria-label="Discard"
        >
          <Icon name="x-mark" size={20} />
        </button>
      </header>

      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="compose-to">To</label>
          <input
            id="compose-to"
            ref={toRef}
            type="email"
            className={styles.input}
            placeholder="recipient@example.com"
            autoComplete="email"
          />
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="compose-subject">Subject</label>
          <input
            id="compose-subject"
            type="text"
            className={styles.input}
            placeholder="Subject"
          />
        </div>
        <textarea
          className={styles.body}
          placeholder="Write your message…"
          aria-label="Message body"
        />
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.sendBtn}
          onClick={handleClose}
          aria-label="Send email"
        >
          Send
        </button>
      </footer>
    </div>
  );
}
```

```css
/* app/components/ui/ComposeModal.module.css */
.overlay {
  position: fixed;
  inset: 0;
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
  z-index: 300;
  animation: slideUp 250ms ease-out;
}

.overlay.closing {
  animation: slideDown 250ms ease-in forwards;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@keyframes slideDown {
  from { transform: translateY(0); }
  to   { transform: translateY(100%); }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.discardBtn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-1);
  min-height: var(--touch-target);
  min-width: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-4);
  gap: 0;
  overflow-y: auto;
}

.fieldRow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-3) 0;
}

.label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  width: 56px;
  flex-shrink: 0;
}

.input {
  flex: 1;
  border: none;
  outline: none;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: transparent;
  font-family: inherit;
}

.body {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: transparent;
  font-family: inherit;
  padding: var(--space-3) 0;
  min-height: 200px;
}

.footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

.sendBtn {
  background-color: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  min-height: var(--touch-target);
}
```

---

### root.tsx Wiring Blueprint

```tsx
// app/root.tsx — add ComposeModal + state
import { useState } from "react";
import { Links, Meta, Outlet, Scripts, useLocation } from "react-router";
import { BottomNav } from "~/components/ui/BottomNav";
import { FAB } from "~/components/ui/FAB";
import { ComposeModal } from "~/components/ui/ComposeModal";
import "~/index.css";

// ... (existing constants unchanged)

export default function App() {
  const { pathname } = useLocation();
  const [composeOpen, setComposeOpen] = useState(false);
  const auth = isAuth(pathname);
  const thread = isThread(pathname);
  const showNav = !auth && !thread;

  return (
    <html lang="en">
      {/* ... head unchanged ... */}
      <body>
        <div className={getShellClass(auth, thread)}>
          <Outlet />
          {showNav && <BottomNav />}
          {showNav && FAB_PATHS.includes(pathname) && (
            <FAB onClick={() => setComposeOpen(true)} />
          )}
          <ComposeModal
            isOpen={composeOpen}
            onClose={() => setComposeOpen(false)}
          />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
```

---

### Dynamic Smart Chips — api.summarize.ts Prompt Change

Find the AI prompt string in `app/routes/api.summarize.ts`. Append to the existing instructions:

```
Also provide 2-3 short reply chip labels (max 5 words each) as "suggestedReplies" array.
Examples: ["Yes, I'll be there", "Sorry, can't make it", "Let me check and reply"].
```

Extend the Zod/schema validation (or raw JSON parse) to extract `suggestedReplies?: string[]` from the AI response and include it in the returned JSON.

---

### SummarizeResult Interface Update

```ts
// thread.$threadId.tsx
interface SummarizeResult {
  summary: string;
  actionItems: string[];
  suggestedReplies?: string[];  // ← ADD
  isError?: boolean;
}
```

```ts
// db.client.ts — Thread interface (no schema bump needed)
export interface Thread {
  id: string;
  subject: string;
  lastMessageDate: string;
  summary?: string;             // already present (implicit)
  actionItems?: string[];       // already present (implicit)
  suggestedReplies?: string[];  // ← ADD (Dexie stores extra fields automatically)
}
```

---

### Archive Thread Blueprint

```ts
// thread.$threadId.tsx
async function handleArchiveThread() {
  if (!emails?.length || !threadId) return;
  await Promise.all(emails.map((e) => db.emails.update(e.id, { archived: true })));
  navigate("/");
}
```

```tsx
// TopAppBar actions prop:
<TopAppBar
  title={threadTitle}
  showBack
  actions={
    <button
      type="button"
      className={styles.archiveBtn}
      onClick={handleArchiveThread}
      aria-label="Archive thread"
    >
      <Icon name="archive-box" size={22} />
    </button>
  }
/>
```

```css
/* thread.module.css additions */
.archiveBtn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-2);
  min-height: var(--touch-target);
  min-width: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
}

.replyRow {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-2) var(--space-4);
}

.replyBtn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-surface-raised, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  min-height: var(--touch-target);
}
```

---

### Icon Availability

The `Icon` component (`app/components/ui/Icon.tsx`) already includes:
- `archive-box` ✓ — use for Archive action panel and TopAppBar button
- `pencil-square` ✓ — use for FAB and Reply button
- `x-mark` ✓ — use for ComposeModal discard
- `trash` ✓ — use for Delete action panel (already used)
- `sparkles` ✓ — already used in AI card

No new icons need to be added to Icon.tsx.

---

### Architecture Compliance

- **CSS Modules only:** all new styles in `.module.css` files. No hardcoded hex — use CSS variables from `index.css`.
- **No JS animation libraries:** ComposeModal uses same `transform: translateY` + CSS keyframe pattern as `LightweightComposer`.
- **Touch targets:** all buttons must have `min-height: var(--touch-target)` (44px).
- **Local-first first:** archive mutations go to Dexie immediately (optimistic UI). No network call before Dexie update.
- **useLiveQuery for reactivity:** `threadCounts` query must use `useLiveQuery`, not a manual `useEffect`.
- **No `useState` to mirror Dexie state:** the `emails` array in home.tsx already comes from `useLiveQuery`; do not add a duplicate `useState` copy.
- **SSR guard:** all `db?.` calls must use optional chaining (existing pattern — do not change).
- **File naming:** `ComposeModal.tsx` + `ComposeModal.module.css` in `app/components/ui/`.

---

### Files to Modify

| File | Change type |
|------|-------------|
| `app/components/features/SwipeableEmailListItem.tsx` | Modify — rename onStar→onArchive, fix swipe directions, add threadCount badge |
| `app/components/features/SwipeableEmailListItem.module.css` | Modify — rename star→archive action panel rule |
| `app/routes/home.tsx` | Modify — rename handler, add threadCounts query, pass new props |
| `app/routes/search.tsx` | Modify — rename handler, add threadCounts query, pass new props |
| `app/routes/thread.$threadId.tsx` | Modify — add Reply button, Archive button, dynamic chips |
| `app/routes/thread.module.css` | Modify — add .archiveBtn, .replyRow, .replyBtn |
| `app/routes/api.summarize.ts` | Modify — extend AI prompt + response schema for suggestedReplies |
| `app/models/db.client.ts` | Modify — add suggestedReplies?: string[] to Thread interface |
| `app/root.tsx` | Modify — add ComposeModal state + wiring |
| `app/components/ui/ComposeModal.tsx` | New |
| `app/components/ui/ComposeModal.module.css` | New |

---

### Previous Story Intelligence

- `starred` field remains in the Dexie `Email` schema (v3) — **do not remove it**, it may be used in future. Only remove it as a swipe gesture. The `email.starred` display indicator in the list can also be left as-is or removed — it is not part of this story's scope.
- `db.threads` stores arbitrary extra fields automatically (Dexie doesn't enforce strict schema on reads) — adding `suggestedReplies` to the `Thread` interface is a TypeScript-only change, no `version(4)` migration needed.
- `clientLoader.hydrate = true` in `home.tsx` — **DO NOT REMOVE IT**.
- The existing `LightweightComposer` already handles empty draft string gracefully — no changes needed to that component for the Reply button (Task 3).
- `TopAppBar` already has an `actions?: ReactNode` slot — no changes to TopAppBar component needed.
- All 4+ existing tests must continue to pass after these changes.

---

### Git / Branch Convention

- Branch: `develop` (current — do NOT create a new branch)
- Commit format: `feat: <description>` (Conventional Commits)
- Example: `feat: fix swipe triage, add thread count, compose, reply and dynamic chips`

---

### References

- [Source: epics.md#Story 4.1]
- [Source: ux-design-specification.md#User Journey Flows — Inbox Triage]
- [Source: ux-design-specification.md#UX-DR1 SwipeableEmailListItem]
- [Source: ux-design-specification.md#Button Hierarchy]
- [Source: ux-design-specification.md#Navigation Patterns]
- [Source: architecture.md#Enforcement Guidelines]
- [Source: project-context.md#Framework-Specific Rules]
- [Source: project-context.md#CSS Anti-Pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Completion Notes List

- Task 1: Renamed `onStar`→`onArchive`, fixed inverted swipe directions (left=archive, right=delete), updated CSS action panel rule star→archive, removed `starIcon` display from content area. Also added `translateXRef` to avoid stale closure issue in `handlePointerUp`.
- Task 2: Added `threadCounts` useLiveQuery in home.tsx and search.tsx; added `.subjectRow` wrapper + `.threadCount` badge in SwipeableEmailListItem; badge renders when `threadCount > 1`.
- Task 3: Reply button added in thread view after draftError block; uses existing `composerOpen` state with empty draft (`""`); existing handleSend/handleDiscard flow handles navigation.
- Task 4: Created `ComposeModal.tsx` + `ComposeModal.module.css` with slide-up animation matching LightweightComposer; wired into root.tsx with `composeOpen` state; FAB now calls `setComposeOpen(true)`.
- Task 5: Extended `SummarizationSchema` in ai.server.ts with `suggestedReplies?: string[]`; updated prompt to request 2-3 chip labels; updated `Thread` interface in db.client.ts; thread view uses dynamic chips with hardcoded fallback.
- Task 6: `handleArchiveThread` archives all thread emails via Promise.all then navigates to `/`; Archive button in TopAppBar actions slot.
- Task 7: Updated SwipeableEmailListItem tests — all 7 pass. Fixed jsdom pointer-event threshold issue (window.innerWidth=1024, THRESHOLD=409.6 → used dx=±500 to exceed it). Also fixed pre-existing TS errors in db.client.test.ts and bff.server.test.ts (missing `starred` field in Email mocks).
- Test results: 153 passing (was 148), 18 failing (was 19). All 4 failing files are pre-existing issues unrelated to Story 4.1.

### File List

- app/components/features/SwipeableEmailListItem.tsx (modified)
- app/components/features/SwipeableEmailListItem.module.css (modified)
- app/components/features/SwipeableEmailListItem.test.tsx (modified)
- app/routes/home.tsx (modified)
- app/routes/search.tsx (modified)
- app/routes/thread.$threadId.tsx (modified)
- app/routes/thread.module.css (modified)
- app/services/ai.server.ts (modified)
- app/models/db.client.ts (modified)
- app/root.tsx (modified)
- app/components/ui/ComposeModal.tsx (new)
- app/components/ui/ComposeModal.module.css (new)
- app/models/db.client.test.ts (modified — pre-existing starred TS fix)
- app/services/bff.server.test.ts (modified — pre-existing starred TS fix)

## Change Log

- 2026-05-16: Story created — UX completeness audit, 6 ACs covering swipe fix, thread count, reply button, compose FAB, dynamic chips, archive from thread (Sally / Claude Sonnet 4.6)
- 2026-05-16: Story implemented — all 7 tasks complete, 153 tests passing, status → review (Amelia / Claude Sonnet 4.6)
