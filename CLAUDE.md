# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**JobTalk AI** — AI-powered universal email client PWA (mobile-first). Supports Gmail, Office 365, and IMAP (Yahoo, AOL) with unified inbox, AI summaries, draft replies, and email prioritization. Deployed to Vercel.

Communication language with **Egor**: Russian. All generated documents: English.

## Methodology

All planning work flows through four phases in order:

| Phase               | Activities                                                                                 | Key outputs                                       |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1 – Analysis       | Market Research, Domain Research, Technical Research, Product Brief / PRFAQ, Brainstorming | Research docs, product brief                      |
| 2 – Planning       | Create PRD → Validate PRD → Edit PRD → Create UX                                        | PRD, UX design                                    |
| 3 – Solutioning    | Create Architecture → Create Epics & Stories → Check Implementation Readiness            | Architecture doc, epics/stories, readiness report |
| 4 – Implementation | Sprint Planning → Sprint Status → Create Story → Dev Story → Code Review               | Sprint plan, story files, code                    |

## Team Roles

| Role                                        |
| ------------------------------------------- |
| Business Analyst — research & requirements |
| Product Manager — PRD & user value         |
| UX Designer — screens & flows              |
| System Architect — tech decisions          |
| Senior Engineer — story implementation     |
| Tech Writer — documentation                |

## Directory Layout

```
_output/
  planning-artifacts/         PRDs, architecture docs, UX designs, epics/stories
  implementation-artifacts/   Sprint plans, story files
docs/                         Project knowledge base (research, decisions, guides)
app/                          React Router v7 application source
public/                       Static assets and PWA manifest
```

## Output Conventions

- Planning artifacts → `_output/planning-artifacts/`
- Implementation artifacts → `_output/implementation-artifacts/`
- Project knowledge docs → `docs/`
- All documents are written in **English**; conversation with Egor is in **Russian**

## Key Workflow Commands

```
npm run dev       Start dev server (port 5173)
npm run build     Production build
npm run start     Serve production build
npm run typecheck Run TypeScript checks
npm test          Run Vitest test suite
```

## Tech Constraints

- Target: mobile PWA, Vercel deployment (free tier)
- Email providers: Gmail (OAuth 2.0), Office 365 (OAuth 2.0), IMAP (Yahoo, AOL)
- AI features: summaries, draft replies, priority scoring — use Google Gemini API via `@ai-sdk/google` (model: `gemini-2.5-flash`)
- No contacts, tasks, notes, or calendar features in scope
