// app/services/mock.server.ts
// ⚠️ .server.ts suffix — React Router tree-shakes this from client bundle
import type { Email, Thread } from "~/models/db.client";

export function generateMockEmails(): Email[] {
  return [
    { id: "e1",  threadId: "t1", subject: "Re: Your application to Acme Corp",             snippet: "Thanks for applying! We'd love to schedule...",     date: "2026-05-14T09:00:00Z", isRead: false, priorityScore: "high", archived: false, deleted: false },
    { id: "e2",  threadId: "t1", subject: "Re: Your application to Acme Corp",             snippet: "Follow-up: Have you received our message?",          date: "2026-05-14T11:00:00Z", isRead: false, priorityScore: "high", archived: false, deleted: false },
    { id: "e3",  threadId: "t2", subject: "LinkedIn: You have 3 new connection requests",  snippet: "Alice, Bob, and 1 other want to connect.",            date: "2026-05-13T08:00:00Z", isRead: true,  priorityScore: null,   archived: false, deleted: false },
    { id: "e4",  threadId: "t3", subject: "Interview Confirmation — Startup XYZ",          snippet: "Your interview is confirmed for May 20th.",           date: "2026-05-12T14:00:00Z", isRead: false, priorityScore: "high", archived: false, deleted: false },
    { id: "e5",  threadId: "t4", subject: "Offer Letter — TechCorp Inc.",                  snippet: "We are pleased to extend an offer of employment...",  date: "2026-05-11T10:00:00Z", isRead: false, priorityScore: "high", archived: false, deleted: false },
    { id: "e6",  threadId: "t5", subject: "Your GitHub job alert: 3 new positions",        snippet: "Senior Frontend Engineer, Remote, $180k-$220k",       date: "2026-05-10T07:00:00Z", isRead: true,  priorityScore: null,   archived: false, deleted: false },
    { id: "e7",  threadId: "t4", subject: "Offer Letter — TechCorp Inc.",                  snippet: "Please sign and return the offer letter by Friday.",   date: "2026-05-11T15:30:00Z", isRead: false, priorityScore: "high", archived: false, deleted: false },
    { id: "e8",  threadId: "t6", subject: "Recruiter message from Talent Agency",          snippet: "Hi, I came across your profile and think you'd be...", date: "2026-05-09T09:00:00Z", isRead: true,  priorityScore: "low",  archived: false, deleted: false },
    { id: "e9",  threadId: "t7", subject: "Take-home assignment — Backend Role",           snippet: "Please complete the attached assignment within 48h.",  date: "2026-05-08T11:00:00Z", isRead: false, priorityScore: "high", archived: false, deleted: false },
    { id: "e10", threadId: "t7", subject: "Take-home assignment — Backend Role",           snippet: "Reminder: submission deadline is tomorrow!",           date: "2026-05-09T16:00:00Z", isRead: false, priorityScore: "high", archived: false, deleted: false },
  ];
}

export function generateMockThreads(): Thread[] {
  return [
    { id: "t1", subject: "Re: Your application to Acme Corp",            lastMessageDate: "2026-05-14T11:00:00Z" },
    { id: "t2", subject: "LinkedIn: You have 3 new connection requests",  lastMessageDate: "2026-05-13T08:00:00Z" },
    { id: "t3", subject: "Interview Confirmation — Startup XYZ",          lastMessageDate: "2026-05-12T14:00:00Z" },
    { id: "t4", subject: "Offer Letter — TechCorp Inc.",                  lastMessageDate: "2026-05-11T15:30:00Z" },
    { id: "t5", subject: "Your GitHub job alert: 3 new positions",        lastMessageDate: "2026-05-10T07:00:00Z" },
    { id: "t6", subject: "Recruiter message from Talent Agency",          lastMessageDate: "2026-05-09T09:00:00Z" },
    { id: "t7", subject: "Take-home assignment — Backend Role",           lastMessageDate: "2026-05-09T16:00:00Z" },
  ];
}
