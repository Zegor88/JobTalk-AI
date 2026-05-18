# Sprint Change Proposal: Addition of Epic 3 (API Integration)
Date: 2026-05-15

## Section 1: Issue Summary
**Problem Statement:** The integration with real email providers (Auth & Provider Sync), which was specified in the PRD as Phase 2, was inadvertently omitted during the epic and story decomposition phase. Consequently, the sprint plan (`epics.md` and `sprint-status.yaml`) only reflects Epic 1 (UI Foundation) and Epic 2 (AI Features).
**Context:** Discovered during the Epic 1 retrospective when the user inquired about the actual API integration for email connection.

## Section 2: Impact Analysis
- **Epic Impact:** Requires adding a new Epic 3 to handle the backend integration.
- **Story Impact:** Requires defining specific backend stories (OAuth, Sync Engine) that will replace the mock data.
- **Artifact Conflicts:** The PRD's Implementation Roadmap lists Phase 2 as Auth and Phase 3 as AI. Since we have already committed to doing AI on mock data first (Epic 2), we need to swap Phase 2 and Phase 3 in the PRD to align with our Frontend-Driven Development strategy.
- **Technical Impact:** The `mock.server.ts` from Epic 1 will remain until Epic 3 is executed, at which point it will be replaced by real BFF logic.

## Section 3: Recommended Approach
**Direct Adjustment (Add Epic 3 & Update PRD Roadmap).** 
- **Rationale:** This is the cleanest approach. It preserves the momentum of building AI features in Epic 2 while clearly defining when the real API integration will happen.
- **Effort Estimate:** Low for planning, High for eventual execution.
- **Risk Level:** Low.

## Section 4: Detailed Change Proposals

### Proposal A: PRD Roadmap Update
**File:** `prd-jobtalk-ai.md`
**Section:** 8. Implementation Roadmap
**OLD:**
1. **Phase 1:** PWA Shell & Local-first storage setup.
2. **Phase 2:** Auth & Provider Sync (Gmail, O365, IMAP).
3. **Phase 3:** AI Integration (Summaries, Drafts, Priority).
4. **Phase 4:** E2E Testing & Vercel Deployment.

**NEW:**
1. **Phase 1:** PWA Shell & Local-first storage setup.
2. **Phase 2:** AI Integration (Summaries, Drafts, Priority) using Mock BFF.
3. **Phase 3:** Auth & Provider Sync (Gmail, O365, IMAP) replacing Mock BFF.
4. **Phase 4:** E2E Testing & Vercel Deployment.

### Proposal B: Epics Addition
**File:** `epics.md`
**Section:** Epic List & Story Breakdown
**NEW CONTENT TO ADD:**
```markdown
### Epic 3: Auth & Provider Sync
User Outcome: User can securely connect their real email accounts via OAuth/IMAP and sync their live inbox to the local application.
**FRs covered:** FR1, FR2 (Backend implementation)

## Epic 3: Auth & Provider Sync
User Outcome: User can securely connect their real email accounts via OAuth/IMAP and sync their live inbox to the local application.

### Story 3.1: OAuth 2.1 & Secure Credential Storage
As a user, I want to securely connect my Gmail and Office 365 accounts without entering my password, so that I can trust the app with my email access.
**Acceptance Criteria:**
- **Given** the user is on the account connection screen
- **When** they select Google or Microsoft
- **Then** the app must initiate an OAuth 2.1 flow via the BFF and securely store the tokens (HTTP-only cookie).

### Story 3.2: Unified Mail Sync Engine
As a user, I want the app to fetch my latest emails from connected providers, so that my inbox is up to date.
**Acceptance Criteria:**
- **Given** the user has authenticated accounts
- **When** the `/api/sync` endpoint is called
- **Then** the BFF must fetch emails from the upstream providers, normalize them, and replace the mock sync logic.
```

### Proposal C: Sprint Status Update
**File:** `sprint-status.yaml`
**NEW CONTENT TO ADD:**
```yaml
  epic-3: backlog
  3-1-oauth-secure-credential-storage: backlog
  3-2-unified-mail-sync-engine: backlog
  epic-3-retrospective: optional
```

## Section 5: Implementation Handoff
- **Scope:** Moderate (requires updates to planning artifacts and sprint status).
- **Handoff:** Amelia (Developer) will execute these document modifications upon user approval.
