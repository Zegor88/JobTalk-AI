# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**JobTalk AI** — AI-powered universal email client PWA (mobile-first). Supports Gmail, Office 365, and IMAP (Yahoo, AOL) with unified inbox, AI summaries, draft replies, and email prioritization. Deployed to Vercel.

Communication language with **Egor**: Russian. All generated documents: English.

## Methodology

All planning work flows through four phases in order:

| Phase               | Skills                                                                                     | Key outputs                                       |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1 – Analysis       | Market Research, Domain Research, Technical Research, Product Brief / PRFAQ, Brainstorming | Research docs, product brief                      |
| 2 – Planning       | Create PRD → Validate PRD → Edit PRD → Create UX                                        | PRD, UX design                                    |
| 3 – Solutioning    | Create Architecture → Create Epics & Stories → Check Implementation Readiness            | Architecture doc, epics/stories, readiness report |
| 4 – Implementation | Sprint Planning → Sprint Status → Create Story → Dev Story → Code Review               | Sprint plan, story files, code                    |

Invoke each phase skill via `/skill-name` (e.g. `/bmad-create-prd`). Use `/bmad-help` if unsure which skill to run next.

## Agent Team

| Skill                      | Name    | Role                                        |
| -------------------------- | ------- | ------------------------------------------- |
| `bmad-agent-analyst`     | Mary    | Business Analyst — research & requirements |
| `bmad-agent-pm`          | John    | Product Manager — PRD & user value         |
| `bmad-agent-ux-designer` | Sally   | UX Designer — screens & flows              |
| `bmad-agent-architect`   | Winston | System Architect — tech decisions          |
| `bmad-agent-dev`         | Amelia  | Senior Engineer — story implementation     |
| `bmad-agent-tech-writer` | Paige   | Tech Writer — documentation                |

## Directory Layout

```
_bmad/                        BMAD framework (installer-managed, treat as read-only)
  config.toml                 Project-level config (project name, output paths)
  config.user.toml            Personal config (user name, communication language)
  custom/                     Override configs — safe to edit
_bmad-output/
  planning-artifacts/         PRDs, architecture docs, UX designs, epics/stories
  implementation-artifacts/   Sprint plans, story files
docs/                         Project knowledge base (research, decisions, guides)
```

Application source code will be created during Phase 4 — its location is determined by the architecture doc produced in Phase 3.

## Output Conventions

- Planning artifacts → `_bmad-output/planning-artifacts/`
- Implementation artifacts → `_bmad-output/implementation-artifacts/`
- Project knowledge docs → `docs/`
- All documents are written in **English**; conversation with Egor is in **Russian**

## Key Workflow Commands

```
/bmad-help                    Identify the right next skill
/bmad-sprint-status           Check sprint progress at any time
/bmad-quick-dev               Fast intent → code path (bypasses full planning pipeline)
/bmad-correct-course          Handle major scope or direction changes mid-sprint
/bmad-code-review             Adversarial review after Dev Story completes
/bmad-check-implementation-readiness   Gate before starting Phase 4
```

## Tech Constraints (to be validated in Phase 3)

- Target: mobile PWA, Vercel deployment (free tier)
- Email providers: Gmail (OAuth 2.0), Office 365 (OAuth 2.0), IMAP (Yahoo, AOL)
- AI features: summaries, draft replies, priority scoring — use Claude API (model: `claude-sonnet-4-6`)
- No contacts, tasks, notes, or calendar features in scope
