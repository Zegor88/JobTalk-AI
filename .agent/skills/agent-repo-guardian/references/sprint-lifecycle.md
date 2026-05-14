# Capability: Sprint Lifecycle

## What Success Looks Like

Every sprint transition is clean and traceable: branches follow a consistent naming convention, commits tell a readable story, CHANGELOG.md reflects what actually shipped, and main is always in a deployable state. The user never has to think about Git mechanics — they describe what they want in plain language and the Guardian handles the rest.

## Branch Strategy

**Persistent branches:**

| Branch | Purpose | Who touches it |
| --- | --- | --- |
| `main` | Production-ready code only. Protected — zero direct commits. | Merged from `develop` after sprint retro. |
| `develop` | Integration branch. All features land here first. | Merged from `feature/*` and `hotfix/*`. |

**Short-lived branches — created per task, deleted after merge:**

| Prefix | Pattern | Example |
| --- | --- | --- |
| `feature/` | `feature/sprint-N-short-description` | `feature/sprint-3-user-authentication` |
| `hotfix/` | `hotfix/issue-description` | `hotfix/token-expiration-crash` |

When the user asks to start work on something, ask: *"Is this a new feature for the current sprint, or an urgent fix for a live issue?"* — then propose the branch name before creating it.

## Commit Format — Conventional Commits

Every commit follows the [Conventional Commits](https://www.conventionalcommits.org/) standard. Translate the user's plain-language description into the correct format:

```
<type>: <short imperative description>

[optional body — one paragraph, explains WHY not WHAT]
[optional footer — BREAKING CHANGE or issue refs]
```

**Allowed types:**

| Type | When to use |
| --- | --- |
| `feat` | A new capability visible to users |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance — dependency bumps, config, tooling |
| `refactor` | Code restructured with no behavior change |
| `test` | Tests added or updated |
| `ci` | CI/CD pipeline changes |

**Examples:**
```
feat: add user authentication via JWT
fix: resolve token expiration on session refresh
docs: update API reference with new endpoints
chore: bump UV dependency versions
```

When the user describes a change in their own words, offer them the formatted commit message before applying it. Confirm once, then commit.

## Sprint Close — End-of-Sprint Ritual

After each sprint retrospective, execute the following sequence — explain each step before doing it:

1. **Update CHANGELOG.md** — add a new version entry under the `[Unreleased]` section, listing all `feat:` and `fix:` commits from this sprint in plain language (not raw commit hashes). Use [Keep a Changelog](https://keepachangelog.com/) format.

2. **Determine version number** — propose the next semantic version following these rules:
   - Breaking change in this sprint → bump **MAJOR** (`1.0.0` → `2.0.0`)
   - New features, no breaking changes → bump **MINOR** (`1.0.0` → `1.1.0`)
   - Bug fixes only → bump **PATCH** (`1.0.0` → `1.0.1`)
   - Present the proposed version and the reasoning before tagging.

3. **Create a version tag** — format: `vMAJOR.MINOR.PATCH` (e.g. `v1.2.0`). Tag the merge commit on `develop` after CHANGELOG.md is committed.

4. **Merge develop → main** — via pull request or direct merge with a summary message: `chore: release vMAJOR.MINOR.PATCH`. Ask for confirmation before merging.

5. **Report the sprint summary** — one plain-English paragraph: what shipped, what version was tagged, what main now contains.

## Merge Flow (Hard Rules)

```
feature/* ──► develop ──► main
hotfix/*  ──►             (never directly to main)
```

If the user asks to push directly to main, respond: *"Main is protected — all changes flow through develop first. This keeps main always deployable. Want me to merge develop into main now, or is there still work in progress?"*
