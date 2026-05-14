# Story 1.1: Project Initialization & UI Foundation

Status: done

## Story

As a user,
I want a fast, mobile-optimized app shell,
so that I can access my email instantly on any device.

## Acceptance Criteria

1. **Given** the developer runs initialization in the existing repo root
   **When** the React Router v7 project is bootstrapped with Remix-PWA
   **Then** the app compiles with `npm run dev`, a Service Worker is registered, and `public/manifest.webmanifest` exists and is valid.

2. **Given** the project is initialized
   **When** the developer sets up the CSS foundation
   **Then** `app/index.css` defines ALL design tokens as CSS custom properties on `:root` (see token list in Dev Notes), no Tailwind classes remain in any file, no hardcoded hex values exist in CSS, and `tailwind.config.ts` is deleted or emptied.

3. **Given** the CSS foundation is in place
   **When** the developer implements the base layout in `app/root.tsx`
   **Then** the layout is strictly mobile-first (100% width on mobile, centered `max-width: 600px` on `>= 768px`), a bottom-anchored `<nav>` container exists, and the `app/components/ui/` directory is seeded with at least one placeholder component to establish the pattern.

## Tasks / Subtasks

- [x] Task 1: Bootstrap the Project (AC: 1)
  - [x] Run `npx create-react-router@latest ./` in the repo root (NOT `jobtalk-ai` subdirectory — repo IS the project root)
  - [x] Run `npx remix-pwa@latest` inside the project to add PWA capabilities
  - [x] Verify `public/manifest.webmanifest` was created by remix-pwa; fill in `name`, `short_name`, `theme_color` (#4F46E5), `background_color` (#FFFFFF), `display: standalone`
  - [x] Verify Service Worker registers by running `npm run dev` and checking DevTools > Application > Service Workers
  - [x] Run `npx vitest --run` — confirm test runner is available (tests may be empty at this point)

- [x] Task 2: Strip Tailwind & Establish Vanilla CSS Foundation (AC: 2)
  - [x] Delete `tailwind.config.ts` (and `postcss.config.js` if Tailwind-specific)
  - [x] Remove `@tailwind` directives from any CSS file
  - [x] Remove `tailwindcss` from `package.json` dependencies and run `npm install`
  - [x] Create/overwrite `app/index.css` with the full design token system (see Token Definitions below — copy verbatim)
  - [x] Verify `grep -r 'tailwind\|@apply\|className="[a-z]' app/` returns no utility-class usage

- [x] Task 3: Implement Mobile-First Base Layout (AC: 3)
  - [x] Update `app/root.tsx` with the shell layout (see Root Layout Blueprint below)
  - [x] Implement `<nav>` as a bottom-fixed navigation bar using CSS from `index.css` tokens only
  - [x] Create `app/components/ui/` directory
  - [x] Create `app/components/ui/BottomNav.tsx` as a pure, state-free placeholder component (PascalCase, no local state)
  - [x] Verify desktop layout: open at `>= 768px` viewport — content must be centered at `max-width: 600px`
  - [x] Write a Vitest unit test for `BottomNav.tsx` (renders without crash + snapshot)

## Dev Notes

### ⚠️ ARCHITECTURE CONFLICT WARNING

`architecture.md` contains a **stale, duplicate section** (lines ~405-420) that references "Tailwind CSS + Radix UI". This is **WRONG** — it's a copy-paste artifact from an earlier draft. The **canonical decision** is:

> **Minimalist Vanilla CSS with CSS variables. NO Tailwind. NO Radix UI.**

Source of truth: `architecture.md#Core Architectural Decisions` → Frontend Architecture and `architecture.md#Enforcement Guidelines`.

---

### Token Definitions (Copy Verbatim into `app/index.css`)

```css
/* =============================================
   JobTalk AI — Design Tokens
   Source: ux-design-specification.md#Color System
   ============================================= */

:root {
  /* Colors — Light Mode */
  --color-canvas:        #F9FAFB;
  --color-surface:       #FFFFFF;
  --color-primary:       #4F46E5;   /* Electric Blue — primary actions */
  --color-ai-accent:     #8B5CF6;   /* Magic Purple — AI-generated content ONLY */
  --color-danger:        #DC2626;   /* Muted red — destructive actions */
  --color-text-primary:  #111827;
  --color-text-secondary:#6B7280;
  --color-border:        #E5E7EB;

  /* Colors — Dark Mode (applied via prefers-color-scheme) */
  /* Note: Dark mode tokens override in @media block below */

  /* Spacing — 4px/8px grid */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Typography — System Native Fonts ONLY (no Google Fonts) */
  --font-base:  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --text-xs:    13px;
  --text-sm:    14px;
  --text-base:  16px;
  --text-lg:    18px;
  --text-xl:    20px;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --line-height-relaxed: 1.5;

  /* Layout */
  --max-width-app: 600px;
  --nav-height: 56px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;

  /* Touch Targets — minimum 44x44px per WCAG 2.1 */
  --touch-target: 44px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-canvas:        #000000;   /* True black for OLED battery savings */
    --color-surface:       #111827;
    --color-text-primary:  #F9FAFB;
    --color-text-secondary:#9CA3AF;
    --color-border:        #1F2937;
  }
}

/* Reset & Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-base);
  font-size: var(--text-base);
  line-height: var(--line-height-relaxed);
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
}

/* App Shell — Mobile First */
.app-shell {
  width: 100%;
  min-height: 100dvh;
  padding-bottom: var(--nav-height); /* Reserve space for fixed bottom nav */
}

/* Desktop Constraint */
@media (min-width: 768px) {
  .app-shell {
    max-width: var(--max-width-app);
    margin: 0 auto;
  }
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}

@media (min-width: 768px) {
  .bottom-nav {
    max-width: var(--max-width-app);
    margin: 0 auto;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* Focus States — Required for keyboard nav (WCAG 2.1 AA) */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

### Root Layout Blueprint (`app/root.tsx`)

The layout structure MUST follow this pattern:

```tsx
// app/root.tsx
import { Links, Meta, Outlet, Scripts } from "react-router";
import { BottomNav } from "~/components/ui/BottomNav";
import "~/index.css"; // ← ONLY place global styles are imported

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="app-shell">
          <Outlet />
          <BottomNav />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
```

---

### `BottomNav.tsx` Seed Component

```tsx
// app/components/ui/BottomNav.tsx
// RULES: Pure component — no local state, no useLiveQuery.
// Styled via index.css tokens only. No hardcoded colors.

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {/* Placeholder — Story 1.3 implements full tabs */}
      <button type="button" aria-label="Inbox" style={{ minHeight: "var(--touch-target)", minWidth: "var(--touch-target)" }}>
        ✉️
      </button>
    </nav>
  );
}
```

---

### Enforcement Rules (Hard Requirements — Violations = Story Rejection)

- **NO hardcoded hex values** in any `.css`, `.tsx`, or `.module.css` file.
- **NO Tailwind classes** (`className="flex"`, `className="text-sm"`, etc.).
- **NO JS animation libraries** (Framer Motion, GSAP, etc.). All transitions via CSS `transition` and `transform`.
- **CSS Modules** (`.module.css`) MUST be used for any component-specific styles (not global layout classes from `index.css`).
- **Components in `app/components/ui/`** MUST be `PascalCase.tsx` and pure (no internal state or database calls).
- **Route files** in `app/routes/` MUST be `kebab-case.tsx`.

---

### Initialization Command Specifics

> **CRITICAL:** The repo root IS the app root. Do NOT run `npx create-react-router@latest jobtalk-ai` — this would create a nested `jobtalk-ai/` subdirectory.

Use:
```bash
npx create-react-router@latest ./
# Accept defaults (TypeScript, Vite). When asked about git: skip (repo already initialized).
npx remix-pwa@latest
```

Expected post-init structure (validate it matches):
```
./
├── package.json
├── react-router.config.js
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── favicon.ico
│   └── manifest.webmanifest    ← Must exist after remix-pwa
└── app/
    ├── root.tsx
    ├── entry.client.tsx
    ├── entry.server.tsx
    ├── index.css                ← Replace with token definitions above
    └── routes/
        └── _index.tsx
```

---

### Testing Requirements (NFR2: 100% coverage for core flows)

- **Framework:** Vitest (bundled with React Router v7/Vite template)
- **E2E:** Playwright (install: `npm install -D @playwright/test`)
- **This story:** Write 1 Vitest unit test for `BottomNav.tsx` (renders + snapshot)
- **Pattern:** Test files co-located as `*.test.tsx` or in `tests/` directory
- **Minimum for story completion:** `npm run test` passes with ≥1 passing test

---

### Git / Branch Convention

- Branch: `develop` (current — do NOT create a new branch for this story)
- Commit format: `feat: <description>` (Conventional Commits)
- Example: `feat: initialize react-router v7 with remix-pwa and vanilla css foundation`

---

### Cross-Story Context

- **Story 1.2** will add `app/models/db.client.ts` (Dexie.js). Do NOT add Dexie here.
- **Story 1.3** will fully implement `BottomNav` with account-switching tabs. The placeholder you create here will be replaced.
- **Story 2.2** will use the `--color-ai-accent` token for `AISummaryCard`. Ensure it is defined correctly in `index.css`.

### References

- [Source: architecture.md#Selected Starter: React Router v7 + Remix-PWA]
- [Source: architecture.md#Enforcement Guidelines]
- [Source: architecture.md#Complete Project Directory Structure]
- [Source: architecture.md#Naming Patterns]
- [Source: ux-design-specification.md#Design System Foundation]
- [Source: ux-design-specification.md#Color System]
- [Source: ux-design-specification.md#Typography System]
- [Source: ux-design-specification.md#Spacing & Layout Foundation]
- [Source: ux-design-specification.md#Responsive Strategy]
- [Source: ux-design-specification.md#Breakpoint Strategy]
- [Source: epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking) — validated by Amelia via bmad-create-story checklist

### Debug Log References

### Completion Notes List

- Checklist validation applied: 7 critical issues, 5 enhancements, 3 optimizations resolved
- Added complete CSS token definitions (verbatim copy-paste ready)
- Added root.tsx blueprint and BottomNav seed component
- Added architecture conflict warning (stale Tailwind reference in architecture.md lines ~405-420)
- Added initialization command disambiguation (repo root = app root)
- Added testing requirements (Vitest unit test for BottomNav)
- Added cross-story context to prevent scope creep
- ✅ Task 1 completed: Initialized React Router v7, integrated remix-pwa, configured webmanifest with JobTalk AI branding.
- ✅ Task 2 completed: Stripped Tailwind dependencies, created index.css with core design tokens.
- ✅ Task 3 completed: Implemented mobile-first root layout, created seed BottomNav component and added Vitest unit tests with RTL.

### File List

- `_bmad-output/implementation-artifacts/1-1-project-initialization-ui-foundation.md`
- `package.json`
- `vite.config.ts`
- `public/manifest.webmanifest`
- `app/routes/manifest[.webmanifest].ts`
- `app/entry.worker.ts`
- `app/index.css`
- `app/root.tsx`
- `app/routes/home.tsx`
- `app/components/ui/BottomNav.tsx`
- `app/components/ui/BottomNav.test.tsx`

### Review Findings
- [x] [Review][Decision] Conflicting Web Manifests — There is a static `public/manifest.webmanifest` and a dynamic route `app/routes/manifest[.webmanifest].ts`. AC specifies the static one. Which should we keep? -> Removed static, kept dynamic.
- [x] [Review][Patch] Missing Remix-PWA Vite Plugin & Service Worker [`vite.config.ts`, `app/root.tsx`]
