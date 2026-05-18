# Building JobTalk AI with Claude Code and Agentic Workflows

_Artifact Type: Workflow Writeup_
_Project: JobTalk AI_
_Date: 2026-05-18_

---

## Overview

JobTalk AI is an AI-first email client built almost entirely through Claude Code CLI using a structured agentic workflow called Agent OS. The project demonstrates what it looks like to treat an AI coding assistant not as an autocomplete tool but as a team of specialized agents working through a defined engineering process. Every planning artifact, every implementation story, and every line of production code was produced through deliberate agent orchestration rather than ad-hoc prompting.

## CLAUDE.md as the Agent Instruction Layer

The project starts with a single file: `CLAUDE.md`. This is not documentation for humans — it is the runtime instruction set for every Claude agent that touches the project. It defines the product identity, the four-phase methodology, the team roles, the directory layout, and the output conventions. Before any agent writes a line of code, it reads this file and understands the operating context.

The companion file `_output/project-context.md` goes further: it codifies 24 implementation rules covering naming conventions, forbidden patterns (no `any`, no Tailwind, no hardcoded HEX values, no `useEffect` subscriptions to Dexie.js), testing requirements, and the "main-is-sacred" branch strategy. Together, these two files eliminated an entire category of review feedback — agents do not make architectural judgment calls because the architecture is already decided and written down.

## The Four-Phase Methodology

**Phase 1 — Analysis** grounded the project in market and technical reality before any design decisions were made. A Business Analyst agent produced a product brief and PRFAQ establishing the problem space: job seekers managing high-volume, high-stakes email across multiple providers with no intelligent triage. Research outputs defined the competitive landscape and confirmed the viability of a local-first PWA with BFF-proxied OAuth.

**Phase 2 — Planning** translated research into requirements and design. A Product Manager agent produced the PRD with seven functional requirements spanning unified inbox, PWA offline support, and three AI features. A UX Designer agent then produced a full design specification and an interactive HTML prototype covering the mobile gesture vocabulary: swipe-to-archive, the AI summary card ("The Ask"), smart reply chips, and the lightweight composer overlay. The UX specification was specific enough that the implementing engineer agent had no design ambiguity to resolve.

**Phase 3 — Solutioning** produced the architectural blueprint before any code was written. A System Architect agent worked through data architecture (Dexie.js as the single source of truth, `useLiveQuery` as the reactivity layer), authentication (OAuth 2.1 via BFF, tokens never reaching the React client), the AI engine pattern (Vercel AI SDK `generateObject` with Zod schemas for structured output), and the full directory structure. The architecture document closed with an implementation readiness checklist and explicit guidance for agent-to-agent handoff.

**Phase 4 — Implementation** executed nine stories across four epics. Each story was a markdown file containing the user story, acceptance criteria in Given/When/Then format, and a checklist of tasks with exact file paths, function signatures, and implementation constraints. This is specs-driven development in its most literal form: the agent reads the story, implements exactly what is described, marks each task checkbox, and updates `sprint-status.yaml` before stopping.

## Specs-Driven Development

The story files are the key mechanism. Story `2-1-ai-priority-scoring.md` does not say "build priority scoring." It specifies: create `app/services/ai.server.ts` with a `.server.ts` suffix to prevent Vite from bundling it into the client, use `generateObject` rather than `generateText` for guaranteed structured output, call scoring fire-and-forget after `bulkPut` so it does not block the `clientLoader` return, and fail safe to `"low"` on any error. An agent following this story cannot make a wrong architectural choice because the story eliminates optionality at every decision point.

This approach resolves the core failure mode of agentic coding: context drift across sessions. Because each story is self-contained and the architecture document is the ground truth, a new agent context can pick up any story and produce consistent output without needing to infer conventions from existing code.

## Multi-Agent Role Specialization

Each phase uses a different agent persona with a different cognitive frame. The Business Analyst maximizes for user problem clarity and market evidence. The Product Manager maximizes for user value and scope containment. The UX Designer maximizes for interaction quality on a 390px mobile viewport. The System Architect maximizes for consistency, testability, and boundary enforcement. The Senior Engineer maximizes for acceptance criteria coverage and test-first discipline. The Tech Writer maximizes for future-agent readability.

This specialization is not cosmetic. A Business Analyst reading a PRD draft asks "does this solve the stated user problem?" — a question an engineer would not naturally prioritize. A System Architect reviewing a component asks "does this violate the established boundary between `.server.ts` and `.client.ts`?" — a question a UX designer would not consider. Role boundaries produce better artifacts than a single generalist agent would produce working alone.

## Skills and Hooks as Quality Gates

Claude Code skills (`ui-ux-pro-max`, `claude-api`, `review`, `security-review`, `simplify`) are invoked as specialized workflow steps, not as conversational features. The `review` skill, for example, checks each completed story against its acceptance criteria before moving to the next story — a lightweight continuous review loop that catches drift before it compounds. The `security-review` skill specifically validated that the BFF pattern held: no OAuth access token appears in any client-side route or component.

Hooks automate the mechanical quality gates. A pre-commit hook runs `npm run typecheck` before any file is written, so TypeScript errors surface at the moment of generation rather than at the end of a session. A stop hook checks `sprint-status.yaml` and surfaces any story marked done in code but not updated in tracking — preventing the planning system from falling out of sync with the implementation state.

## AI-First Thinking in the Application

The AI features in JobTalk AI are not bolted-on extras — they are the primary value proposition. The priority scoring agent (`api.score.ts`) fires on every inbox sync, classifying each email in a job-seeker context where an interview invitation and a newsletter require radically different response urgency. The summarization agent (`api.summarize.ts`) produces "The Ask" — a concept that acknowledges that job seekers read email to find what is being asked of them, not to read prose. The draft agent (`api.draft.ts`) operates with intent-anchoring: the user selects a chip ("Yes, schedule it", "I'll follow up") before AI generates a draft, which means the model is constrained to a known intent rather than guessing.

All three agents use `generateObject` with Zod schemas rather than free-text generation. This is a deliberate architectural choice: the application does not parse AI-generated text — it receives typed, validated data structures that feed directly into Dexie.js writes and React component props. The AI layer is treated as a typed service boundary, not a text source.

The result is an application where AI is load-bearing infrastructure. Remove the scoring agent and the inbox has no triage. Remove the summarization agent and threads have no "Ask." Remove the draft agent and smart reply chips have no payload. This is what AI-first means in practice: the AI features are not features — they are the core architecture.
