// app/models/db.client.test.ts
// Dexie requires fake-indexeddb in JSDOM (no native IndexedDB in Node.js)
import "fake-indexeddb/auto";                    // ← must be first import
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import type { Email } from "./db.client";

// Re-create a test-isolated DB instance (not the singleton)
class TestDB extends Dexie {
  emails!: Dexie.Table<Email, string>;
  threads!: Dexie.Table<{ id: string; subject: string; lastMessageDate: string }, string>;

  constructor() {
    super("test-jobtalk-" + Date.now()); // unique name per test run
    this.version(1).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore",
      threads: "id, subject, lastMessageDate",
    });
  }
}

describe("Dexie DB Schema", () => {
  let testDb: TestDB;

  beforeEach(() => {
    testDb = new TestDB();
  });

  it("initializes with emails and threads tables", () => {
    expect(testDb.emails).toBeDefined();
    expect(testDb.threads).toBeDefined();
  });

  it("stores and retrieves emails via bulkPut", async () => {
    const mockEmails: Email[] = [
      {
        id: "e1",
        threadId: "t1",
        subject: "Test Subject",
        snippet: "Test snippet",
        date: "2026-05-14T09:00:00Z",
        isRead: false,
        priorityScore: null,
      },
    ];
    await testDb.emails.bulkPut(mockEmails);
    const result = await testDb.emails.toArray();
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("Test Subject");
  });
});
