

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- **Unified Communication:** Single interface for Gmail, Outlook, and IMAP.
- **AI-Agentic Layer:** Automated thread summarization ("The Ask"), draft generation, and priority scoring.
- **Progressive Web App:** Mobile-first, installable, with offline access and push notifications.

**Non-Functional Requirements:**
- **Sub-second Performance:** App Shell <1s, sub-second TTI using local-first patterns.
- **OAuth 2.1 Security:** Secure credential management via BFF.
- **Privacy-First AI:** Secure processing with no cleartext storage of sensitive mail data.

**Scale & Complexity:**
- Project complexity appears to be: **High**
- Primary technical domain: **Full-stack PWA**
- Estimated architectural components: ~6 (BFF, Local DB, AI Engine, Sync Engine, Provider Adapters, PWA Shell)

### Technical Constraints & Dependencies
- Framework: Remix (v2.4+ for client data features).
- Storage: Dexie.js / IndexedDB for local-first experience.
- AI: Vercel AI SDK v6 with ToolLoop patterns.
- Auth: BFF pattern for OAuth token security.

### Cross-Cutting Concerns Identified
- **Sync Consistency:** Managing delta-syncs and conflict resolution in IndexedDB.
- **Security:** Token lifecycle management and secure AI handshakes.
- **Context Management:** Feeding appropriate thread history into AI models without exceeding token limits or compromising privacy.

## Starter Template Evaluation

### Primary Technology Domain
**Full-stack PWA** based on project requirements analysis (Universal Email Client).

### Starter Options Considered
- **React Router v7 (Official):** The successor to Remix. Provides the best integration for client-side data fetching (`clientLoader`).
- **Remix-PWA Ecosystem:** Comprehensive toolkit for PWA features in the Remix/React Router environment.
- **Vercel AI SDK Starters:** Evaluated, but found too focused on simple chat UI, missing the robust PWA/Sync needs of an email client.

### Selected Starter: React Router v7 + Remix-PWA

**Rationale for Selection:**
React Router v7 (the evolution of Remix) provides the necessary `clientLoader` and `clientAction` hooks required for a high-performance **Local-First** architecture with Dexie.js. The `remix-pwa` addition ensures production-ready PWA capabilities like push notifications (via BFF) and complex offline caching strategies essential for an email client.

**Initialization Command:**

```bash
npx create-react-router@latest jobtalk-ai
# Then, inside the project:
npx remix-pwa@latest
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript 6.x, Node.js 20+, React 19.

**Styling Solution:**
Vanilla CSS via `index.css` (overriding default Tailwind if present).

**Build Tooling:**
Vite-based build system with optimized bundling.

**Testing Framework:**
Vitest for unit/integration, Playwright for E2E.

**Code Organization:**
Route-based architecture with separate folders for components, hooks, and services.

**Development Experience:**
HMR (Hot Module Replacement) via Vite, strict TypeScript checks, and integrated linting (ESLint).

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data Architecture: Local DB (Dexie.js) + Sync Engine
- Authentication: OAuth 2.1 via BFF pattern
- Frontend State: React Context + useLiveQuery

**Important Decisions (Shape Architecture):**
- API & AI: Vercel AI SDK with ToolLoop patterns
- UI Kit: Minimalist Vanilla CSS + Semantic HTML5

**Deferred Decisions (Post-MVP):**
- Complex conflict resolution strategies for sync (revisit after MVP)

### Data Architecture

- **Database:** Dexie.js (IndexedDB wrapper) for robust local-first capabilities.
- **State Management:** React Context + useLiveQuery as the primary source of truth is Dexie.js.

### Authentication & Security

- **Authentication Method:** OAuth 2.1 via Backend-For-Frontend (BFF).
- **Data Privacy:** Local-first processing with Vercel AI SDK for secure generation, minimizing sensitive data sent over network.

### API & Communication Patterns

- **API Framework:** Remix `clientLoader` / `clientAction` hooks for seamless local data orchestration.
- **AI Engine:** Vercel AI SDK v6 utilizing ToolLoop patterns for agentic features.

### Frontend Architecture

- **UI Components:** Minimalist Vanilla CSS with CSS variables. Reliance on native HTML5 (`<dialog>`) for accessibility.
- **Layout:** Mobile-First. Desktop interface uses a centered container (`max-width: 600px`).
- **PWA Capabilities:** Service Workers managing offline caching and sync loops.

### Decision Impact Analysis

**Implementation Sequence:**
1. Project Initialization (React Router v7 + Remix-PWA)
2. UI Toolkit and Architecture Setup (Vanilla CSS variables)
3. Local Database & State Initialization (Dexie.js + React Context)
4. Authentication Flow (BFF Integration)
5. AI Agentic Integration (Vercel AI SDK)

**Cross-Component Dependencies:**
- Dexie.js sync relies on BFF for auth tokens.
- Vercel AI SDK features rely on local Context for context-awareness without token bloating.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
5 areas where AI agents could make different choices.

### Naming Patterns

**Database Naming Conventions (Dexie.js):**
- **Tables/Collections:** `camelCase` (e.g., `emailThreads`, `userSettings`).
- **Keys/Indices:** `camelCase` (e.g., `threadId`, `lastSyncedAt`).

**API Naming Conventions:**
- **Local API Actions:** `camelCase` prefixed with verb (e.g., `syncEmails`, `generateDraft`).
- **BFF Routes:** `kebab-case` for paths (e.g., `/api/auth-callback`, `/api/refresh-token`).

**Code Naming Conventions:**
- **Components:** `PascalCase.tsx` (e.g., `ThreadList.tsx`, `SummaryCard.tsx`).
- **Route Files (React Router v7):** `kebab-case.tsx` (e.g., `_index.tsx`, `inbox.tsx`, `thread.$id.tsx`).
- **Utility Functions:** `camelCase.ts` (e.g., `dateFormatter.ts`).

### Structure Patterns

**Project Organization:**
- `app/components/`: Reusable UI components (buttons, dialogs).
- `app/routes/`: Route components mapping directly to URLs.
- `app/models/`: Dexie.js schema definitions and local DB queries.
- `app/services/`: External integrations (BFF calls, AI SDK abstractions).
- `app/utils/`: Pure helper functions.

**File Structure Patterns:**
- Feature logic should be co-located. If a component is only used in one route, it lives in a `components` folder next to that route, or inside `app/components/features/`.

### Format Patterns

**API Response Formats:**
- **BFF Responses:** Return standard JSON with `{ data, error }` wrapper.
- **Local Loaders/Actions:** Return raw data directly if successful. If error, throw a standard Web `Response` or `Error` to be caught by React Router's `ErrorBoundary`.

**Data Exchange Formats:**
- **Dates:** Stored as ISO 8601 strings in Dexie or Unix epoch numbers. Passed to UI as strings.

### Communication Patterns

**State Management Patterns:**
- **Source of Truth:** Dexie.js is the primary state.
- **UI State:** React Context for ephemeral UI state.
- **Reactivity:** Use `useLiveQuery` to reactively bind Dexie data to components.

### Process Patterns

**Error Handling Patterns:**
- **Route Errors:** Use React Router `ErrorBoundary` at the layout level to catch thrown `Response` objects.
- **Form Errors:** Use `useActionData` to return validation errors to forms without throwing.

**Loading State Patterns:**
- **Navigation:** Use React Router's `useNavigation().state` for global transition indicators.
- **Data Mutations:** Use `useFetcher` for local optimistic UI updates.

### Enforcement Guidelines

**All AI Agents MUST:**
- Use `useLiveQuery` for Dexie.js data fetching instead of manual `useEffect` subscriptions.
- Place all reusable UI components in `PascalCase.tsx` files inside `app/components`.
- Throw `Response` objects from `clientLoader` on missing data (e.g., `throw new Response("Not Found", { status: 404 })`).
- **CSS Enforcement:** Strictly use CSS variables from `index.css` for styling. Hardcoded HEX values or utility classes (like Tailwind) are forbidden.
- **Animations:** Implement all UI transitions (swipes, overlays) using native CSS `transition` and `transform`. No JS animation libraries.
- **Style Isolation:** Use CSS Modules (`.module.css`) for component-specific styles to prevent global namespace collisions.

## Project Structure & Boundaries

### Complete Project Directory Structure
```
jobtalk-ai/
├── package.json
├── react-router.config.js
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── .env
├── README.md
├── public/
│   ├── favicon.ico
│   ├── manifest.webmanifest
│   └── icons/
└── app/
    ├── root.tsx
    ├── entry.client.tsx
    ├── entry.server.tsx
    ├── routes/
    │   ├── _index.tsx
    │   ├── login.tsx
    │   ├── auth.callback.tsx
    │   ├── inbox.tsx
    │   └── thread.$id.tsx
    ├── components/
    │   ├── ui/                 # Reusable semantic UI components
    │   ├── layout/             # Sidebar, Header
    │   └── features/           # Domain-specific components (e.g. email)
    ├── models/
    │   └── db.client.ts        # Dexie.js database definition
    ├── services/
    │   ├── bff.server.ts       # API calls to BFF (Auth, external data)
    └── ai.client.ts        # Vercel AI SDK integration
```

### Architectural Boundaries

**API Boundaries:**
- The BFF acts as a strict boundary for authentication and external API requests (Gmail, Outlook).
- Local Dexie DB is the boundary for all offline data access.
- Vercel AI SDK handles its own boundary for LLM streaming.

**Component Boundaries:**
- UI components in `components/ui/` must be pure and state-free (dumb components).
- Feature components (`components/features/`) may connect to `useLiveQuery` for local state.
- Route components (`routes/`) manage data fetching via `clientLoader` and `clientAction`.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- **Email Sync:** Managed by Service Worker + `models/db.client.ts`.
- **Thread View:** Located in `routes/thread.$id.tsx`.
- **AI Summary:** Triggered via `services/ai.client.ts`.

### File Organization Patterns

**Source Organization:**
- Follows React Router v7's file-based routing (`app/routes/`).
- Strict separation of client-side code (`.client.ts`) and server-side code (`.server.ts`).

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All architectural decisions (React Router v7, Dexie.js, OAuth 2.1 via BFF, Vercel AI SDK) work together cohesively. The React Router client loaders naturally complement Dexie.js local-first patterns.

**Pattern Consistency:**
Implementation patterns strongly support the local-first structure, ensuring naming, structural, and communication patterns align with the selected tech stack.

**Structure Alignment:**
The project structure explicitly supports the defined boundaries, clearly separating UI components, route loaders, BFF integrations, and the AI SDK abstraction.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
Core epics (Email Sync, Thread View, AI Summary) map cleanly to the documented architectural components.

**Functional Requirements Coverage:**
All major FRs are supported. The local-first strategy via Dexie.js fulfills the offline requirements, and the BFF secures the authentication layer.

**Non-Functional Requirements Coverage:**
Performance targets are addressed by local DB reads and Optimistic UI. Privacy is managed by restricting data transfer and performing AI processing explicitly through secure channels.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical architectural decisions are recorded with sufficient context to guide implementation without ambiguity.

**Structure Completeness:**
The complete directory structure and specific file patterns give agents deterministic paths for implementation.

**Pattern Completeness:**
Potential conflict points like database naming, component file naming, and state management patterns have been fully specified.

### Gap Analysis Results

**Critical Gaps:** None.
**Important Gaps:** None.
**Minor Gaps:** Some complex conflict resolution edge-cases for Dexie Sync are deferred to post-MVP.

### Validation Issues Addressed

- Conflict resolution strategies deferred to prevent scope creep during initial MVP implementation.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION
**Confidence Level:** High

**Key Strengths:**
- Clear local-first strategy ensures excellent UX.
- Distinct boundaries prevent monolithic entanglement.
- Strict typing and pattern rules guarantee AI agent consistency.

**Areas for Future Enhancement:**
- Advanced Offline Sync conflict resolution mechanisms.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Initialize project with `npx create-react-router@latest jobtalk-ai` and `npx remix-pwa@latest`
## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data Architecture: Local DB (Dexie.js) + Sync Engine
- Authentication: OAuth 2.1 via BFF pattern
- Frontend State: React Context + useLiveQuery

**Important Decisions (Shape Architecture):**
- API & AI: Vercel AI SDK with ToolLoop patterns
- UI Kit: Minimalist Vanilla CSS + Semantic HTML5

**Deferred Decisions (Post-MVP):**
- Complex conflict resolution strategies for sync (revisit after MVP)

### Data Architecture

- **Database:** Dexie.js (IndexedDB wrapper) for robust local-first capabilities.
- **State Management:** React Context + useLiveQuery as the primary source of truth is Dexie.js.

### Authentication & Security

- **Authentication Method:** OAuth 2.1 via Backend-For-Frontend (BFF).
- **Data Privacy:** Local-first processing with Vercel AI SDK for secure generation, minimizing sensitive data sent over network.

### API & Communication Patterns

- **API Framework:** Remix `clientLoader` / `clientAction` hooks for seamless local data orchestration.
- **AI Engine:** Vercel AI SDK v6 utilizing ToolLoop patterns for agentic features.

### Frontend Architecture

- **UI Components:** Tailwind CSS combined with Radix UI (or Shadcn/ui) for accessible, responsive components.
- **PWA Capabilities:** Service Workers managing offline caching and sync loops.

### Decision Impact Analysis

**Implementation Sequence:**
1. Project Initialization (React Router v7 + Remix-PWA)
2. UI Toolkit and Architecture Setup (Tailwind + Radix)
3. Local Database & State Initialization (Dexie.js + React Context)
4. Authentication Flow (BFF Integration)
5. AI Agentic Integration (Vercel AI SDK)

**Cross-Component Dependencies:**
- Dexie.js sync relies on BFF for auth tokens.
- Vercel AI SDK features rely on local Context for context-awareness without token bloating.
