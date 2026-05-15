# Deferred Work

## Deferred from: code review of 2-1-ai-priority-scoring (2026-05-15)

- Prompt injection через subject/snippet без ограничения длины в `ai.server.ts` — вне скоупа Story 2.1, рассмотреть в Story 2.2+ или отдельном security story
- Badge CSS animation повторяется при каждом ре-рендере (не только при появлении) в `PriorityBadge.module.css` — minor UX polish, не влияет на функциональность
- Тест `scoreEmailPriority fails safe` тестирует не тот уровень изоляции (оба уровня уже fail-safe) — оставить как double-check, не удалять
- Type assertion `request.json() as { emailId: string; ... }` без runtime validation в `api.score.ts` — низкий риск при контролируемом клиенте, рассмотреть если появятся внешние вызовы
