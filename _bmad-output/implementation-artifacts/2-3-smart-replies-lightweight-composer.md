# Story 2.3: Smart Replies & Lightweight Composer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want AI to generate draft responses with one tap,
so that I can reply instantly without typing.

## Acceptance Criteria

1. **Given** the user is viewing an email thread with a loaded AI summary  
   **When** the AI summary is displayed  
   **Then** 2-3 `SmartReplyChip` components must appear below the `AISummaryCard` with job-seeker-appropriate labels (e.g., "Yes, schedule it", "No, not interested", "I'll follow up")

2. **Given** the user taps a `SmartReplyChip`  
   **When** the chip is tapped  
   **Then** the chip must show a loading spinner while the AI generates a draft  
   **And** the AI must generate a full draft response via a POST to `/api/draft` on the BFF

3. **Given** the AI draft is returned  
   **When** the draft is ready  
   **Then** the `LightweightComposer` overlay must slide up from the bottom with the draft pre-filled in the textarea  
   **And** the textarea must auto-focus immediately when the composer opens

4. **Given** the `LightweightComposer` is open  
   **When** the user edits the draft text  
   **Then** the textarea must expand vertically (auto-height) to fit the content without a scrollbar

5. **Given** the user taps "Send" in the composer  
   **When** the send action fires  
   **Then** the app must trigger an optimistic UI update (no real network call required for MVP)  
   **And** the composer must collapse (slide down)  
   **And** the user must be returned to the inbox (`navigate('/')`)

6. **Given** the user taps "Discard" in the composer  
   **When** the discard action fires  
   **Then** the composer must collapse and the thread view must be restored without navigation

## Tasks / Subtasks

- [x] Task 1: Extend AI service with `generateDraft` (AC: 2)
  - [x] Add `DraftSchema = z.object({ draft: z.string() })` to `app/services/ai.server.ts`
  - [x] Implement `generateDraft(thread: { subject: string; snippet: string; body?: string }[], chipLabel: string): Promise<{ draft: string }>` using `generateObject` + Gemini Flash
  - [x] Prompt must produce a concise, professional reply email body (no salutation/sign-off needed — UI adds them if desired)
  - [x] Function throws on error — caller (`api.draft.ts`) is responsible for fallback

- [x] Task 2: Create BFF draft route `app/routes/api.draft.ts` (AC: 2)
  - [x] Handle POST requests; body shape: `{ thread: { subject, snippet, body? }[], chipLabel: string }`
  - [x] Call `generateDraft` and return `{ draft: string, isError: false }` on success
  - [x] Return `{ draft: "Unable to generate draft at this time.", isError: true }` on failure (status 200)
  - [x] Type action as `({ request }: { request: Request })` — NOT `Route.ActionArgs` (test compat pattern, see `api.summarize.ts`)
  - [x] Register in `app/routes.ts`: `route("/api/draft", "routes/api.draft.ts")` — APPEND ONLY

- [x] Task 3: Create `SmartReplyChip` component (AC: 1, 2)
  - [x] Create `app/components/ui/SmartReplyChip.tsx` and `app/components/ui/SmartReplyChip.module.css`
  - [x] Props: `label: string`, `onClick: () => void`, `isLoading?: boolean`, `disabled?: boolean`
  - [x] Pill shape: `border-radius: 20px`, border `1.5px solid var(--color-ai-accent)`, color `var(--color-ai-accent)`
  - [x] States: default (outlined), loading (show inline spinner, disable pointer), disabled (opacity 0.5)
  - [x] Minimum touch target 44px tall (WCAG 2.1 — see `--touch-target` CSS var)
  - [x] No hardcoded HEX, no Tailwind

- [x] Task 4: Create `LightweightComposer` component (AC: 3, 4, 5, 6)
  - [x] Create `app/components/ui/LightweightComposer.tsx` and `app/components/ui/LightweightComposer.module.css`
  - [x] Props: `draft: string`, `onSend: (text: string) => void`, `onDiscard: () => void`
  - [x] Layout: `position: fixed; bottom: 0; left: 0; right: 0` overlay with slide-up animation
  - [x] Animation: CSS `transform: translateY(100%)` → `translateY(0)` using `var(--transition-base)` (250ms ease)
  - [x] Textarea: `autoFocus` attr + `useRef` + `useEffect` to call `.focus()` on mount
  - [x] Textarea auto-height: `onInput` handler sets `el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'`; `overflow-y: hidden`
  - [x] "Send" button: `var(--color-primary)` background, full width or right-aligned
  - [x] "Discard" button: text-only, `var(--color-text-secondary)` color
  - [x] Local state: `useState(draft)` to track user edits; init value = `draft` prop

- [x] Task 5: Integrate chips + composer into `app/routes/thread.$threadId.tsx` (AC: 1-6)
  - [x] Add `const draftFetcher = useFetcher<DraftResult>()` (separate from `summarizeFetcher`)
  - [x] Add `const [composerOpen, setComposerOpen] = useState(false)` and `const [selectedChip, setSelectedChip] = useState<string | null>(null)`
  - [x] Render `SmartReplyChip` list only when `displaySummary` is non-null (summary loaded, not loading)
  - [x] Use hardcoded chip labels: `["Yes, schedule it", "No, not interested", "I'll follow up"]`
  - [x] On chip tap: set `selectedChip`, POST to `/api/draft` via `draftFetcher.submit` with thread emails + chipLabel
  - [x] `useEffect` watching `draftFetcher.data` → when data arrives and `!data.isError`: `setComposerOpen(true)`
  - [x] Derive `isDraftLoading = draftFetcher.state !== "idle"` to pass to the active chip as `isLoading`
  - [x] Render `<LightweightComposer>` when `composerOpen` is true with `draft={draftFetcher.data?.draft ?? ""}`
  - [x] `onSend`: `setComposerOpen(false)` → `navigate('/')` (inbox root)
  - [x] `onDiscard`: `setComposerOpen(false)`, reset `selectedChip` to null

- [x] Task 6: Write tests (AC: 1-6)
  - [x] `app/services/ai.server.test.ts`: add tests for `generateDraft` — success case and error case
  - [x] `app/routes/api.draft.test.ts`: test POST handler — success, malformed body, AI failure fallback
  - [x] `app/components/ui/SmartReplyChip.test.tsx`: test default render, loading state, disabled state, onClick fires
  - [x] `app/components/ui/LightweightComposer.test.tsx`: test auto-focus, draft pre-fill, Send calls onSend with edited text, Discard calls onDiscard
  - [x] Verify `npm test` passes all tests (0 regressions)

### Review Findings

- [x] [Review][Patch] Draft generation can run with an empty or malformed thread [app/routes/api.draft.ts:15]
- [x] [Review][Patch] Draft route accepts unsupported methods and arbitrary chip labels [app/routes/api.draft.ts:8]
- [x] [Review][Patch] Draft prompt context is unbounded and not isolated from email instructions [app/services/ai.server.ts:90]
- [x] [Review][Patch] Draft failure leaves the user with no visible result or error [app/routes/thread.$threadId.tsx:90]
- [x] [Review][Patch] Composer closes by immediate unmount, so Send/Discard have no slide-down collapse [app/routes/thread.$threadId.tsx:125]
- [x] [Review][Patch] Composer textarea misses required autoFocus attr, initial auto-height, and draft prop sync [app/components/ui/LightweightComposer.tsx:14]
- [x] [Review][Patch] Tests miss required autofocus, auto-height, close animation, and draft validation coverage [app/components/ui/LightweightComposer.test.tsx:8]

## Dev Notes

### AI Service Pattern
- `generateDraft` must live in `app/services/ai.server.ts` (server-only, `.server.ts` suffix enforced by React Router)
- Follow the exact same pattern as `summarizeThread`: `generateObject` + Zod schema + `google("gemini-2.5-flash")`
- `generateDraft` THROWS on error; `api.draft.ts` wraps it in try/catch with FALLBACK constant (same pattern as `api.summarize.ts`)

### BFF Route Pattern (CRITICAL — prevents test failures)
- `api.draft.ts` must type action as `({ request }: { request: Request })` — NOT `Route.ActionArgs`
- This matches the established pattern in `api.summarize.ts` (Story 2.2 learned: `+types/api.summarize` not generated at test time)
- Return `new Response(JSON.stringify(...), { status: 200, headers: { "Content-Type": "application/json" } })` — not `json()` helper

### LightweightComposer — Slide Animation
- Implement the slide animation with a CSS class that the component always has; the mount itself triggers the animation since `translateY(0)` is the default and the animation runs on mount via `@keyframes composerSlideUp`
- Alternative: use `translate(0,100%)` initially with a transition — simplest approach given CSS Modules:
  ```css
  .overlay {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    transform: translateY(100%);
    animation: composerSlideUp var(--transition-base) forwards;
  }
  @keyframes composerSlideUp {
    to { transform: translateY(0); }
  }
  ```

### Textarea Auto-Height Pattern
```tsx
const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
  setText(el.value);
};
```
Set initial `rows={3}` to reserve space; `overflow-y: hidden` on the textarea.

### Chip Loading State — Which Chip is Loading
- Track `selectedChip` label in state to know which chip to show loading spinner on
- Other chips: `disabled={isDraftLoading}` to prevent double-tap
- `isDraftLoading = draftFetcher.state !== "idle"`

### thread.$threadId.tsx — Preserved Behaviors
- All existing summarization logic (`summarizeFetcher`, `useLiveQuery` for cache) MUST NOT change
- Back button and email list rendering MUST be preserved
- `AISummaryCard` stays above the chips — chips render between `AISummaryCard` and the email list
- `LightweightComposer` renders OUTSIDE the main scroll container (fixed overlay)

### Send — Optimistic Only (MVP)
- No real email send network call — this is MVP scope
- `onSend` immediately calls `navigate('/')` after closing composer
- No Dexie writes needed for send (no "sent" mailbox in scope per PRD)

### CSS — Styling Rules
- All CSS in `.module.css` files — no inline styles on new components (existing thread.$threadId.tsx inline styles acceptable as-is)
- Variables: `var(--color-ai-accent)`, `var(--color-primary)`, `var(--color-text-secondary)`, `var(--color-surface)`, `var(--color-border)`
- Transition: `var(--transition-base)` (250ms ease), `var(--transition-fast)` (150ms ease)
- Touch target: `min-height: var(--touch-target)` (44px) on chips

### Testing — Critical Patterns from Story 2.2
- Add `afterEach(() => cleanup())` in all component test files (prevents DOM state leak between tests)
- `fake-indexeddb` for any Dexie-touching tests: `import "fake-indexeddb/auto"`
- BFF route tests: import action directly, call with `new Request(url, { method: "POST", body: JSON.stringify(...) })`
- Mock `~/services/ai.server` in BFF route tests with `vi.mock`

### Project Structure Notes
- `SmartReplyChip.tsx` → `app/components/ui/` (pure, stateless presentation)
- `LightweightComposer.tsx` → `app/components/ui/` (stateful but self-contained, no DB access)
- `api.draft.ts` → `app/routes/` (BFF, server-only)
- `generateDraft` → extend `app/services/ai.server.ts` (DO NOT create new service file)
- `app/models/db.client.ts` → DO NOT MODIFY (no schema changes needed)
- `app/routes.ts` → APPEND ONLY: `route("/api/draft", "routes/api.draft.ts")`

### References

- [Source: _output/planning-artifacts/epics.md#Story 2.3: Smart Replies & Lightweight Composer]
- [Source: _output/planning-artifacts/ux-design-specification.md#3. SmartReplyChip]
- [Source: _output/planning-artifacts/ux-design-specification.md#4. LightweightComposer]
- [Source: _output/planning-artifacts/ux-design-specification.md#Email Detail & AI Reply flow]
- [Source: _output/implementation-artifacts/2-2-thread-summarization-the-ask.md#Dev Agent Record]
- [Source: _output/project-context.md#Critical Implementation Rules]
- [Source: app/services/ai.server.ts] — extend with `generateDraft`
- [Source: app/routes/api.summarize.ts] — BFF pattern to replicate
- [Source: app/routes/thread.$threadId.tsx] — integration target
- [Source: app/index.css] — CSS variables reference

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 — Agent Dev

### Debug Log References

- Pre-existing test `summarizeThread > returns fallback summary when AI throws` was incorrectly testing a fallback path that doesn't exist in the service (fallback lives in `api.summarize.ts`). Fixed test to use `.rejects.toThrow()` — correctly documents that `summarizeThread` throws on error.
- `SmartReplyChip.test.tsx`: `toBeDisabled()` matcher from `@testing-library/jest-dom` not configured in project. Replaced with native `.disabled` property check — matches pattern used by other test files.

### Completion Notes List

- ✅ `generateDraft` added to `app/services/ai.server.ts` with `DraftSchema` (Zod), throws on error for caller to handle.
- ✅ BFF route `app/routes/api.draft.ts` created; typed as `{ request: Request }` per established pattern; registered in `app/routes.ts`.
- ✅ `SmartReplyChip` component: pill shape with `var(--color-ai-accent)` border/color, inline spinner on loading, `min-height: var(--touch-target)` WCAG compliance, CSS Modules.
- ✅ `LightweightComposer` component: `position: fixed` slide-up overlay via `@keyframes composerSlideUp`, auto-focus via `useRef` + `useEffect`, auto-height textarea via `onInput` scrollHeight, Send/Discard buttons, `prefers-reduced-motion` respected.
- ✅ `thread.$threadId.tsx` updated: `draftFetcher` wired to `/api/draft`; chips render only when `displaySummary` loaded; composer opens on draft arrival; Send → `navigate('/')`, Discard → collapse only. All existing summarization logic preserved.
- ✅ Tests: 56/56 passing, 0 regressions. New test files: `api.draft.test.ts` (5 tests), `SmartReplyChip.test.tsx` (5 tests), `LightweightComposer.test.tsx` (5 tests); extended `ai.server.test.ts` (3 new tests).

### File List

- `app/services/ai.server.ts` — modified (added `generateDraft`, `DraftSchema`)
- `app/routes/api.draft.ts` — new
- `app/routes.ts` — modified (route registration appended)
- `app/components/ui/SmartReplyChip.tsx` — new
- `app/components/ui/SmartReplyChip.module.css` — new
- `app/components/ui/LightweightComposer.tsx` — new
- `app/components/ui/LightweightComposer.module.css` — new
- `app/routes/thread.$threadId.tsx` — modified (draftFetcher, SmartReplyChip, LightweightComposer integration)
- `app/services/ai.server.test.ts` — modified (added `generateDraft` tests, fixed `summarizeThread` error test)
- `app/routes/api.draft.test.ts` — new
- `app/components/ui/SmartReplyChip.test.tsx` — new
- `app/components/ui/LightweightComposer.test.tsx` — new

### Change Log

- 2026-05-16: Story 2.3 implementation complete. Added smart replies feature: AI draft generation service, BFF route, SmartReplyChip component, LightweightComposer overlay, thread view integration, and full test coverage.
- 2026-05-16: Code review patches applied. Hardened draft validation/prompting, added composer close animation and textarea sync/auto-height coverage, surfaced draft failures, and expanded tests.
