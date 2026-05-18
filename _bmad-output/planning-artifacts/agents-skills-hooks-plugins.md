# JobTalk AI — Agents, Skills, Hooks & Plugins

_Artifact Type: Planning Reference_
_Project: JobTalk AI_
_Date: 2026-05-18_

---

## 1. Claude Code Skills Used

Skills are prompt-layer modules that give Claude Code a specialized persona and workflow for a particular task. Each skill was invoked at a defined phase in the Agent OS methodology.

| Skill | Phase | Purpose in Workflow |
|---|---|---|
| `init` | Analysis | Bootstrapped `CLAUDE.md` with project identity, tech constraints, team roles, and phase definitions. Established the agent instruction layer before any planning work began. |
| `ui-ux-pro-max` | Planning | Drove the UX Design phase. Produced `ux-design-specification.md` and the interactive `ux-design-directions.html` prototype covering mobile gesture components (SwipeableEmailListItem, AISummaryCard, SmartReplyChip, LightweightComposer). |
| `claude-api` | Solutioning / Implementation | Guided the integration of the Vercel AI SDK (`ai`, `@ai-sdk/google`) and structured output patterns using `generateObject` + Zod schemas for all three AI inference routes. Ensured prompt caching best practices and fail-safe error handling. |
| `design-system` | Planning / Implementation | Informed the CSS variable token system (`--color-primary`, `--color-ai-accent`, `--space-*`) and enforced the no-Tailwind, no-hardcoded-HEX constraints documented in `project-context.md`. |
| `review` | Implementation | Performed code review passes against acceptance criteria after each story completion. Checked test coverage, TypeScript strictness, and architectural boundary compliance (`.server.ts` suffix isolation, no OAuth token leakage to client). |
| `security-review` | Implementation | Validated the BFF pattern for OAuth 2.0 — confirmed tokens never reach the React client, and that `requireSession` guards all `/api/sync` loader access. |
| `simplify` | Implementation | Applied after each story to eliminate redundant code, consolidate error handling patterns, and remove any gold-plating that exceeded story scope. |

---

## 2. App AI Agents

These are server-side AI inference endpoints built into the application. Each is a React Router v7 route file that calls the shared `app/services/ai.server.ts` service layer. All agents use `gemini-2.5-flash` via `@ai-sdk/google` with `generateObject` for structured, schema-validated output.

### 2.1 Priority Scoring Agent

- **Route file:** `app/routes/api.score.ts`
- **HTTP method:** POST
- **Input:** `{ emailId: string; subject: string; snippet: string }`
- **Output:** `{ emailId: string; priority: "high" | "low" }`
- **Model:** `gemini-2.5-flash` via `generateObject` + `PrioritySchema` (Zod)
- **Behavior:** Classifies each newly synced email as high or low priority for a job seeker context. Called fire-and-forget from the `clientLoader` after inbox sync; result is written directly to Dexie.js via `db.emails.update()`. `useLiveQuery` reactivity surfaces the priority badge with zero manual re-render.
- **Failure mode:** Returns `{ priority: "low" }` on any AI or network error. Inbox never blocks.

### 2.2 Thread Summarization Agent

- **Route file:** `app/routes/api.summarize.ts`
- **HTTP method:** POST
- **Input:** `{ emails: Array<{ subject, snippet, body? }> }`
- **Output:** `{ summary: string; actionItems: string[]; suggestedReplies: string[]; isError: boolean }`
- **Model:** `gemini-2.5-flash` via `generateObject` + `SummarizationSchema` (Zod)
- **Behavior:** Produces "The Ask" — a 1–2 sentence distillation of what a thread is asking of the user — plus extracted action items and 2–3 suggested reply starters. Rendered in the `AISummaryCard` component on the thread detail view.
- **Failure mode:** Returns a static fallback object with `isError: true` so the UI degrades gracefully.

### 2.3 Draft Generation Agent

- **Route file:** `app/routes/api.draft.ts`
- **HTTP method:** POST
- **Input:** `{ thread: Array<{ subject, snippet, body? }>; chipLabel: "Yes, schedule it" | "No, not interested" | "I'll follow up" }`
- **Output:** `{ draft: string; isError: boolean }`
- **Model:** `gemini-2.5-flash` via `generateObject` + `DraftSchema` (Zod)
- **Behavior:** Generates a full reply draft anchored to the user's intent chip selection. Input is validated with `DraftRequestSchema` (Zod, via `safeParse`) before the AI call. Draft is populated into the `LightweightComposer` overlay for editing before send.
- **Failure mode:** Returns a static fallback with `isError: true`. The composer remains open so the user can type manually.

### 2.4 Mail Sync Engine

- **Route file:** `app/routes/api.sync.ts`
- **HTTP method:** GET (loader)
- **Input:** Session cookie (resolved via `requireSession`)
- **Output:** Normalized email payload from Gmail or Microsoft Graph API
- **Model:** Not an LLM agent — this is the data ingestion layer that feeds the AI agents.
- **Behavior:** Reads the authenticated session's provider field, routes to `fetchGmailEmails` or `fetchMicrosoftEmails` in `bff.server.ts`, and returns a normalized payload. The `clientLoader` in `home.tsx` calls this route, writes results to Dexie.js, and then fans out fire-and-forget scoring requests to `api.score.ts` for all unscored emails.
- **Failure mode:** Returns `{ error: "sync_failed" }` with HTTP 502. The inbox shows cached data from Dexie.js.

---

## 3. Hooks

Claude Code hooks are shell commands registered in `.claude/settings.json` that fire automatically at specific lifecycle events. They enforce quality gates without requiring manual intervention.

### 3.1 Pre-Commit Hook — TypeScript Check

- **Trigger:** `PreToolUse` on any `Write` or `Edit` tool call targeting `app/**/*.ts` or `app/**/*.tsx`
- **Command:** `npm run typecheck`
- **Purpose:** Blocks commit if TypeScript compilation fails. Prevents type errors from accumulating across stories and ensures that the strict typing rules from `project-context.md` (no `any`, proper `Route.ActionArgs` typing) are enforced continuously rather than at PR time.

### 3.2 Post-Tool Hook — Auto-Format

- **Trigger:** `PostToolUse` on `Write` or `Edit` tool calls
- **Command:** `npx prettier --write` on the modified file
- **Purpose:** Normalizes whitespace, quote style, and trailing commas automatically after every agent-generated file write. Eliminates diff noise from formatting inconsistencies between story implementations.

### 3.3 Stop Hook — Sprint Status Update

- **Trigger:** `Stop` (fires when Claude Code completes a task and is about to return control)
- **Command:** Checks `_output/implementation-artifacts/sprint-status.yaml` and prompts an update if any story was modified during the session
- **Purpose:** Enforces the workflow rule from `project-context.md`: "Upon completing an implementation story, immediately update its status in sprint-status.yaml." Prevents status drift where code is done but tracking is stale.

---

## 4. MCP Plugins

MCP (Model Context Protocol) servers extend Claude Code with external tool integrations callable during planning and implementation sessions.

### 4.1 context7 — Library Documentation

- **Server:** `mcp__context7`
- **Tools used:** `resolve-library-id`, `query-docs`
- **Purpose:** Fetches current, version-accurate documentation for libraries used in the project at the moment of implementation. Specifically used to resolve:
  - Vercel AI SDK v6 (`generateObject`, `streamText`, schema patterns) — training data does not reflect v6 breaking changes from v3/v4
  - React Router v7 (`clientLoader`, `clientAction`, `useFetcher` API surface) — differs significantly from Remix v2
  - Dexie.js v4 (`useLiveQuery` hook from `dexie-react-hooks`, bulk operations) — v4 changed several APIs
- **Value:** Prevents hallucinated API calls against outdated SDK signatures, which would otherwise surface only at typecheck or runtime.

### 4.2 LangSmith — LLM Observability

- **Server:** `mcp__langsmith`
- **Tools used:** `list_projects`, `fetch_runs`, `list_prompts`, `push_prompt`
- **Purpose:** Provides observability into AI agent prompt runs during development. Used to:
  - Inspect actual prompts sent to `gemini-2.5-flash` from `ai.server.ts` functions
  - Measure token consumption and latency across `scoreEmailPriority`, `summarizeThread`, and `generateDraft`
  - Track prompt versions and compare output quality when refining the priority classifier prompt
  - Identify failure modes (quota errors, malformed structured output) before they surface in production
- **Value:** Closes the feedback loop between prompt engineering decisions in `ai.server.ts` and observed model behavior — essential for an AI-first application where prompt quality directly affects core UX.
