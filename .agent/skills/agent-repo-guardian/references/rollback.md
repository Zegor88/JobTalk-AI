# Capability: Rollback Protocol

## What Success Looks Like

The user understands exactly what state their codebase was in at the target point in time — in plain language, not Git jargon — and has chosen a safe, reversible path to get there. No history is rewritten, no work is lost without explicit approval.

## Your Approach

**Step 1 — Understand what the user actually wants.**

"Roll back" means different things. Ask one clarifying question before touching anything:

- *"Do you want to go back to a specific sprint release (e.g. v1.2.0), a specific date, or the last point before a particular change was made?"*

Do not assume. Get a concrete anchor point: a tag, a sprint number, a date, or a feature description.

**Step 2 — Find the exact point in history.**

Locate the target using git log or the CHANGELOG.md:

- If the user names a version tag (e.g. `v1.2.0`) → find that tag directly.
- If the user describes a sprint or feature → match it to a CHANGELOG.md entry and find the associated tag or commit range.
- If the user gives a date → find the nearest commit before that date on `main` or `develop`.

Report back in plain language what you found: *"The tag v1.2.0 was created on [date]. At that point, the app had [summarize what was in CHANGELOG.md for that release]. Is this the state you want to return to?"*

**Step 3 — Propose a safe path and confirm.**

Never choose a path without the user's understanding. Present the options that apply to their situation:

| Option | What it does | When to use | Risk |
| --- | --- | --- | --- |
| **Revert a specific commit** | Creates a new commit that undoes one change — preserves full history | Undoing one bad commit in an otherwise good release | Low — fully reversible |
| **Hotfix branch from a tag** | Creates `hotfix/rollback-to-vX.Y.Z` from the target tag — work happens safely, merged via PR | Returning to a known-good release state while keeping current work accessible | Low — no history rewritten |
| **Hard reset (last resort)** | Moves the branch pointer back — discards commits after the target | Only if commits truly must be erased and team has been notified | **High — destructive, requires double confirmation** |

Explain the chosen option in one plain-English sentence: *"This will create a new commit that undoes [change] — your full history stays intact and this can be reversed if needed."*

**Step 4 — Double confirmation for destructive operations.**

For hard reset or any operation that discards commits:

1. First confirmation: *"This will permanently remove [N] commits from [branch]. This cannot be undone. Shall I proceed?"*
2. Second confirmation: *"To be sure — type YES to confirm the rollback."*

For non-destructive operations (revert, hotfix branch): single confirmation is sufficient.

**Step 5 — Execute and report.**

After execution, report in plain language:

- What was done (one sentence).
- What the branch or tag now points to.
- How to verify: *"You can confirm this worked by checking [observable behavior or file state]."*
- What the next step is: *"If this looks correct, I can merge the hotfix branch into develop and then main."*

---

## Hard Rules

- **Never rewrite history on `main` or `develop`** without explicit double confirmation and a clear user understanding of the consequences.
- **Always prefer non-destructive paths** — revert commits and hotfix branches preserve history and are reversible.
- **Always explain what state the code was in at the rollback point** — not just the commit hash. The user needs to know what they're returning to.
- **Tag the rollback** — after a successful rollback merge, tag the result as `vX.Y.Z-rollback` so the event is traceable in history.
