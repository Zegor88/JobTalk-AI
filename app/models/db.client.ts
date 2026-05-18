// app/models/db.client.ts
// ⚠️ GUARD: This file is imported by client code only.
// The `if (typeof window !== "undefined")` pattern prevents SSR crash.
import Dexie, { type EntityTable } from "dexie";

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;     // ← NEW in v5: sanitized HTML for rich rendering
  from?: string;
  date: string;          // ISO 8601
  isRead: boolean;
  priorityScore: "high" | "low" | null;
  archived: boolean;
  deleted: boolean;
  starred: boolean;
}

export interface Thread {
  id: string;
  subject: string;
  lastMessageDate: string;  // ISO 8601 string
  suggestedReplies?: string[];
}

class JobTalkDB extends Dexie {
  emails!: EntityTable<Email, "id">;
  threads!: EntityTable<Thread, "id">;

  constructor() {
    super("jobtalk-ai");
    this.version(1).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore",
      threads: "id, subject, lastMessageDate",
    });
    // v2: adds archived and deleted fields as indexed columns
    this.version(2).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore, archived, deleted",
      threads: "id, subject, lastMessageDate",
    }).upgrade(tx => {
      return tx.table("emails").toCollection().modify((email: Email) => {
        if (email.archived === undefined) email.archived = false;
        if (email.deleted === undefined) email.deleted = false;
      });
    });
    // v3: adds starred field
    this.version(3).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore, archived, deleted, starred",
      threads: "id, subject, lastMessageDate",
    }).upgrade(tx => {
      return tx.table("emails").toCollection().modify((email: Email) => {
        if (email.starred === undefined) email.starred = false;
      });
    });
    // v4: adds from field (sender display name/email)
    this.version(4).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore, archived, deleted, starred",
      threads: "id, subject, lastMessageDate",
    }).upgrade(tx => {
      return tx.table("emails").toCollection().modify((email: Email) => {
        if (email.from === undefined) email.from = "";
      });
    });
    // v5: adds bodyHtml (sanitized HTML body) — existing rows keep it undefined and fall back to plain text.
    this.version(5).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore, archived, deleted, starred",
      threads: "id, subject, lastMessageDate",
    });
  }
}

// Singleton guard — prevents "Cannot use Dexie during SSR" error
let db: JobTalkDB;

if (typeof window !== "undefined") {
  db = new JobTalkDB();
}

export { db };
