# Story 3.2: Unified Mail Sync Engine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to fetch my latest emails from connected providers,
So that my inbox is up to date with real email data.

## Acceptance Criteria

1. **Given** the user has authenticated accounts
   **When** the `/api/sync` endpoint is called
   **Then** the BFF must authenticate the request via the session cookie (no unauthenticated access)
   **And** redirect to `/login` if the session is invalid or missing

2. **Given** the user is authenticated with Google
   **When** `/api/sync` is called
   **Then** the BFF must fetch emails from Gmail API using the stored OAuth access token
   **And** normalize them to the `Email` and `Thread` schema
   **And** return `{ emails, threads }` JSON response

3. **Given** the user is authenticated with Microsoft
   **When** `/api/sync` is called
   **Then** the BFF must fetch emails from Microsoft Graph API using the stored OAuth access token
   **And** normalize them to the `Email` and `Thread` schema
   **And** return `{ emails, threads }` JSON response

4. **Given** the frontend calls `/api/sync` successfully
   **When** the response is received
   **Then** `home.tsx` `clientLoader` stores results in Dexie.js via `bulkPut` — **this behavior is already implemented and must not be changed**

5. **Given** the Gmail/Microsoft API returns an error or the token is expired
   **When** the BFF handles the response
   **Then** the endpoint must return HTTP 502 with `{ error: "sync_failed" }` — the client's existing `catch` block will swallow it and fall back to Dexie cache

## Tasks / Subtasks

- [x] Task 1: Create `app/services/bff.server.ts` (AC: 2, 3)
  - [x] Export `fetchGmailEmails(session: GoogleSyncSession): Promise<SyncPayload>`
  - [x] Export `fetchMicrosoftEmails(accessToken: string): Promise<SyncPayload>`
  - [x] Export `type SyncPayload = { emails: Email[]; threads: Thread[] }`
  - [x] Gmail: use `OAuth2Client` factory (same factory pattern as `oauth.server.ts`) + `setCredentials` + `client.fetch()` for auto token refresh
  - [x] Gmail: call `GET https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in%3Ainbox`
  - [x] Gmail: for each message id, call `GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
  - [x] Gmail: implement `normalizeGmailMessage(raw: GmailMessage): Email` — see Dev Notes for schema mapping
  - [x] Gmail: implement `buildThreadsFromEmails(emails: Email[]): Thread[]` — group by threadId, pick latest date
  - [x] Microsoft: call `GET https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=id,conversationId,subject,bodyPreview,receivedDateTime,isRead&$filter=parentFolderId eq 'inbox'` with `Authorization: Bearer {accessToken}`
  - [x] Microsoft: implement `normalizeMicrosoftMessage(raw: MicrosoftMessage): Email`
  - [x] Both providers: errors throw — caught in `api.sync.ts`

- [x] Task 2: Update `app/routes/api.sync.ts` (AC: 1, 2, 3, 5)
  - [x] Replace mock import with `requireSession` + `bff.server.ts` imports
  - [x] Call `requireSession(request)` — throws redirect to `/login` on invalid session (AC 1)
  - [x] Branch on `session.provider`: `"google"` → `fetchGmailEmails`, `"microsoft"` → `fetchMicrosoftEmails`
  - [x] Return `new Response(JSON.stringify({ emails, threads }), { status: 200, headers: { "Content-Type": "application/json" } })`
  - [x] Wrap in try/catch: any thrown error → `new Response(JSON.stringify({ error: "sync_failed" }), { status: 502, headers: { "Content-Type": "application/json" } })`
  - [x] **REMOVE** the fake `Set-Cookie: auth_session=mock_token` header — it was a mock-only artifact
  - [x] **DO NOT change** the response shape `{ emails, threads }` — `home.tsx` destructures this exactly

- [x] Task 3: Write tests (AC: all)
  - [x] `app/services/bff.server.test.ts`: stub `global.fetch` for Microsoft; stub `OAuth2Client.prototype.fetch` for Gmail; test `normalizeGmailMessage` field mapping; test `normalizeMicrosoftMessage` field mapping; test `buildThreadsFromEmails` grouping and latest-date selection; test thrown error on API failure
  - [x] `app/routes/api.sync.test.ts`: mock `requireSession` (valid session → resolves, invalid → throws redirect); mock `fetchGmailEmails` and `fetchMicrosoftEmails`; test Google path returns 200 with `{ emails, threads }`; test Microsoft path returns 200; test catch path returns 502; test unauthenticated returns redirect
  - [x] `npm test` — 167/167 tests pass (0 regressions; +50 new tests)

### Review Findings

- [x] [Review][Patch] Google auto-refresh tokens are not persisted [app/services/bff.server.ts:26]
- [x] [Review][Patch] Microsoft sync is not constrained to Inbox [app/services/bff.server.ts:117]
- [x] [Review][Patch] Malformed Gmail Date header can crash normalization [app/services/bff.server.ts:43]
- [x] [Review][Patch] Provider message shape is trusted without required-field guards [app/services/bff.server.ts:47]
- [x] [Review][Defer] Non-empty cache prevents future mail sync [app/routes/home.tsx:28] — deferred, pre-existing

## Dev Notes

### Critical: What NOT to Change

- `app/routes/home.tsx` — **zero changes**. It already calls `fetch("/api/sync")`, checks `response.ok`, destructures `{ emails, threads }`, and calls `bulkPut`. This logic is correct and must be preserved as-is.
- `app/models/db.client.ts` — **zero changes**. The `Email` and `Thread` schema is already correct for this story.
- `app/routes.ts` — **zero changes**. `/api/sync` is already registered.
- `app/services/mock.server.ts` — **zero changes**. Keep as reference, do not delete.
- All existing route files (`api.score.ts`, `api.summarize.ts`, `api.draft.ts`, auth routes) — **zero changes**.

### `bff.server.ts` — Gmail Integration

Use the `OAuth2Client` factory pattern from `oauth.server.ts` (do NOT duplicate client code):

```typescript
// app/services/bff.server.ts
import { OAuth2Client } from "google-auth-library";
import type { Email, Thread } from "~/models/db.client";

export type SyncPayload = { emails: Email[]; threads: Thread[] };

// Same factory pattern as oauth.server.ts — avoids module-level instantiation
function getGoogleClient(accessToken: string, refreshToken: string): OAuth2Client {
  const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });
  // setCredentials enables auto token refresh on client.fetch()
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return client;
}

export async function fetchGmailEmails(session: GoogleSyncSession): Promise<SyncPayload> {
  const client = getGoogleClient(session);

  // Step 1: list message IDs (inbox only, 20 most recent)
  const listRes = await client.fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in%3Ainbox"
  );
  const listData = listRes.data as { messages?: Array<{ id: string; threadId: string }> };
  const messageRefs = listData.messages ?? [];

  // Step 2: fetch metadata for each message (parallel, max 20)
  const rawMessages = await Promise.all(
    messageRefs.map(({ id }) =>
      client
        .fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
        )
        .then((r) => r.data as GmailMessage)
    )
  );

  const emails = rawMessages.map(normalizeGmailMessage);
  const threads = buildThreadsFromEmails(emails);
  return { emails, threads };
}
```

### `bff.server.ts` — Gmail Message Schema Mapping

```typescript
interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

function normalizeGmailMessage(raw: GmailMessage): Email {
  const headers = raw.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const subject = getHeader("Subject") || "(no subject)";
  const dateHeader = getHeader("Date");
  const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();
  const isRead = !(raw.labelIds ?? []).includes("UNREAD");

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject,
    snippet: raw.snippet ?? "",
    date,
    isRead,
    priorityScore: null,  // scored async in home.tsx clientLoader — do NOT set here
    archived: false,
    deleted: false,
  };
}
```

### `bff.server.ts` — Thread Reconstruction

Both providers: build `Thread[]` from the normalized `Email[]` array.

```typescript
function buildThreadsFromEmails(emails: Email[]): Thread[] {
  const threadMap = new Map<string, Thread>();
  for (const email of emails) {
    const existing = threadMap.get(email.threadId);
    if (!existing || email.date > existing.lastMessageDate) {
      threadMap.set(email.threadId, {
        id: email.threadId,
        subject: email.subject,
        lastMessageDate: email.date,
      });
    }
  }
  return Array.from(threadMap.values());
}
```

### `bff.server.ts` — Microsoft Graph Integration

Microsoft scope `Mail.Read` (requested in oauth.server.ts `createMicrosoftAuthUrl`) gives access to the messages endpoint. Use raw `fetch` with Bearer token — same pattern as `exchangeMicrosoftCode` and `fetchMicrosoftUserEmail` in `oauth.server.ts`.

```typescript
interface MicrosoftMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;  // ISO 8601 from Graph
  isRead: boolean;
}

export async function fetchMicrosoftEmails(accessToken: string): Promise<SyncPayload> {
  const url =
    "https://graph.microsoft.com/v1.0/me/messages" +
    "?$top=20" +
    "&$select=id,conversationId,subject,bodyPreview,receivedDateTime,isRead" +
    "&$orderby=receivedDateTime desc";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Graph API failed: ${res.status}`);

  const data = (await res.json()) as { value?: MicrosoftMessage[] };
  const emails = (data.value ?? []).map(normalizeMicrosoftMessage);
  const threads = buildThreadsFromEmails(emails);
  return { emails, threads };
}

function normalizeMicrosoftMessage(raw: MicrosoftMessage): Email {
  return {
    id: raw.id,
    threadId: raw.conversationId,   // conversationId is the MS thread identifier
    subject: raw.subject || "(no subject)",
    snippet: raw.bodyPreview ?? "",
    date: raw.receivedDateTime,     // already ISO 8601
    isRead: raw.isRead,
    priorityScore: null,
    archived: false,
    deleted: false,
  };
}
```

### `api.sync.ts` — Updated Route

```typescript
// app/routes/api.sync.ts
import { requireSession } from "~/services/session.server";
import { fetchGmailEmails, fetchMicrosoftEmails } from "~/services/bff.server";
import type { Route } from "./+types/api.sync";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request); // throws redirect("/login") if invalid

  try {
    const payload =
      session.provider === "google"
        ? await fetchGmailEmails({ ...session, provider: "google" })
        : await fetchMicrosoftEmails(session.accessToken);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "sync_failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

**Why the 502 fallback?** `home.tsx:clientLoader` already has a `try/catch` that swallows network/sync errors and falls back to Dexie cache. The 502 path is exercised when the provider API is down or the token is unexpectedly expired. Returning 502 (not 500) signals a transient upstream failure — correct semantics.

### Testing Patterns (from Story 3.1)

**Stub global fetch for Microsoft calls:**
```typescript
// In bff.server.test.ts
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ value: [/* raw MS message */] }),
}));
afterEach(() => vi.unstubAllGlobals());
```

**Stub OAuth2Client.prototype.fetch for Gmail:**
```typescript
import { OAuth2Client } from "google-auth-library";

// Regular function required — arrow functions break vi.fn() used as prototype stub
vi.spyOn(OAuth2Client.prototype, "setCredentials").mockImplementation(function() {});
vi.spyOn(OAuth2Client.prototype, "fetch").mockResolvedValue({
  data: { messages: [{ id: "m1", threadId: "t1" }] }
} as never);
```

**Mock session service (from 3.1 pattern):**
```typescript
vi.mock("~/services/session.server", () => ({
  requireSession: vi.fn(),
}));
// In test: (requireSession as Mock).mockResolvedValue({ provider: "google", accessToken: "tok", refreshToken: "ref", ... })
// For invalid session test: (requireSession as Mock).mockImplementation(() => { throw redirect("/login"); })
```

**Mock bff service for route tests:**
```typescript
vi.mock("~/services/bff.server", () => ({
  fetchGmailEmails: vi.fn(),
  fetchMicrosoftEmails: vi.fn(),
}));
```

**Test for api.sync.ts route:**
```typescript
import { loader } from "./api.sync";
const req = new Request("http://localhost/api/sync");
const res = await loader({ request: req } as { request: Request });
```

**`afterEach(() => cleanup())`** — required in all `.test.tsx` files (not needed in `.test.ts`).
**`fake-indexeddb`** — NOT needed here (no Dexie interactions in BFF service or sync route).

### Key Invariants

- `priorityScore` MUST be `null` on every normalized email from both providers. The async scoring pipeline in `home.tsx:clientLoader` reads `db.emails.filter(e => e.priorityScore === null)` and calls `/api/score`. Setting non-null values here would silently skip AI scoring for those emails.
- `archived: false` and `deleted: false` are required on every email. Without them, `db.version(2)` migration (which sets defaults only on rows that existed before v2) would still work, but new rows from sync would fail Dexie type checks.
- The response shape from `/api/sync` is `{ emails, threads }` — `home.tsx:33-34` destructures this exactly. Any deviation breaks the frontend.
- `home.tsx:clientLoader` only calls `/api/sync` when `db.emails.filter(!archived && !deleted).count() === 0`. After first sync, subsequent page loads skip the network call entirely — this is intentional and must not be changed.

### OAuth2Client Auto Token Refresh

From Context7 / google-auth-library docs: when `setCredentials({ access_token, refresh_token })` is called and the access token is expired, `client.fetch()` automatically calls the token endpoint and emits a `"tokens"` event with the new tokens. This means:
- Do NOT manually check `expiresAt` for Google
- Do NOT manually call the token refresh endpoint for Google
- The `OAuth2Client` handles it transparently

For Microsoft, the Graph API will return 401 if the token is expired. The catch in `api.sync.ts` converts this to a 502, and the user can re-authenticate. Token refresh for Microsoft is deferred (see `deferred-work.md` pattern for scope management).

### Project Structure Notes

| File | Status | Convention |
|------|--------|------------|
| `app/services/bff.server.ts` | NEW | `.server.ts` suffix → server-only bundle (no client exposure) |
| `app/services/bff.server.test.ts` | NEW | Co-located with source, `camelCase.ts` for utilities |
| `app/routes/api.sync.ts` | MODIFY | `kebab-case.tsx` for routes; `api.sync.ts` naming already established |
| `app/routes/api.sync.test.ts` | NEW | Co-located with route |

### What `home.tsx` Already Does (DO NOT RE-IMPLEMENT)

`app/routes/home.tsx:26-41` already:
- Calls `fetch("/api/sync")` only when `db.emails.filter(!archived && !deleted).count() === 0`
- Checks `response.ok` and throws on failure
- Destructures `{ emails, threads }` from JSON
- Calls `db.emails.bulkPut(emails)` and `db.threads.bulkPut(threads)`
- Catches all errors and falls back to Dexie cache silently

This is **complete and correct**. Story 3.2 only changes the server side.

### References

- [Source: _output/planning-artifacts/epics.md#Story 3.2: Unified Mail Sync Engine]
- [Source: _output/planning-artifacts/architecture.md#Project Structure — app/services/bff.server.ts]
- [Source: _output/implementation-artifacts/3-1-oauth-secure-credential-storage.md#Dev Notes — OAuth2Client factory, session service patterns, testing patterns]
- [Source: app/services/oauth.server.ts] — OAuth2Client factory pattern to reuse (same env vars, same import)
- [Source: app/services/session.server.ts] — `requireSession`, `SessionData` interface (has `accessToken`, `refreshToken`, `provider`)
- [Source: app/services/credential.server.ts] — server-side token store (consumed via requireSession, no direct calls needed)
- [Source: app/routes/api.sync.ts] — current mock to replace
- [Source: app/routes/home.tsx:26-84] — clientLoader sync logic (PRESERVE UNCHANGED)
- [Source: app/models/db.client.ts] — `Email` and `Thread` interfaces (required output shape)
- [Source: _output/project-context.md#Security Rule] — never expose tokens to client
- [Context7: googleapis/google-auth-library-nodejs — OAuth2Client.setCredentials, client.fetch(), auto token refresh via 'tokens' event]
- [Context7: remix-run/react-router — server loader, redirect, resource route pattern]
- Gmail REST API: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
- Microsoft Graph API: https://learn.microsoft.com/en-us/graph/api/message-list

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 — Agent Dev

### Debug Log References

- **bff.server.test.ts OAuth2Client mock**: Used `vi.hoisted()` + `vi.mock("google-auth-library", ...)` with constructor function pattern (regular function, not arrow) — same as `oauth.server.test.ts`. Shared `mockClientFetch` via `vi.hoisted` ensures `mockResolvedValueOnce` chains work across sequential calls (list + per-message fetches).
- **api.sync.test.ts redirect propagation**: `requireSession` throws a `Response` object (not an `Error`). Test uses `mockImplementationOnce(() => { throw redirect; })` and expects the loader to re-throw (not catch). The `api.sync.ts` try/catch wraps only the BFF calls, not `requireSession` — so the redirect propagates correctly.

### Completion Notes List

- ✅ `app/services/bff.server.ts` — new BFF service with `fetchGmailEmails` (OAuth2Client factory + setCredentials + persisted auto-refresh via client.fetch()), `fetchMicrosoftEmails` (raw fetch with Bearer token), shared `buildThreadsFromEmails`, and exported normalization functions. `priorityScore: null` on all normalized emails to preserve async AI scoring pipeline.
- ✅ `app/routes/api.sync.ts` — replaced mock with `requireSession` auth guard + provider-branching BFF call. Fake `Set-Cookie: auth_session=mock_token` header removed. Response shape `{ emails, threads }` preserved for `home.tsx` compatibility. 502 fallback for upstream failures.
- ✅ Tests: 167/167 pass. `bff.server.test.ts` — 41 tests covering field mapping, thread reconstruction, Gmail API call sequence, Google token-refresh persistence, Microsoft inbox scoping, provider field guards, Microsoft Bearer auth, and error propagation. `api.sync.test.ts` — 9 tests covering Google/Microsoft paths, auth redirect propagation, and 502 error handling.
- ✅ `home.tsx`, `db.client.ts`, `routes.ts`, `mock.server.ts` — zero changes.

### File List

- `app/services/bff.server.ts` — new
- `app/services/bff.server.test.ts` — new
- `app/routes/api.sync.ts` — modified (mock replaced with real BFF + auth)
- `app/routes/api.sync.test.ts` — new

### Change Log

- 2026-05-16: Story 3.2 implementation complete. Created `bff.server.ts` with Gmail (OAuth2Client auto-refresh) and Microsoft Graph (raw fetch) adapters. Updated `api.sync.ts` to authenticate requests via `requireSession` and call real provider APIs. Review patches resolved for Google token persistence, Microsoft inbox scoping, Gmail date parsing, and provider field guards. 50 new tests, 167 total, 0 regressions.
