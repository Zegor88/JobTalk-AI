# Story 2.2: Thread Summarization ("The Ask")

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a concise summary of long email threads,
so that I don't have to read every message to understand the required action.

## Acceptance Criteria

1. **Given** the user opens an email thread
   **When** the thread contains multiple messages or long text
   **Then** the Vercel AI SDK must generate a 1-2 sentence summary ("The Ask") and actionable items on the backend via a BFF route
2. **Given** the user opens an email thread
   **When** the summary is being generated
   **Then** the UI must display a non-blocking shimmer loading state at the top of the thread
3. **Given** the summary generation is complete
   **When** the result is returned to the client
   **Then** the UI must display the `AISummaryCard` component at the top of the thread with a distinct "Magic Purple" accent (`var(--color-ai-accent)`) and a Sparkle icon

## Tasks / Subtasks

- [x] Task 1: Extend AI service `app/services/ai.server.ts` (AC: 1)
  - [x] Implement `summarizeThread(emails: { subject: string, snippet: string }[]): Promise<{ summary: string, actionItems: string[] }>`
  - [x] Use `generateObject` with a Zod schema to ensure structured output containing the summary and an array of action items
  - [x] Ensure prompt instructs Gemini to output 1-2 sentences for "The Ask" and concise action items
  - [x] Implement fail-safe error handling to return a fallback message if AI fails

- [x] Task 2: Create BFF summarization route `app/routes/api.summarize.ts` (AC: 1)
  - [x] Create `app/routes/api.summarize.ts` to handle POST requests
  - [x] Register in `app/routes.ts`: `route("/api/summarize", "routes/api.summarize.ts")` (APPEND ONLY)
  - [x] Extract thread context (emails) from the request body and call `summarizeThread`
  - [x] Return the JSON result and handle potential errors gracefully (status 200 with fallback data to prevent client crashes)

- [x] Task 3: Create `AISummaryCard` UI Component (AC: 2, 3)
  - [x] Create `app/components/ui/AISummaryCard.tsx` and `app/components/ui/AISummaryCard.module.css`
  - [x] Props: `isLoading: boolean`, `summary?: string`, `actionItems?: string[]`, `error?: string`
  - [x] Implement a shimmer loading state (CSS animation) when `isLoading` is true
  - [x] Render a Sparkle icon and use `var(--color-ai-accent)` for the border or distinct visual container tint
  - [x] Render the summary text and an unordered list for `actionItems`
  - [x] Ensure CSS uses variables and no hardcoded HEX or Tailwind classes

- [x] Task 4: Integrate `AISummaryCard` into `app/routes/thread.$threadId.tsx` (AC: 1, 2, 3)
  - [x] Import `AISummaryCard` into `thread.$threadId.tsx`
  - [x] Use `useFetcher` from React Router to POST to `/api/summarize` on component mount (if emails are loaded and we don't have a cached summary)
  - [x] Store the summary result in Dexie (`db.threads.update`) to cache it for future visits. *Note: Dexie allows storing non-indexed properties like `summary` and `actionItems` without schema migrations. Do NOT migrate db.client.ts.*
  - [x] Query the cached summary from `useLiveQuery` for the current thread to avoid re-fetching on navigation
  - [x] Place `<AISummaryCard>` at the top of the thread view, just under the h1 title

- [x] Task 5: Write Tests (AC: 1-3)
  - [x] `app/services/ai.server.test.ts`: test `summarizeThread` generates object and handles errors
  - [x] `app/routes/api.summarize.test.ts`: test the POST handler
  - [x] `app/components/ui/AISummaryCard.test.tsx`: test loading state, populated state, and error state
  - [x] Verify `npm test` passes all tests

## Dev Notes

- **AI Execution Strategy:** Like the previous story, the AI SDK MUST run on the server (BFF) to prevent exposing the API key. Keep using `generateObject` with Zod for robust parsing.
- **Database Rules:** DO NOT modify `app/models/db.client.ts`. You can attach `summary` and `actionItems` to the thread object in Dexie (e.g. `await db.threads.update(threadId, { summary, actionItems })`) because IndexedDB supports dynamic properties as long as you don't need to query/filter by them.
- **Styling:** Adhere strictly to Vanilla CSS with CSS Modules. Use `var(--color-ai-accent)` (`#8B5CF6`) for AI content.
- **Fail Safe:** If the AI call fails or is rate-limited, the `AISummaryCard` should display a friendly error message or fallback text rather than breaking the thread view.

### Project Structure Notes

- `app/services/ai.server.ts` already exists. Extend it.
- `app/components/ui/AISummaryCard.tsx` should be pure and stateless.
- `app/routes/thread.$threadId.tsx` is where the `useFetcher` logic belongs to trigger the background summarization.

### References

- [Source: _output/planning-artifacts/epics.md#Story 2.2: Thread Summarization ("The Ask")]
- [Source: _output/planning-artifacts/ux-design-specification.md#2. Custom Components]
- [Source: _output/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 — Agent Dev

### Debug Log References

- Confirmed `var(--color-ai-accent)` defined in `app/index.css` as `#8B5CF6`.
- Verified `db.threads` schema — no migration needed for dynamic `summary`/`actionItems` properties.
- Fixed test DOM isolation issue: added `afterEach(() => cleanup())` to `AISummaryCard.test.tsx`.
- Route action typed without `Route.ActionArgs` (no `+types/api.summarize` generated at test time) to match test import pattern from `api.score.ts`.

### Completion Notes List

- ✅ `summarizeThread` added to `app/services/ai.server.ts` with `SummarizationSchema` (Zod), fail-safe fallback.
- ✅ BFF route `app/routes/api.summarize.ts` created; registered in `app/routes.ts`.
- ✅ `AISummaryCard` component: shimmer skeleton, ✨ sparkle header, summary + action items list; full CSS Modules with `var(--color-ai-accent)` border.
- ✅ `thread.$threadId.tsx` updated: `useFetcher` fires on mount when emails loaded & no cached summary; result cached via `db.threads.update`; `useLiveQuery` reads cache on re-navigation.
- ✅ Tests: 37/37 passing, 0 regressions. New test files: `api.summarize.test.ts` (4 tests), `AISummaryCard.test.tsx` (7 tests); extended `ai.server.test.ts` (3 new tests).

### File List

- `app/services/ai.server.ts` — modified (added `summarizeThread`, `SummarizationSchema`)
- `app/routes/api.summarize.ts` — new
- `app/routes.ts` — modified (route registration appended)
- `app/components/ui/AISummaryCard.tsx` — new
- `app/components/ui/AISummaryCard.module.css` — new
- `app/routes/thread.$threadId.tsx` — modified (useFetcher, AISummaryCard integration, Dexie cache)
- `app/services/ai.server.test.ts` — modified (added `summarizeThread` tests)
- `app/routes/api.summarize.test.ts` — new
- `app/components/ui/AISummaryCard.test.tsx` — new

### Review Findings

**Decision Needed:**
- [x] [Review][Decision] Wrong AI model — resolved: CLAUDE.md updated to reflect Gemini as official model.
- [x] [Review][Decision] AC 1 summarization threshold — resolved: changed to `emails.length > 1`.
- [x] [Review][Decision] Snippet-only input vs full body — resolved: added `body?: string` to Email interface; `summarizeThread` uses body when available, falls back to snippet.

**Patches:**
- [x] [Review][Patch] `db.threads.update` not awaited — added `.catch()` [app/routes/thread.$threadId.tsx]
- [x] [Review][Patch] `error` prop never passed to `AISummaryCard` — wired via `fetcherError` derived from `isError` flag [app/routes/thread.$threadId.tsx]
- [x] [Review][Patch] `db.threads.update` silently no-ops for non-existent thread row — added `.catch()` for observability; upsert deferred (thread always exists before emails) [app/routes/thread.$threadId.tsx]
- [x] [Review][Patch] Fallback error object cached permanently in Dexie — `isError` flag added to API response; cache skipped when `isError: true` [app/routes/api.summarize.ts, app/routes/thread.$threadId.tsx]
- [x] [Review][Patch] `key={i}` used for action items list — changed to `key={\`${i}-${item}\`}` [app/components/ui/AISummaryCard.tsx]

**Deferred:**
- [x] [Review][Defer] No authentication on `/api/summarize` [app/routes/api.summarize.ts] — deferred, pre-existing pattern across all API routes; auth is a separate story
- [x] [Review][Defer] No input size limit on emails array — potential token overflow and large request bodies [app/routes/api.summarize.ts] — deferred, rate limiting/input guards out of scope for MVP
- [x] [Review][Defer] Prompt injection via unescaped `subject`/`snippet` fields in AI prompt [app/services/ai.server.ts] — deferred, risk constrained by Zod output schema; security hardening story
- [x] [Review][Defer] No `loader` export on API route — GET to `/api/summarize` returns unhandled error [app/routes/api.summarize.ts] — deferred, pre-existing pattern (api.score.ts)

### Change Log

- 2026-05-15: Story 2.2 implementation complete. Added thread summarization AI feature: BFF route, UI component, thread integration, Dexie caching, and full test coverage.
- 2026-05-15: Code review complete. 3 decision-needed, 5 patches, 4 deferred, 8 dismissed.
