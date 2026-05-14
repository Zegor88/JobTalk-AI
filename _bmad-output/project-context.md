---
project_name: 'JobTalk AI'
user_name: 'Egor'
date: '2026-05-14'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 24
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Framework**: React Router v7.15.1
- **UI Library**: React v19.2.6, ReactDOM v19.2.6
- **Local DB**: Dexie.js v4.4.2 (with dexie-react-hooks v4.4.0)
- **PWA**: @remix-pwa/dev v3.1.0
- **Build & Test**: Vite v8.0.3, Vitest v4.1.6, TypeScript v5.9.3
- **Testing Libraries**: @testing-library/react v16.3.2, fake-indexeddb v6.2.5

## Critical Implementation Rules

### Language-Specific Rules

- **TypeScript Enforcement:** Use strict typing for all component props, state, and loaders. Avoid using `any`.
- **Error Handling:** When data is missing or validation fails in a `clientLoader` or `clientAction`, always throw a standard Web `Response` object (e.g., `throw new Response("Not Found", { status: 404 })`). The React Router layout `ErrorBoundary` is designed to catch these.
- **Async Patterns:** Prefer `async/await` for asynchronous operations, particularly when interacting with Dexie.js or BFF endpoints.

### Framework-Specific Rules

- **React Router Hooks Usage:** Use `useFetcher` for local optimistic UI mutations. Use `useNavigation().state` for global loading indicators. Use `useActionData` for returning form validation errors without throwing.
- **Dexie.js State Management:** Dexie.js is the single source of truth. ALWAYS use `useLiveQuery` from `dexie-react-hooks` to bind Dexie data to React components. NEVER use manual `useEffect` subscriptions for database state.
- **Component Organization:** Place pure semantic UI components in `app/components/ui/` (`PascalCase.tsx`). Place route components in `app/routes/` (`kebab-case.tsx`). Co-locate feature-specific components either next to their routes or in `app/components/features/`.
- **Styling & UI Rules:** Strictly use Vanilla CSS with CSS Modules (`.module.css`) for component styling. Use CSS variables from `index.css` for design tokens. Hardcoded HEX values and utility classes (like Tailwind) are strictly forbidden. Use native CSS `transition` and `transform` for animations (no JS animation libraries).

### Testing Rules

- **Test Framework:** Use Vitest and React Testing Library for all frontend tests.
- **Test Organization:** Co-locate test files with their respective components or functions (e.g., `ComponentName.test.tsx`).
- **Dexie.js Testing:** Always import and use `fake-indexeddb` to mock the IndexedDB environment when testing functions, loaders, or components that interact with the local database.
- **Integration vs Unit:** Prioritize integration testing for React Router `clientLoader` and `clientAction` functions to ensure data flow is correct. Use unit tests primarily for pure utility functions and isolated UI components.

### Code Quality & Style Rules

- **Naming Conventions (Files):** Use `PascalCase.tsx` for React components. Use `kebab-case.tsx` for route files. Use `camelCase.ts` for utilities and services.
- **Naming Conventions (Database & API):** Use `camelCase` for Dexie.js tables and indices (e.g., `emailThreads`). Use `kebab-case` for BFF API route paths (e.g., `/api/auth-callback`). Use verb-prefixed `camelCase` for local API actions (e.g., `generateDraft`).
- **Data Exchange Format:** Store dates as ISO 8601 strings or Unix epoch numbers in Dexie.js. Pass them to the UI components strictly as strings.
- **Documentation Requirements:** Provide JSDoc comments for complex business logic, specifically around offline synchronization with Dexie.js and AI SDK ToolLoop integrations.

### Development Workflow Rules

- **Test-First Approach:** Always implement required tests in Vitest before executing the main feature logic.
- **Sprint Tracking:** Upon completing an implementation story, immediately update its status in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **Story Execution:** Read the full story markdown file before implementing. Ensure all acceptance criteria and technical guardrails in the story are strictly met.
- **Branch Strategy:** Follow the "main-is-sacred" pattern. Do not commit directly to main. Use branch-based workflows for isolated development.

### Critical Don't-Miss Rules

- **CSS Anti-Pattern:** NEVER use Tailwind CSS classes or inline styles. Strictly use Vanilla CSS with CSS Modules and CSS variables from `index.css`.
- **State Anti-Pattern:** NEVER manually subscribe to Dexie.js using `useEffect`. Always rely on `useLiveQuery` for reactivity.
- **Security Rule:** NEVER expose OAuth tokens to the client application. The BFF must handle all token lifecycle and secure handshakes.
- **Offline Edge Cases:** Assume the application will frequently drop connection. Never block user interaction (e.g., drafting emails) due to lack of network. Always store mutations locally in Dexie first.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-05-14
