# Capability: Project Bootstrap

## What Success Looks Like

The user ends this conversation with a confirmed list of repositories to create (or already created), a clear folder structure for each, and a reproducible environment setup — all traceable to decisions already made in their project documents. No repository is created until the user explicitly approves the plan.

## Your Approach

**Phase 1 — Read the documents first.**

Before proposing anything, read the following files in this order and extract the relevant decisions:

1. `{project-root}/docs/ARCHITECTURE.md` — **primary source**. Extract: frontend framework, backend language, deployment target, services, shared contracts (types, API specs, auth).
2. `{project-root}/_bmad-output/planning-artifacts/prd.md` — Extract: project scope, number of distinct product surfaces.
3. Any UX design spec you can locate (typically `{project-root}/docs/UX*.md` or `{project-root}/_bmad-output/ux*.md`) — confirms frontend presence and complexity.

If ARCHITECTURE.md is missing, stop and inform the user plainly: *"I need the finalized Architecture document before I can propose a repository structure. Has the Architect agent completed ARCHITECTURE.md?"* Do not proceed with guesses.

**Phase 2 — Propose a repository strategy with reasoning.**

Based on what you read, recommend one of the following and explain why — in plain English, referencing the specific document section that led you there:

- **Monorepo** — recommended when frontend and backend share TypeScript types, API contracts, or deployment pipelines. Cite the specific shared artifact from ARCHITECTURE.md.
- **Multi-repo** — recommended when teams and deployments are fully independent, with no shared code. Cite the independence decision from ARCHITECTURE.md.
- **Hybrid** — only if the architecture explicitly separates one component (e.g. a standalone data pipeline) from a tightly coupled main product.

Present the trade-offs specific to **this project**, not generic advice. One short paragraph per option considered.

**Phase 3 — Present the proposed plan for confirmation.**

Show the user a readable list — not commands — covering:

- Repositories to be created: name, visibility (public/private), one-sentence description.
- Folder structure for each repository (top-level directories only — readable, not a tree diagram).
- Environment tooling decisions:
  - Python backend → UV (cite UV docs standard).
  - Node.js frontend → nvm with pinned version.
- Key configuration files that will be generated (see Standard File Set below).

Ask: *"Does this plan match your vision? Any changes before I proceed?"* Do not create anything until the user says yes.

**Phase 4 — Execute after confirmation.**

After explicit approval, execute via GitHub MCP using `GITHUB_TOKEN` and `GITHUB_ORG` from the project `.env`:

1. Create each repository with the agreed name, visibility, and description.
2. Push the initial folder structure and all Standard File Set files (see below).
3. Create `main` and `develop` branches. Protect `main` from direct commits (require PR).
4. Report back in plain English: *"I've created [repo name]. Here's what's inside and how a new team member would get started."*

---

## Standard File Set

Every repository receives these files regardless of stack:

| File | Contents |
| --- | --- |
| `README.md` | Project name, tech stack summary, one-command setup instructions, link to ARCHITECTURE.md |
| `CHANGELOG.md` | Empty changelog, starting at `v0.1.0` (Keep a Changelog format) |
| `ARCHITECTURE.md` | Either a copy or a link to the shared architecture document |
| `.gitignore` | Tailored to the detected stack — never a generic template |
| `.env.example` | All required environment variables documented with descriptions, no real values |
| `docs/agents/` | Empty folder for AI agent instruction files |

---

## Python Backend — UV Exclusively

If the architecture specifies a Python backend, apply these rules without exception:

- `uv init` → creates `pyproject.toml`
- `uv python pin 3.12` → creates `.python-version`
- `uv add <packages>` → never `pip install`
- `uv lock` → creates `uv.lock` (committed to the repository)
- `.gitignore` must include: `.venv/`, `__pycache__/`, `*.pyc`, `*.pyo`
- `README.md` setup section: *"Run `uv sync` to restore the full environment."*
- `.env.example` includes: `UV_PYTHON=3.12`

Tell the user in plain language: *"For your Python backend, I'm using UV — a modern package manager that pins exact versions and lets any team member recreate the environment with a single command. This replaces pip."*

---

## Node.js Frontend — nvm

If the architecture specifies a Node.js frontend:

- `.nvmrc` with the pinned Node.js LTS version (check Context7 MCP for current LTS if available)
- `README.md` setup section: *"Run `nvm use && npm install` to restore the environment."*

---

## Confirmation Gate

This capability ends with one of two states:

1. **Plan approved, execution complete** — report each repository created, what's inside it, and the one-command setup for a new team member.
2. **Plan revised** — loop back to Phase 3 with the updated proposal. Never skip the confirmation gate.
