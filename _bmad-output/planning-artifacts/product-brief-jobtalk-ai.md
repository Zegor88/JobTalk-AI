# Product Brief: JobTalk AI

## Executive Summary

JobTalk AI is a mobile-ready, universal email PWA designed for the "AI-first" era. In a landscape fragmented by multiple providers (Gmail, Outlook, Yahoo) and overwhelmed by volume, JobTalk AI provides a single, high-performance interface that doesn't just display emails but actively manages them. 

By combining a **Local-First** architecture for sub-second responsiveness with agentic AI for triage and drafting, JobTalk AI transforms the inbox from a source of stress into a prioritized action list. It targets the "IMAP Gap" left by premium competitors like Superhuman and Shortwave, offering a truly universal solution for power users who demand speed, intelligence, and accessibility across all their accounts.

## The Problem

Email has become a chore of "digital janitorial work." Users face two primary burdens:
1. **Fragmentation:** Managing multiple accounts (work, personal, legacy) across different apps or tab-heavy web interfaces.
2. **Cognitive Load:** The mental energy required to scan, summarize, and prioritize hundreds of incoming messages daily.

Existing "AI-native" clients often fall short: they are either locked into a single ecosystem (e.g., Gmail only), prohibitively expensive, or introduce "AI noise" by turning simple interactions into unnecessarily long prose.

## The Solution

JobTalk AI is a streamlined, mobile-first PWA that serves as a unified command center for communication.
- **Unified Command:** One inbox for Gmail, Office 365, and IMAP (Yahoo, AOL).
- **AI Triage:** Automatic summarization of threads and intelligent prioritization scoring.
- **Assisted Composition:** Context-aware draft generation and quick-reply suggestions.
- **Zero Friction:** A local-first experience that works offline and feels as snappy as a native mobile app.

## What Makes This Different

- **Truly Universal:** While competitors lock users into Gmail or Outlook, JobTalk AI treats IMAP as a first-class citizen, ensuring no account is left behind.
- **Local-First Performance:** By using Dexie.js and IndexedDB, we eliminate "loading spinners." The app is ready the moment the user opens it.
- **PWA Accessibility:** No App Store friction. One URL, instant installation, and cross-platform consistency.
- **Pragmatic AI:** We focus on *reducing* reading time through summaries rather than just increasing writing volume.

## Who This Serves

The **Solo Power User**—freelancers, managers, and consultants who manage 3+ email accounts and value their time above all else. They need a tool that handles the "grunt work" of triage so they can focus on high-value communication.

## Success Criteria

For this MVP/Test Task, success is defined by:
- **Functional Unity:** Successful auth and mail sync from Gmail, O365, and IMAP.
- **Performance:** Sub-second "Time to Interactive" on mobile connections.
- **AI Utility:** Summaries that accurately capture the "ask" in an email thread.
- **Reliability:** 100% pass rate on automated E2E tests for core flows (compose, reply, archive).

## Scope (MVP)

**In Scope:**
- Unified Inbox & Account Switching.
- Core Email: Compose, Reply, Forward, Search, Labels, Archive, Delete.
- AI Features: Thread Summaries, Reply Drafts, Priority Scoring.
- Technical: PWA capabilities, Vercel deployment, Local-first sync.

**Out of Scope:**
- Contacts/Address book management.
- Tasks, Notes, and Calendar integration.
- Advanced folder management (labels only).
- Multi-user/Team collaboration features.

## Vision

JobTalk AI aims to become the "Agent OS" for personal communications. Future iterations will move from assisted drafting to fully autonomous "Inbox Autopilot," where the AI handles low-stakes scheduling and information requests entirely on the user's behalf, reporting only on the outcomes.
