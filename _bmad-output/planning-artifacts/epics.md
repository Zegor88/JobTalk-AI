---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - prd-jobtalk-ai.md
  - architecture.md
  - ux-design-specification.md
---

# JobTalk AI - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for JobTalk AI, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Unified Inbox - Consolidated view of all accounts.
FR2: Account Switching - Ability to filter by specific provider.
FR3: Standard Actions - Compose, Reply, Forward, Search, Archive, Delete, Labels.
FR4: PWA Features - Installable (A2HS), Offline access to cached mail, Push notifications (via BFF).
FR5: AI Thread Summarization - Intelligent extraction of "The Ask" and "Action Items" from long threads.
FR6: AI Draft Generation - Context-aware reply suggestions based on thread history.
FR7: AI Priority Scoring - Automated "High/Low" priority marking by AI agent.

### NonFunctional Requirements

NFR1: Performance - App Shell loads in <1s; sub-second "Time to Interactive" on mobile.
NFR2: Engineering Excellence - 100% test coverage for core flows (compose, reply, archive).
NFR3: Security - OAuth 2.1 for Google/Microsoft; secure credential storage for IMAP.
NFR4: Privacy - AI processing should happen securely via Vercel AI SDK; no local LLM storage of sensitive mail data in cleartext.
NFR5: Reliability - Robust sync retry logic for unstable mobile connections.

### Additional Requirements

- Starter Template: React Router v7 + Remix-PWA initialized via `npx create-react-router@latest jobtalk-ai` and `npx remix-pwa@latest`.
- Data Architecture: Local DB (Dexie.js) + React Context + useLiveQuery.
- Auth: OAuth 2.1 via BFF pattern.
- API/AI: Vercel AI SDK with ToolLoop patterns.
- Styling: Minimalist Vanilla CSS with CSS variables (no utility classes/Tailwind).
- Components: Reusable UI components in `PascalCase.tsx` files inside `app/components`.
- Transitions/Animations: Native CSS `transition` and `transform`, no JS animation libraries.

### UX Design Requirements

UX-DR1: SwipeableEmailListItem - Mobile gesture component (Swipe left for Archive, right for Delete) with hidden action panels and accessible hidden buttons.
UX-DR2: AISummaryCard ("The Ask") - Distinctive container with "Sparkle" icon for 1-2 sentence summaries, to be displayed inline or in detail view.
UX-DR3: SmartReplyChip - Pill-shaped predictive branching options for one-tap AI draft generation, showing loading state.
UX-DR4: LightweightComposer - Fast sliding overlay for editing AI drafts with auto-expanding textarea and auto-focus.
UX-DR5: Visual Standardization - Implementation of CSS variables mapping to root (`--space-1`, `--color-primary`) instead of hardcoded hex values.
UX-DR6: Fluid micro-animations - Swipe-to-archive/delete gestures and composer slide-ins built entirely via CSS transitions.
UX-DR7: Undo Snackbar - 3-5 second sliding snackbar instead of blocking confirmation modals for destructive actions.
UX-DR8: Responsive Container - Mobile-first layout scaling gracefully to `max-width: 600px` for desktop.

### FR Coverage Map

FR1: Epic 1 - Unified Inbox (Consolidated view)
FR2: Epic 1 - Account Switching
FR3: Epic 1 - Standard Actions (Archive, Delete, Reply, Compose)
FR4: Epic 1 - PWA Features (Offline, Installable)
FR5: Epic 2 - AI Thread Summarization
FR6: Epic 2 - AI Draft Generation
FR7: Epic 2 - AI Priority Scoring

## Epic List

### Epic 1: PWA Shell & Email Foundation
User Outcome: User can open the app instantly, connect accounts, view a unified inbox, and perform manual triage via mobile gestures even on slow connections.
**FRs covered:** FR1, FR2, FR3, FR4

### Epic 2: AI-Powered Triage & Smart Replies
User Outcome: User can instantly understand long threads via AI summaries and send quick responses using one-tap AI generated drafts.
**FRs covered:** FR5, FR6, FR7

## Epic 1: PWA Shell & Email Foundation

User Outcome: User can open the app instantly, connect accounts, view a unified inbox, and perform manual triage via mobile gestures even on slow connections.

### Story 1.1: Project Initialization & UI Foundation

As a user,
I want a fast, mobile-optimized app shell,
So that I can access my email instantly on any device.

**Acceptance Criteria:**

**Given** a fresh repository
**When** the developer initializes the project
**Then** it must use `React Router v7` and `remix-pwa`
**And** the base UI must be implemented using only Vanilla CSS variables (no Tailwind/utility classes) mapped to root tokens (colors, spacing)
**And** the app layout must be strictly mobile-first with a centered `max-width: 600px` container for larger screens.

### Story 1.2: Local Database & BFF Sync Setup

As a user,
I want my emails to load instantly and work offline,
So that I can read mail even with a bad connection.

**Acceptance Criteria:**

**Given** the user is logged in
**When** the app opens
**Then** it must securely authenticate via the BFF (OAuth 2.1) without exposing tokens to the client
**And** it must fetch emails from the unified backend (Gmail, O365, IMAP) and store them locally using `Dexie.js`
**And** the UI must instantly render the cached inbox from Dexie.js (`useLiveQuery`) while fetching deltas in the background.

### Story 1.3: Unified Inbox & Triage UX

As a user,
I want to quickly archive or delete emails with a swipe,
So that I can triage my inbox effortlessly.

**Acceptance Criteria:**

**Given** the user is viewing the Unified Inbox
**When** the user swipes left on an email list item
**Then** the UI must instantly reveal an Archive action and optimistically remove the item from the list
**And** a 3-second Snackbar must appear allowing the user to "Undo" the action before background sync executes
**And** visually hidden accessible buttons must be present in the DOM for screen readers
**And** clicking an email must instantly load the thread view using locally cached data.

## Epic 2: AI-Powered Triage & Smart Replies

User Outcome: User can instantly understand long threads via AI summaries and send quick responses using one-tap AI generated drafts.

### Story 2.1: AI Priority Scoring

As a user,
I want the AI to automatically highlight important emails,
So that I can focus on urgent matters first.

**Acceptance Criteria:**

**Given** a new email is synced to the local database
**When** the AI engine evaluates the email content
**Then** it must securely assign a "High" or "Low" priority score without storing cleartext locally
**And** the UI must display a distinct visual indicator (e.g., accent colored badge) on high-priority items in the inbox list.

### Story 2.2: Thread Summarization ("The Ask")

As a user,
I want a concise summary of long email threads,
So that I don't have to read every message to understand the required action.

**Acceptance Criteria:**

**Given** the user opens an email thread
**When** the thread contains multiple messages or long text
**Then** the Vercel AI SDK must generate a 1-2 sentence summary ("The Ask") and actionable items
**And** the UI must display the `AISummaryCard` component at the top of the thread with a distinct "Magic Purple" accent and Sparkle icon
**And** it must show a non-blocking shimmer loading state while the summary is generating.

### Story 2.3: Smart Replies & Lightweight Composer

As a user,
I want AI to generate draft responses with one tap,
So that I can reply instantly without typing.

**Acceptance Criteria:**

**Given** the user is viewing an email thread with an AI summary
**When** the user taps a `SmartReplyChip` (e.g., "Yes, schedule it")
**Then** the AI must instantly generate a full draft response
**And** the `LightweightComposer` overlay must slide up from the bottom with the draft pre-filled
**And** the composer textarea must auto-focus and expand vertically as the user edits
**And** tapping "Send" must trigger an optimistic UI update, collapse the composer, and return the user to the inbox.
