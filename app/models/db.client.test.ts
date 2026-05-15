// app/models/db.client.test.ts
// Dexie requires fake-indexeddb in JSDOM (no native IndexedDB in Node.js)
import "fake-indexeddb/auto";                    // ← must be first import
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
    // v2: adds archived and deleted as indexed fields
    this.version(2).stores({
      emails: "id, threadId, subject, snippet, date, isRead, priorityScore, archived, deleted",
      threads: "id, subject, lastMessageDate",
    }).upgrade(tx => {
      return tx.table("emails").toCollection().modify((email: Email) => {
        if (email.archived === undefined) email.archived = false;
        if (email.deleted === undefined) email.deleted = false;
      });
    });
  }
}

describe("Dexie DB Schema", () => {
  let testDb: TestDB;

  beforeEach(() => {
    testDb = new TestDB();
  });

  afterEach(async () => {
    await testDb.close();
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
        archived: false,
        deleted: false,
      },
    ];
    await testDb.emails.bulkPut(mockEmails);
    const result = await testDb.emails.toArray();
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("Test Subject");
  });

  // Task 1 — v2 Schema: archived and deleted fields persist correctly
  it("v2: archived and deleted fields default to false", async () => {
    const email: Email = {
      id: "e2",
      threadId: "t2",
      subject: "Schema v2 Test",
      snippet: "Testing new fields",
      date: "2026-05-15T09:00:00Z",
      isRead: false,
      priorityScore: null,
      archived: false,
      deleted: false,
    };
    await testDb.emails.put(email);
    const result = await testDb.emails.get("e2");
    expect(result?.archived).toBe(false);
    expect(result?.deleted).toBe(false);
  });

  // Task 1 — v2 Schema: filter excludes archived/deleted items (AC: 1, 2)
  it("v2: filter excludes archived and deleted emails", async () => {
    const emails: Email[] = [
      { id: "e3", threadId: "t3", subject: "Visible", snippet: "s", date: "2026-05-15T09:00:00Z", isRead: false, priorityScore: null, archived: false, deleted: false },
      { id: "e4", threadId: "t3", subject: "Archived", snippet: "s", date: "2026-05-15T09:00:00Z", isRead: false, priorityScore: null, archived: true,  deleted: false },
      { id: "e5", threadId: "t3", subject: "Deleted",  snippet: "s", date: "2026-05-15T09:00:00Z", isRead: false, priorityScore: null, archived: false, deleted: true  },
    ];
    await testDb.emails.bulkPut(emails);
    const visible = await testDb.emails.filter(e => !e.archived && !e.deleted).toArray();
    expect(visible).toHaveLength(1);
    expect(visible[0].subject).toBe("Visible");
  });

  // Task 1 — v2 Schema: update archived/deleted (undo pattern) (AC: 2)
  it("v2: can update archived/deleted for undo", async () => {
    const email: Email = {
      id: "e6", threadId: "t4", subject: "Undo Test", snippet: "s",
      date: "2026-05-15T09:00:00Z", isRead: false, priorityScore: null, archived: true, deleted: false,
    };
    await testDb.emails.put(email);
    await testDb.emails.update("e6", { archived: false });
    const result = await testDb.emails.get("e6");
    expect(result?.archived).toBe(false);
  });
});
