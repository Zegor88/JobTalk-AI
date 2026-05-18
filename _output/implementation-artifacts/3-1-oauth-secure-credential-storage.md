# Story 3.1: OAuth 2.1 & Secure Credential Storage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to securely connect my Gmail and Office 365 accounts without entering my password,
So that I can trust the app with my email access.

## Acceptance Criteria

1. **Given** the user is on the account connection screen
   **When** they select Google or Microsoft
   **Then** the app must initiate an OAuth 2.1 flow via the BFF (server-side redirect to provider consent page)

2. **Given** the user completes the OAuth consent on the provider's page
   **When** the provider redirects back to `/auth/callback`
   **Then** the BFF must exchange the authorization code for access + refresh tokens
   **And** store the tokens in a signed HTTP-only, Secure, SameSite=Lax session cookie (never in localStorage or client-accessible storage)
   **And** redirect the user to the inbox (`/`)

3. **Given** the user is authenticated (session cookie valid)
   **When** they navigate to `/`
   **Then** the home route server loader must recognize the session and allow access

4. **Given** the user wants to disconnect their account
   **When** they submit the Sign Out action from the login page
   **Then** the session cookie must be destroyed and the user redirected to `/login`

## Tasks / Subtasks

- [x] Task 1: Install new dependency and update env vars (AC: 1, 2)
  - [x] `npm install google-auth-library`
  - [x] Add to `.env.example` (and `.env` for local dev): `SESSION_SECRET`, `GOOGLE_REDIRECT_URI`, `MICROSOFT_REDIRECT_URI` (see ENV Vars section in Dev Notes)
  - [x] Fill `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from Google Cloud Console (existing empty vars in .env)
  - [x] Fill `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` from Azure App Registrations (existing empty vars in .env)

- [x] Task 2: Create session service `app/services/session.server.ts` (AC: 2, 3, 4)
  - [x] Use `createCookieSessionStorage` from `react-router` (built-in — no new package)
  - [x] Cookie config: `name: "__jobtalk_session"`, `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, `path: "/"`, `maxAge: 60 * 60 * 24 * 14` (14 days), `secrets: [process.env.SESSION_SECRET!]`
  - [x] Export `getSession`, `commitSession`, `destroySession`
  - [x] Export `SessionData` interface: `{ userId: string; email: string; provider: "google" | "microsoft"; accessToken: string; refreshToken: string; expiresAt: number }`
  - [x] Export `requireSession(request: Request): Promise<SessionData>` — reads session, throws `redirect("/login")` if no `userId`

- [x] Task 3: Create OAuth service `app/services/oauth.server.ts` (AC: 1, 2)
  - [x] Define shared `OAuthTokens` type: `{ accessToken: string; refreshToken: string; email: string; provider: "google" | "microsoft"; expiresAt: number }`
  - [x] **Google** (use `google-auth-library`):
    - [x] `createGoogleAuthUrl(): string` — `OAuth2Client.generateAuthUrl` with `access_type: "offline"`, `prompt: "consent"`, scopes: `gmail.readonly` + `userinfo.email`
    - [x] `exchangeGoogleCode(code: string): Promise<OAuthTokens>` — calls `client.getToken(code)`, then `client.getTokenInfo(accessToken)` for email; throws if `access_token` is null
  - [x] **Microsoft** (raw `fetch` — no package needed):
    - [x] `createMicrosoftAuthUrl(): string` — builds URL for `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` with `response_type: "code"`, scopes: `Mail.Read offline_access email openid`
    - [x] `exchangeMicrosoftCode(code: string): Promise<OAuthTokens>` — POST to `/token` endpoint, decodes email from `id_token` JWT payload (base64url decode of the middle segment)
  - [x] All env vars accessed server-side only (`.server.ts` suffix is enforced by React Router build)

- [x] Task 4: Create account connection screen `app/routes/login.tsx` + `app/routes/login.module.css` (AC: 1, 4)
  - [x] Server `loader`: read session → if authenticated, return `{ email, provider }` from session (do NOT redirect — show "Connected as..." state)
  - [x] If not authenticated: return `{ email: null, provider: null }`
  - [x] Component renders two states:
    - **Unauthenticated**: "Connect with Google" and "Connect with Microsoft" `<Link>` buttons
    - **Authenticated**: "Connected as [email] via [provider]" + `<form method="post" action="/auth/logout">` with Sign Out button
  - [x] `login.module.css`: CSS Modules only, use CSS vars from `index.css`, no Tailwind, no inline styles
  - [x] Touch targets: `min-height: var(--touch-target)` (44px) on buttons

- [x] Task 5: Create Google OAuth initiation route `app/routes/auth.google.tsx` (AC: 1)
  - [x] Server `loader` only — no default component export needed (resource route that always redirects)
  - [x] Throws `redirect("/login?error=config")` if `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is missing
  - [x] Otherwise: `return redirect(createGoogleAuthUrl())`

- [x] Task 6: Create Microsoft OAuth initiation route `app/routes/auth.microsoft.tsx` (AC: 1)
  - [x] Server `loader` only — same resource route pattern
  - [x] Throws `redirect("/login?error=config")` if `MICROSOFT_CLIENT_ID` or `MICROSOFT_CLIENT_SECRET` is missing
  - [x] Otherwise: `return redirect(createMicrosoftAuthUrl())`

- [x] Task 7: Create OAuth callback route `app/routes/auth.callback.tsx` (AC: 2)
  - [x] Server `loader` only — handles both providers via `?provider=` query param
  - [x] Reads `code` and `provider` from `url.searchParams`
  - [x] If missing `code` or `provider`: `return redirect("/login?error=missing_params")`
  - [x] `provider === "google"` → `exchangeGoogleCode(code)`, else → `exchangeMicrosoftCode(code)`
  - [x] On success: create session, set all `SessionData` fields, `return redirect("/", { headers: { "Set-Cookie": await commitSession(session) } })`
  - [x] Wrap in try/catch: any error → `return redirect("/login?error=auth_failed")`
  - [x] **CRITICAL**: the `code` Google/Microsoft sends is one-time-use. Calling `getToken` twice will fail.

- [x] Task 8: Create logout route `app/routes/auth.logout.tsx` (AC: 4)
  - [x] Server `action` (POST handler) — no loader, no component
  - [x] Destroys session: `return redirect("/login", { headers: { "Set-Cookie": await destroySession(session) } })`

- [x] Task 9: Register all new routes in `app/routes.ts` (AC: all)
  - [x] APPEND ONLY — never modify or reorder existing routes
  - [x] Added 5 new routes after `/api/draft`

- [x] Task 10: Add server loader auth guard to `app/routes/home.tsx` (AC: 3)
  - [x] Added server `export async function loader({ request }: Route.LoaderArgs)` — calls `await requireSession(request)`, returns `null`
  - [x] `clientLoader`, `useLiveQuery` hooks, component JSX, all existing logic preserved unchanged

- [x] Task 11: Write tests (AC: all)
  - [x] `app/services/oauth.server.test.ts`: 13 tests — `createGoogleAuthUrl` params verified, `createMicrosoftAuthUrl` URL verified, `exchangeGoogleCode` success/error, `exchangeMicrosoftCode` success/error
  - [x] `app/services/session.server.test.ts`: 5 tests — `requireSession` throws redirect when no userId, returns SessionData when valid, all exports callable
  - [x] `app/routes/auth.callback.test.ts`: 6 tests — Google success, Microsoft success, missing code, missing provider, both absent, Google exchange failure, Microsoft exchange failure
  - [x] `app/routes/login.test.tsx`: 11 tests — unauthenticated renders, authenticated renders, WCAG class checks
  - [x] `npm test` — 104/104 tests pass, 0 regressions

### Review Findings

- [x] [Review][Patch] Move OAuth credentials to server-side storage behind an opaque session id — `app/routes/auth.callback.tsx` writes `accessToken` and `refreshToken` into the React Router cookie session, while `app/services/session.server.ts` configures only `secrets` signing, not encryption or server-side storage. Decision: store OAuth tokens server-side and keep only an opaque `sessionId` in the cookie.
- [x] [Review][Patch] OAuth authorization flow lacks `state` and PKCE [app/services/oauth.server.ts:21]
- [x] [Review][Patch] Callback accepts any non-google provider as Microsoft [app/routes/auth.callback.tsx:8]
- [x] [Review][Patch] Microsoft `id_token` is decoded without verification and missing email falls back to `unknown@microsoft.com` [app/services/oauth.server.ts:72]
- [x] [Review][Patch] Auth init config guards omit required redirect URI validation [app/routes/auth.google.tsx:5]
- [x] [Review][Patch] `requireSession` authenticates on `userId` alone and returns unchecked session fields [app/services/session.server.ts:27]
- [x] [Review][Patch] Current story adds a TypeScript error in `login.test.tsx` component props [app/routes/login.test.tsx:35]

## Dev Notes

### Session Service — createCookieSessionStorage (built-in, no new packages)

```typescript
// app/services/session.server.ts
import { createCookieSessionStorage, redirect } from "react-router";

interface SessionData {
  userId: string;
  email: string;
  provider: "google" | "microsoft";
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp ms
}

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData>({
    cookie: {
      name: "__jobtalk_session",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
      secrets: [process.env.SESSION_SECRET!],
    },
  });

export { getSession, commitSession, destroySession };
export type { SessionData };

export async function requireSession(request: Request): Promise<SessionData> {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) throw redirect("/login");
  return {
    userId,
    email: session.get("email")!,
    provider: session.get("provider")!,
    accessToken: session.get("accessToken")!,
    refreshToken: session.get("refreshToken")!,
    expiresAt: session.get("expiresAt")!,
  };
}
```

`createCookieSessionStorage` is imported from `react-router` (already installed). The `secrets` array signs the cookie to prevent tampering. Data is NOT encrypted (it's base64-encoded), but it IS HTTP-only so client JS cannot read it. This is the standard React Router v7 auth pattern per Context7 docs.

### Google OAuth Service

```typescript
// app/services/oauth.server.ts
import { OAuth2Client } from "google-auth-library";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  email: string;
  provider: "google" | "microsoft";
  expiresAt: number;
}

const getGoogleClient = () =>
  new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

export function createGoogleAuthUrl(): string {
  return getGoogleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",   // MANDATORY: without this, refresh_token is null after first auth
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function exchangeGoogleCode(code: string): Promise<OAuthTokens> {
  const client = getGoogleClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("Google: no access_token in response");

  const tokenInfo = await client.getTokenInfo(tokens.access_token);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? "",
    email: tokenInfo.email!,
    provider: "google",
    expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
  };
}
```

**Why `getGoogleClient()` as a factory?** Avoids module-level instantiation which would throw on import if env vars are not set (e.g., in test environment). The factory is called only at request time.

### Microsoft OAuth Service (raw fetch — no package)

```typescript
const MS_AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";

export function createMicrosoftAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    scope: "Mail.Read offline_access email openid",
    response_mode: "query",
  });
  return `${MS_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftCode(code: string): Promise<OAuthTokens> {
  const res = await fetch(`${MS_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      grant_type: "authorization_code",
      code,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${res.status}`);
  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    email: data.id_token ? parseIdTokenEmail(data.id_token) : "unknown@microsoft.com",
    provider: "microsoft",
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

function parseIdTokenEmail(idToken: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")
    ) as { email?: string; preferred_username?: string };
    return payload.email ?? payload.preferred_username ?? "unknown@microsoft.com";
  } catch {
    return "unknown@microsoft.com";
  }
}
```

### Callback Route — redirect_uri MUST match exactly

```typescript
// app/routes/auth.callback.tsx
import { redirect } from "react-router";
import { exchangeGoogleCode, exchangeMicrosoftCode } from "~/services/oauth.server";
import { getSession, commitSession } from "~/services/session.server";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const provider = url.searchParams.get("provider") as "google" | "microsoft" | null;

  if (!code || !provider) return redirect("/login?error=missing_params");

  try {
    const tokens =
      provider === "google"
        ? await exchangeGoogleCode(code)
        : await exchangeMicrosoftCode(code);

    const session = await getSession(request.headers.get("Cookie"));
    session.set("userId", tokens.email);
    session.set("email", tokens.email);
    session.set("provider", tokens.provider);
    session.set("accessToken", tokens.accessToken);
    session.set("refreshToken", tokens.refreshToken);
    session.set("expiresAt", tokens.expiresAt);

    return redirect("/", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch {
    return redirect("/login?error=auth_failed");
  }
}
```

**How the redirect_uri + provider param works**: `GOOGLE_REDIRECT_URI = http://localhost:3000/auth/callback?provider=google`. When Google redirects back, it appends `&code=xxx&scope=...` → final URL is `/auth/callback?provider=google&code=xxx`. The `provider` param is preserved. `URLSearchParams.get("provider")` → `"google"`. Both the `generateAuthUrl` call and the `getToken` call use the same `redirectUri` from `OAuth2Client` constructor — exact match guaranteed.

**In Google Cloud Console**, register both:
- Dev: `http://localhost:3000/auth/callback?provider=google`
- Prod: `https://<your-vercel-domain>.vercel.app/auth/callback?provider=google`

Query params are allowed in Google's redirect URI whitelist as of OAuth 2.0 spec compliance.

### Auth Initiation Routes (resource routes — no component)

```typescript
// app/routes/auth.google.tsx
import { redirect } from "react-router";
import { createGoogleAuthUrl } from "~/services/oauth.server";

export async function loader() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return redirect("/login?error=config");
  }
  return redirect(createGoogleAuthUrl());
}
// No default export — this is a resource route (always redirects, never renders)
```

React Router v7 supports routes with no default component export when the loader always redirects. This is the correct pattern for OAuth initiation.

### Logout Route

```typescript
// app/routes/auth.logout.tsx
import { redirect } from "react-router";
import { getSession, destroySession } from "~/services/session.server";

export async function action({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
// No loader, no default export — POST-only action route
```

### Home Route — Minimal Auth Guard Addition

```typescript
// app/routes/home.tsx — ADD THIS ONLY, change nothing else
import { requireSession } from "~/services/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireSession(request); // throws redirect("/login") if no session
  return null;
}

// PRESERVE UNCHANGED:
// - export async function clientLoader(...)
// - export function meta(...)
// - export default function Home()
// - all useLiveQuery hooks, fetch calls, state
```

The server `loader` runs before `clientLoader`. If `requireSession` throws, the redirect happens before the component renders.

### Routes Registration (routes.ts)

```typescript
// APPEND after route("/api/draft", "routes/api.draft.ts"):
route("/login", "routes/login.tsx"),
route("/auth/google", "routes/auth.google.tsx"),
route("/auth/microsoft", "routes/auth.microsoft.tsx"),
route("/auth/callback", "routes/auth.callback.tsx"),
route("/auth/logout", "routes/auth.logout.tsx"),
```

Do not touch the existing 6 routes.

### Login Screen — Connected vs Unauthenticated States

```typescript
// app/routes/login.tsx
import { Link } from "react-router";
import type { Route } from "./+types/login";
import { getSession } from "~/services/session.server";
import styles from "./login.module.css";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const email = session.get("email") ?? null;
  const provider = session.get("provider") ?? null;
  return { email, provider };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { email, provider } = loaderData;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>JobTalk AI</h1>
      <p className={styles.subtitle}>AI-powered email for job seekers</p>

      {email ? (
        <div className={styles.connectedState}>
          <p className={styles.connectedText}>
            Connected as <strong>{email}</strong> via {provider}
          </p>
          <form method="post" action="/auth/logout">
            <button type="submit" className={styles.signOutBtn}>
              Sign Out
            </button>
          </form>
          <Link to="/" className={styles.backBtn}>Back to Inbox</Link>
        </div>
      ) : (
        <div className={styles.providerList}>
          <Link to="/auth/google" className={styles.providerBtn}>
            Connect with Google
          </Link>
          <Link to="/auth/microsoft" className={styles.providerBtn}>
            Connect with Microsoft
          </Link>
        </div>
      )}
    </div>
  );
}
```

Note: The login page does NOT redirect authenticated users away — it shows the "Connected" state so they can log out. The inbox `/` is the user's natural entry point.

### ENV Vars (add to .env and .env.example)

```env
# Session — REQUIRED for auth (32+ chars, generate randomly for production)
SESSION_SECRET="dev-session-secret-change-in-prod-32ch"

# OAuth Redirect URIs (must be registered in provider consoles)
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback?provider=google"
MICROSOFT_REDIRECT_URI="http://localhost:3000/auth/callback?provider=microsoft"
```

Already present in .env (fill in from consoles):
```env
GOOGLE_CLIENT_ID=""        # Google Cloud Console → Credentials → OAuth 2.0
GOOGLE_CLIENT_SECRET=""    # Same location
MICROSOFT_CLIENT_ID=""     # Azure Portal → App Registrations → Application (client) ID
MICROSOFT_CLIENT_SECRET""  # Azure Portal → App Registrations → Certificates & secrets
```

### login.module.css — Key Rules

```css
/* app/routes/login.module.css */
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: var(--space-6);
  background: var(--color-background);
}
.title { font-size: 1.75rem; font-weight: 700; color: var(--color-text-primary); }
.subtitle { color: var(--color-text-secondary); margin-bottom: var(--space-8); text-align: center; }
.providerList { display: flex; flex-direction: column; gap: var(--space-4); width: 100%; max-width: 320px; }
.providerBtn {
  display: flex; align-items: center; justify-content: center;
  min-height: var(--touch-target);  /* 44px — WCAG 2.1 */
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 1rem; font-weight: 500; text-decoration: none;
  transition: background var(--transition-fast);
}
.providerBtn:hover, .providerBtn:focus-visible { background: var(--color-hover); }
.signOutBtn {
  min-height: var(--touch-target);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-destructive, var(--color-text-secondary));
  font-size: 1rem; cursor: pointer; width: 100%; max-width: 320px;
}
```

Use ONLY CSS variables from `index.css`. Run `grep "^--" app/index.css` to see the full list before adding new declarations.

### Testing Patterns (from previous stories)

**Route loader test** — type as `{ request: Request }` (NOT `Route.LoaderArgs`, same as `api.draft.ts` pattern from Story 2.3):
```typescript
import { loader } from "./auth.callback";
const req = new Request("http://localhost/auth/callback?code=abc&provider=google");
const res = await loader({ request: req });
```

**Session mock**:
```typescript
vi.mock("~/services/session.server", () => ({
  getSession: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn() }),
  commitSession: vi.fn().mockResolvedValue("__jobtalk_session=xxx"),
  destroySession: vi.fn().mockResolvedValue("__jobtalk_session=; Max-Age=0"),
  requireSession: vi.fn(),
}));
```

**OAuth mock**:
```typescript
vi.mock("~/services/oauth.server", () => ({
  exchangeGoogleCode: vi.fn(),
  exchangeMicrosoftCode: vi.fn(),
  createGoogleAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/auth?..."),
}));
```

Add `afterEach(() => cleanup())` in all `*.test.tsx` files (established pattern from Story 2.2).
`fake-indexeddb` is NOT needed here — no Dexie interactions in auth routes.

### New Dependency

```bash
npm install google-auth-library
```

`google-auth-library` provides `OAuth2Client` used for Google token exchange. No Microsoft-specific package needed (standard `fetch` to MS token endpoint). `createCookieSessionStorage` is built into React Router — zero additional packages for sessions.

### What NOT to Change

- `app/routes/api.sync.ts` — keep mock `auth_session=mock_token` cookie; replaced in Story 3.2
- `app/services/ai.server.ts` — no changes; AI routes don't require auth yet (deferred per `deferred-work.md`)
- `app/models/db.client.ts` — no schema changes
- `app/components/ui/BottomNav.tsx` — no changes
- `app/root.tsx` — no changes
- Any existing test files — 0 regressions

### Architecture Boundary Note

The React Router v7 server routes (`app/routes/auth.*.tsx`) ARE the BFF. There is no separate backend process. The `app/services/bff.server.ts` file referenced in the architecture doc will be created in Story 3.2 when it's needed for shared Gmail/Graph API call helpers.

### Deferred Work Addressed

From `deferred-work.md`: "No authentication on `/api/summarize`, `/api/score`, `/api/draft` — pre-existing pattern across all API routes; auth is a separate story." Story 3.1 introduces the `requireSession` infrastructure. Adding guards to API routes is deferred post-Epic 3 (low risk — API routes are only called from client-side code within the same origin).

### Project Structure Notes

| New file | Convention reason |
|---|---|
| `app/services/session.server.ts` | `.server.ts` suffix → server-only, enforced by React Router build |
| `app/services/oauth.server.ts` | Same. Prevents accidental token exposure to client bundle |
| `app/routes/login.tsx` | `kebab-case.tsx` for route files |
| `app/routes/login.module.css` | Co-located with route, CSS Modules |
| `app/routes/auth.google.tsx` | Dot notation maps to `/auth/google` path in routes.ts |
| `app/routes/auth.microsoft.tsx` | Same |
| `app/routes/auth.callback.tsx` | Same — handles both providers via `?provider=` |
| `app/routes/auth.logout.tsx` | POST-only action route |

### References

- [Source: _output/planning-artifacts/epics.md#Story 3.1: OAuth 2.1 & Secure Credential Storage]
- [Source: _output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _output/planning-artifacts/architecture.md#Project Structure — app/services/bff.server.ts, app/routes/login.tsx, auth.callback.tsx]
- [Source: _output/planning-artifacts/prd-jobtalk-ai.md#Non-Functional Requirements — OAuth 2.1, secure credential storage]
- [Source: _output/project-context.md#Security Rule — NEVER expose OAuth tokens to the client]
- [Source: _output/project-context.md#Framework-Specific Rules — React Router, CSS Modules]
- [Source: app/routes.ts] — routes to append to (APPEND ONLY)
- [Source: app/routes/home.tsx] — add server loader only, preserve clientLoader
- [Source: app/routes/api.sync.ts] — mock auth_session cookie (leave untouched in this story)
- [Source: _output/implementation-artifacts/2-3-smart-replies-lightweight-composer.md#Dev Notes] — BFF route test pattern, afterEach cleanup
- [Source: _output/implementation-artifacts/deferred-work.md] — deferred API auth guards context
- [Context7: remix-run/react-router — createCookieSessionStorage, redirect, loader/action patterns]
- [Context7: googleapis/google-auth-library-nodejs — OAuth2Client.generateAuthUrl, getToken, getTokenInfo]
- [Context7: vvo/iron-session — considered and rejected; built-in createCookieSessionStorage preferred (no extra dep)]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 — Agent Dev

### Debug Log References

- **oauth.server.test.ts**: `vi.fn().mockImplementation(() => ({...}))` with arrow function cannot be used as constructor in Vitest v4. Fixed by using `vi.fn(function(this) { Object.assign(this, {...}) })` — regular function works correctly with `new OAuth2Client(...)`.
- **login.test.tsx**: `session.server.ts` calls `createCookieSessionStorage` at module level. When `login.test.tsx` mocked `react-router` with only `Link`, importing `login.tsx` triggered the session service import which failed. Fixed by adding `vi.mock("~/services/session.server", ...)` in `login.test.tsx` to prevent the transitive import from calling `createCookieSessionStorage`.

### Completion Notes List

- ✅ `google-auth-library` installed (20 packages, 0 vulnerabilities). `.env` and `.env.example` updated with `SESSION_SECRET`, `GOOGLE_REDIRECT_URI`, `MICROSOFT_REDIRECT_URI`.
- ✅ `app/services/session.server.ts` — `createCookieSessionStorage` with signed HTTP-only cookie (`__jobtalk_session`, 14-day TTL). Cookie stores opaque `sessionId` and non-secret metadata only. `requireSession` throws `redirect("/login")` when session metadata or server-side credentials are missing.
- ✅ `app/services/credential.server.ts` — server-side encrypted OAuth credential store using AES-256-GCM keyed by `CREDENTIAL_ENCRYPTION_KEY` or `SESSION_SECRET`; OAuth tokens no longer live in the browser cookie.
- ✅ `app/services/oauth.server.ts` — Google: `OAuth2Client` factory (avoids module-level instantiation), `prompt: "consent"` mandatory for refresh_token, `state` + PKCE S256. Microsoft: raw `fetch` to token endpoint with PKCE verifier, email resolved via Microsoft OIDC userinfo endpoint and required.
- ✅ `app/routes/login.tsx` — two-state component: unauthenticated (provider selection links) / authenticated ("Connected as..." + Sign Out form + Back to Inbox).
- ✅ `app/routes/login.module.css` — CSS Modules only, all CSS variables from `index.css`, `min-height: var(--touch-target)` on all interactive elements (WCAG 2.1).
- ✅ `app/routes/auth.google.tsx`, `auth.microsoft.tsx` — resource routes (loader-only, no component). Config guard redirects to `/login?error=config` if env vars missing.
- ✅ `app/routes/auth.callback.tsx` — handles both providers via `?provider=` query param, validates provider and `state`, exchanges code with PKCE verifier, stores tokens server-side, then commits cookie session metadata.
- ✅ `app/routes/auth.logout.tsx` — POST-only action, destroys session, redirects to `/login`.
- ✅ `app/routes.ts` — 5 auth routes appended (APPEND ONLY, existing 6 routes untouched).
- ✅ `app/routes/home.tsx` — minimal server `loader` added (`requireSession` + return null). `clientLoader`, all `useLiveQuery` hooks, component JSX unchanged.
- ✅ Tests: 117/117 pass, 0 regressions. 48 story auth tests across 6 auth/session/credential test files.

### File List

- `app/services/session.server.ts` — new
- `app/services/session.server.test.ts` — new
- `app/services/credential.server.ts` — new
- `app/services/credential.server.test.ts` — new
- `app/services/oauth.server.ts` — new
- `app/services/oauth.server.test.ts` — new
- `app/routes/login.tsx` — new
- `app/routes/login.module.css` — new
- `app/routes/login.test.tsx` — new
- `app/routes/auth.google.tsx` — new
- `app/routes/auth.microsoft.tsx` — new
- `app/routes/auth.callback.tsx` — new
- `app/routes/auth.callback.test.ts` — new
- `app/routes/auth.providers.test.ts` — new
- `app/routes/auth.logout.tsx` — new
- `app/routes/routes.ts` → `app/routes.ts` — modified (5 auth routes appended)
- `app/routes/home.tsx` — modified (server loader added)
- `.env` — modified (SESSION_SECRET, GOOGLE_REDIRECT_URI, MICROSOFT_REDIRECT_URI added)
- `.env.example` — modified (same vars added)
- `package.json` / `package-lock.json` — modified (google-auth-library added)

### Change Log

- 2026-05-16: Story 3.1 implementation complete. OAuth 2.1 infrastructure: signed HTTP-only session cookie with opaque `sessionId`, server-side encrypted credential storage, Google OAuth via google-auth-library with state + PKCE, Microsoft OAuth via raw fetch with state + PKCE, login screen with dual auth state, 5 new BFF routes, home route auth guard, 48 story auth tests.
