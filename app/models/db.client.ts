// app/models/db.client.ts
// ⚠️ GUARD: This file is imported by client code only.
// The `if (typeof window !== "undefined")` pattern prevents SSR crash.
import Dexie, { type EntityTable } from "dexie";

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  date: string;        // ISO 8601 string
  isRead: boolean;
  priorityScore: "high" | "low" | null;
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
  }
}

// Singleton guard — prevents "Cannot use Dexie during SSR" error
let db: JobTalkDB;

if (typeof window !== "undefined") {
  db = new JobTalkDB();
}

export { db };
