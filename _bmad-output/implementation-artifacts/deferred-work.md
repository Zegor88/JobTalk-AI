# Deferred Work

## Deferred from: code review of 3-2-unified-mail-sync-engine (2026-05-16)

- Non-empty cache prevents future mail sync [app/routes/home.tsx:28] — pre-existing `home.tsx` behavior explicitly marked "already implemented and must not be changed" in Story 3.2. Real freshness risk: once one visible email exists, `/api/sync` is skipped indefinitely. Consider a future sync freshness boundary such as `lastSyncedAt` plus merge rules that preserve local `archived`/`deleted` flags.

## Deferred from: code review of 2-2-thread-summarization-the-ask (2026-05-15)

- No authentication on `/api/summarize` [app/routes/api.summarize.ts] — pre-existing pattern across all API routes; auth is a separate story
- No input size limit on emails array — potential token overflow and large POST bodies [app/routes/api.summarize.ts] — rate limiting/input guards out of scope for MVP
- Prompt injection via unescaped `subject`/`snippet` fields in AI prompt [app/services/ai.server.ts] — risk constrained by Zod output schema; security hardening story (also noted in 2-1 deferred)
- No `loader` export on API routes — GET to `/api/summarize` returns unhandled error — pre-existing pattern (api.score.ts same)

## Deferred from: code review of 2-1-ai-priority-scoring (2026-05-15)

- Prompt injection через subject/snippet без ограничения длины в `ai.server.ts` — вне скоупа Story 2.1, рассмотреть в Story 2.2+ или отдельном security story
- Badge CSS animation повторяется при каждом ре-рендере (не только при появлении) в `PriorityBadge.module.css` — minor UX polish, не влияет на функциональность
- Тест `scoreEmailPriority fails safe` тестирует не тот уровень изоляции (оба уровня уже fail-safe) — оставить как double-check, не удалять
- Type assertion `request.json() as { emailId: string; ... }` без runtime validation в `api.score.ts` — низкий риск при контролируемом клиенте, рассмотреть если появятся внешние вызовы
