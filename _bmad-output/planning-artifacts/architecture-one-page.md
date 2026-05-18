# JobTalk AI — Architecture Overview

**JobTalk AI** is a mobile-first PWA email client that unifies Gmail, Office 365, and IMAP accounts under a single AI-powered interface with offline-first access, thread summarization, and smart reply drafting.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Browser / PWA Shell                │
│  React Router v7  │  React 19  │  CSS Modules        │
│                                                       │
│  ┌─────────────┐   ┌──────────────┐  ┌────────────┐ │
│  │  Route Layer │   │ Feature Comp │  │  UI Comps  │ │
│  │clientLoader  │   │useLiveQuery  │  │ (stateless)│ │
│  └──────┬──────┘   └──────┬───────┘  └────────────┘ │
│         │                 │                           │
│  ┌──────▼─────────────────▼──────────────────────┐  │
│  │          Dexie.js (IndexedDB) — local DB       │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │  useLiveQuery (reactive)    │
│  ┌──────────────────────▼────────────────────────┐  │
│  │  Service Worker (@remix-pwa) — sync + cache    │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────┐
│              Vercel Serverless (BFF)                 │
│  /api/auth-callback  │  /api/refresh-token           │
│  /api/sync           │  /api/ai (streaming)          │
└────────┬─────────────────────────┬───────────────────┘
         │                         │
┌────────▼────────┐    ┌───────────▼──────────────────┐
│  Email Providers │    │  Google Gemini 2.5 Flash      │
│  Gmail OAuth 2.0 │    │  (@ai-sdk/google + ai SDK)    │
│  MS Graph OAuth  │    │  Summaries, drafts, scoring   │
│  IMAP (Yahoo/AOL)│    └──────────────────────────────┘
└─────────────────┘
```

---

## Key Decisions

| Component | Technology | Rationale |
|---|---|---|
| Framework | React Router v7 + React 19 | `clientLoader`/`clientAction` enable local-first data patterns without SSR overhead |
| Local storage | Dexie.js v4 (IndexedDB) | Structured offline storage; `useLiveQuery` drives reactive UI without extra state layer |
| PWA runtime | @remix-pwa/dev + Service Workers | Production-grade offline cache, background sync, and push notifications |
| AI features | Vercel AI SDK (`ai`) + `@ai-sdk/google` (Gemini 2.5 Flash) | Streaming-first SDK, cheap fast inference for summarization and draft generation |
| Auth security | BFF pattern + `google-auth-library` | Keeps OAuth tokens server-side; browser never holds refresh tokens |
| Deployment | Vercel (free tier) | Zero-config serverless functions double as the BFF; Edge CDN for static shell |
| Testing | Vitest v4 + `fake-indexeddb` | Fast in-process tests for Dexie models without a real browser |
| Styling | Vanilla CSS + CSS Modules | Zero runtime overhead; CSS variables enforce design tokens globally |

---

## Data Flow

1. **Auth** — User initiates OAuth; BFF (`/api/auth-callback`) exchanges the code, stores tokens server-side, and sets an HttpOnly session cookie.
2. **Initial sync** — Service Worker calls BFF `/api/sync`; BFF fetches delta from Gmail/Graph/IMAP and returns normalized thread objects.
3. **Local write** — Sync engine writes threads into Dexie; `useLiveQuery` subscriptions re-render affected components immediately.
4. **Read path** — `clientLoader` queries Dexie directly (zero network); renders from local DB in sub-100 ms.
5. **AI request** — User triggers summary or draft; `ai.client.ts` calls BFF `/api/ai`, which streams Gemini output back to the UI via Vercel AI SDK streaming protocol.
6. **Token refresh** — Service Worker intercepts 401s, silently calls `/api/refresh-token`, and retries the failed sync request.

---

## Security Model

- **OAuth tokens never reach the client.** All provider credentials are stored in Vercel environment variables and session state on the BFF; the browser holds only an HttpOnly session cookie.
- **Minimal data in transit.** AI calls send only the specific thread text needed for the prompt — no bulk mailbox export. Local-first means most reads never leave the device.
- **Strict client/server boundary.** Files suffixed `.server.ts` are tree-shaken from the browser bundle by React Router v7, preventing accidental secret leakage into client code.
