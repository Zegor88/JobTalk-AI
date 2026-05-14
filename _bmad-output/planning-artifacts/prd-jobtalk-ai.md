# Product Requirements Document: JobTalk AI

**Project Name:** JobTalk AI  
**Version:** 1.0.0  
**Status:** Approved  
**Date:** 2026-05-14  
**Product Manager:** John

---

## 1. Executive Summary
JobTalk AI is a mobile-ready, universal email PWA built for the AI-first era. It consolidates Gmail, Office 365, and IMAP accounts into a single, high-performance interface. The core value proposition is reducing "digital janitorial work" through agentic AI that summarizes threads, drafts replies, and prioritizes the inbox.

## 2. Problem Statement
Users are overwhelmed by email fragmentation (multiple accounts) and cognitive load (high volume). Existing clients are either ecosystem-locked or lack deep, proactive AI integration that works across all providers.

## 3. Goals & Success Metrics
- **Universal Connectivity:** Successful sync for Gmail, O365, and IMAP.
- **AI Utility:** Summaries that capture the essence of threads, saving >50% of reading time.
- **Performance:** App Shell loads in <1s; sub-second "Time to Interactive" on mobile.
- **Engineering Excellence:** 100% test coverage for core flows (compose, reply, archive).

## 4. Functional Requirements

### 4.1. Core Email Management
- **Unified Inbox:** Consolidated view of all accounts.
- **Account Switching:** Ability to filter by specific provider.
- **Standard Actions:** Compose, Reply, Forward, Search, Archive, Delete, Labels.
- **PWA Features:** Installable (A2HS), Offline access to cached mail, Push notifications (via BFF).

### 4.2. AI-First Layer
- **Thread Summarization:** Intelligent extraction of "The Ask" and "Action Items" from long threads.
- **Draft Generation:** Context-aware reply suggestions based on thread history.
- **Priority Scoring:** Automated "High/Low" priority marking by AI agent.

## 5. Non-Functional Requirements
- **Security:** OAuth 2.1 for Google/Microsoft; secure credential storage for IMAP.
- **Privacy:** AI processing should happen securely via Vercel AI SDK; no local LLM storage of sensitive mail data in cleartext.
- **Reliability:** Robust sync retry logic for unstable mobile connections.

## 6. Scope

### In-Scope (MVP)
- Unified Inbox & Basic Actions.
- Gmail, O365, IMAP support.
- AI Summaries, Drafts, and Priority.
- PWA capabilities & Offline mode.

### Out-of-Scope
- Contacts / Address Book.
- Calendar / Tasks / Notes.
- Multi-user / Team features.

## 7. Technical Methodology
- **Agent OS / Method:** Specs-driven development with Claude Code.
- **Architecture:** Local-first (Dexie.js) with BFF (Backend-for-Frontend).
- **Testing:** Automated E2E and Unit tests.

---

## 8. Implementation Roadmap
1. **Phase 1:** PWA Shell & Local-first storage setup.
2. **Phase 2:** Auth & Provider Sync (Gmail, O365, IMAP).
3. **Phase 3:** AI Integration (Summaries, Drafts, Priority).
4. **Phase 4:** E2E Testing & Vercel Deployment.
