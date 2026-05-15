// app/models/db.client.ts
// ⚠️ GUARD: This file is imported by client code only.
// The `if (typeof window !== "undefined")` pattern prevents SSR crash.
import Dexie, { type EntityTable } from "dexie";

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  date: string;          // ISO 8601
  isRead: boolean;
  priorityScore: "high" | "low" | null;
  archived: boolean;     // ← NEW in v2
  deleted: boolean;      // ← NEW in v2
}

export interface Thread {
  id: string;
  subject: string;
  lastMessageDate: string;  // ISO 8601 string
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
      // Migrate existing rows — set safe defaults
      return tx.table("emails").toCollection().modify((email: Email) => {
        if (email.archived === undefined) email.archived = false;
        if (email.deleted === undefined) email.deleted = false;
      });
    });
  }
}

// Singleton guard — prevents "Cannot use Dexie during SSR" error
let db: JobTalkDB;

if (typeof window !== "undefined") {
  db = new JobTalkDB();
}

export { db };
