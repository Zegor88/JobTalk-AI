import { vi, describe, it, expect, afterEach } from "vitest";

// vi.hoisted runs before module imports — sets env vars and creates shared mock fns
const { mockSetCredentials, mockClientFetch, mockOn, mockStoreOAuthCredential } = vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/callback?provider=google";
  return {
    mockSetCredentials: vi.fn(),
    mockClientFetch: vi.fn(),
    mockOn: vi.fn(),
    mockStoreOAuthCredential: vi.fn(),
  };
});

// Use regular function constructor — arrow functions break `new OAuth2Client()`
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(function (this: object) {
    Object.assign(this, {
      setCredentials: mockSetCredentials,
      fetch: mockClientFetch,
      on: mockOn,
    });
  }),
}));

vi.mock("~/services/credential.server", () => ({
  storeOAuthCredential: mockStoreOAuthCredential,
}));

import {
  fetchGmailEmails,
  fetchMicrosoftEmails,
  normalizeGmailMessage,
  normalizeMicrosoftMessage,
  buildThreadsFromEmails,
} from "./bff.server";
import type { GmailMessage, MicrosoftMessage } from "./bff.server";

afterEach(() => {
  vi.clearAllMocks();
});

const googleSession = {
  sessionId: "session-1",
  userId: "user-1",
  email: "user@gmail.com",
  provider: "google" as const,
  accessToken: "access-tok",
  refreshToken: "refresh-tok",
  expiresAt: 1_777_777_777_000,
};

// ── normalizeGmailMessage ────────────────────────────────────────────────────

describe("normalizeGmailMessage", () => {
  const base: GmailMessage = {
    id: "gmail-1",
    threadId: "thread-1",
    snippet: "Hello there",
    labelIds: ["INBOX", "UNREAD"],
    payload: {
      headers: [
        { name: "Subject", value: "Test Subject" },
        { name: "From", value: "sender@gmail.com" },
        { name: "Date", value: "Mon, 12 May 2026 10:00:00 +0000" },
      ],
    },
  };

  it("maps id and threadId", () => {
    const email = normalizeGmailMessage(base);
    expect(email.id).toBe("gmail-1");
    expect(email.threadId).toBe("thread-1");
  });

  it("maps subject from headers", () => {
    expect(normalizeGmailMessage(base).subject).toBe("Test Subject");
  });

  it("maps snippet", () => {
    expect(normalizeGmailMessage(base).snippet).toBe("Hello there");
  });

  it("converts Date header to ISO 8601", () => {
    const email = normalizeGmailMessage(base);
    expect(email.date).toBe(new Date("Mon, 12 May 2026 10:00:00 +0000").toISOString());
  });

  it("isRead=false when UNREAD label present", () => {
    expect(normalizeGmailMessage(base).isRead).toBe(false);
  });

  it("isRead=true when UNREAD label absent", () => {
    const read = { ...base, labelIds: ["INBOX"] };
    expect(normalizeGmailMessage(read).isRead).toBe(true);
  });

  it("priorityScore is always null", () => {
    expect(normalizeGmailMessage(base).priorityScore).toBeNull();
  });

  it("archived and deleted are always false", () => {
    const email = normalizeGmailMessage(base);
    expect(email.archived).toBe(false);
    expect(email.deleted).toBe(false);
  });

  it("falls back to (no subject) when Subject header absent", () => {
    const noSubject: GmailMessage = { ...base, payload: { headers: [] } };
    expect(normalizeGmailMessage(noSubject).subject).toBe("(no subject)");
  });

  it("falls back to internalDate when Date header is malformed", () => {
    const malformedDate: GmailMessage = {
      ...base,
      internalDate: "1778752800000",
      payload: {
        headers: [
          { name: "Subject", value: "Bad Date" },
          { name: "Date", value: "not a real date" },
        ],
      },
    };
    expect(normalizeGmailMessage(malformedDate).date).toBe(
      new Date(1778752800000).toISOString()
    );
  });

  it("throws when required Gmail fields are missing", () => {
    expect(() => normalizeGmailMessage({ ...base, id: "" })).toThrow("Invalid Gmail message");
    expect(() => normalizeGmailMessage({ ...base, threadId: "" })).toThrow("Invalid Gmail message");
  });

  it("header matching is case-insensitive", () => {
    const lower: GmailMessage = {
      ...base,
      payload: { headers: [{ name: "subject", value: "Lower Case Subject" }] },
    };
    expect(normalizeGmailMessage(lower).subject).toBe("Lower Case Subject");
  });
});

// ── normalizeMicrosoftMessage ────────────────────────────────────────────────

describe("normalizeMicrosoftMessage", () => {
  const base: MicrosoftMessage = {
    id: "ms-1",
    conversationId: "conv-1",
    subject: "Meeting tomorrow",
    bodyPreview: "Let's meet at 10am",
    receivedDateTime: "2026-05-12T10:00:00Z",
    isRead: false,
  };

  it("maps id", () => {
    expect(normalizeMicrosoftMessage(base).id).toBe("ms-1");
  });

  it("maps conversationId as threadId", () => {
    expect(normalizeMicrosoftMessage(base).threadId).toBe("conv-1");
  });

  it("maps subject", () => {
    expect(normalizeMicrosoftMessage(base).subject).toBe("Meeting tomorrow");
  });

  it("maps bodyPreview as snippet", () => {
    expect(normalizeMicrosoftMessage(base).snippet).toBe("Let's meet at 10am");
  });

  it("maps receivedDateTime as date (already ISO 8601)", () => {
    expect(normalizeMicrosoftMessage(base).date).toBe("2026-05-12T10:00:00Z");
  });

  it("maps isRead", () => {
    expect(normalizeMicrosoftMessage(base).isRead).toBe(false);
    expect(normalizeMicrosoftMessage({ ...base, isRead: true }).isRead).toBe(true);
  });

  it("priorityScore is always null", () => {
    expect(normalizeMicrosoftMessage(base).priorityScore).toBeNull();
  });

  it("archived and deleted are always false", () => {
    const email = normalizeMicrosoftMessage(base);
    expect(email.archived).toBe(false);
    expect(email.deleted).toBe(false);
  });

  it("falls back to (no subject) when subject is empty string", () => {
    expect(normalizeMicrosoftMessage({ ...base, subject: "" }).subject).toBe("(no subject)");
  });

  it("throws when required Microsoft fields are missing", () => {
    expect(() => normalizeMicrosoftMessage({ ...base, id: "" })).toThrow("Invalid Microsoft message");
    expect(() => normalizeMicrosoftMessage({ ...base, conversationId: "" })).toThrow(
      "Invalid Microsoft message"
    );
    expect(() => normalizeMicrosoftMessage({ ...base, receivedDateTime: "" })).toThrow(
      "Invalid Microsoft message"
    );
  });
});

// ── buildThreadsFromEmails ───────────────────────────────────────────────────

describe("buildThreadsFromEmails", () => {
  it("returns empty array for empty input", () => {
    expect(buildThreadsFromEmails([])).toEqual([]);
  });

  it("creates one thread per unique threadId", () => {
    const emails = [
      { id: "e1", threadId: "t1", subject: "S1", snippet: "", date: "2026-05-10T10:00:00Z", isRead: false, priorityScore: null as null, archived: false, deleted: false },
      { id: "e2", threadId: "t2", subject: "S2", snippet: "", date: "2026-05-11T10:00:00Z", isRead: true, priorityScore: null as null, archived: false, deleted: false },
    ];
    expect(buildThreadsFromEmails(emails)).toHaveLength(2);
  });

  it("thread.lastMessageDate is the latest email date in the thread", () => {
    const emails = [
      { id: "e1", threadId: "t1", subject: "First", snippet: "", date: "2026-05-10T08:00:00Z", isRead: false, priorityScore: null as null, archived: false, deleted: false },
      { id: "e2", threadId: "t1", subject: "Second", snippet: "", date: "2026-05-12T15:00:00Z", isRead: false, priorityScore: null as null, archived: false, deleted: false },
    ];
    const threads = buildThreadsFromEmails(emails);
    expect(threads).toHaveLength(1);
    expect(threads[0].lastMessageDate).toBe("2026-05-12T15:00:00Z");
  });

  it("thread.subject comes from the email with the latest date", () => {
    const emails = [
      { id: "e1", threadId: "t1", subject: "Old Subject", snippet: "", date: "2026-05-09T00:00:00Z", isRead: false, priorityScore: null as null, archived: false, deleted: false },
      { id: "e2", threadId: "t1", subject: "New Subject", snippet: "", date: "2026-05-12T00:00:00Z", isRead: false, priorityScore: null as null, archived: false, deleted: false },
    ];
    const threads = buildThreadsFromEmails(emails);
    expect(threads[0].subject).toBe("New Subject");
  });
});

// ── fetchGmailEmails ─────────────────────────────────────────────────────────

describe("fetchGmailEmails", () => {
  it("calls setCredentials with provided tokens", async () => {
    mockClientFetch.mockResolvedValueOnce({ data: { messages: [] } });
    await fetchGmailEmails(googleSession);
    expect(mockSetCredentials).toHaveBeenCalledWith({
      access_token: "access-tok",
      refresh_token: "refresh-tok",
    });
  });

  it("persists refreshed Google tokens from OAuth2Client token events", async () => {
    mockClientFetch.mockResolvedValueOnce({ data: { messages: [] } });
    mockOn.mockImplementationOnce((_event: string, listener: (tokens: {
      access_token?: string;
      expiry_date?: number;
    }) => void) => {
      listener({ access_token: "fresh-access", expiry_date: 1_778_000_000_000 });
    });

    await fetchGmailEmails(googleSession);

    expect(mockStoreOAuthCredential).toHaveBeenCalledWith("session-1", {
      userId: "user-1",
      email: "user@gmail.com",
      provider: "google",
      accessToken: "fresh-access",
      refreshToken: "refresh-tok",
      expiresAt: 1_778_000_000_000,
    });
  });

  it("returns empty emails and threads when Gmail inbox is empty", async () => {
    mockClientFetch.mockResolvedValueOnce({ data: {} }); // no messages key
    const result = await fetchGmailEmails(googleSession);
    expect(result.emails).toEqual([]);
    expect(result.threads).toEqual([]);
  });

  it("fetches individual message metadata for each listed id", async () => {
    // First call: list response
    mockClientFetch.mockResolvedValueOnce({
      data: { messages: [{ id: "m1", threadId: "t1" }, { id: "m2", threadId: "t1" }] },
    });
    // Second and third calls: message metadata
    const makeMsg = (id: string): GmailMessage => ({
      id,
      threadId: "t1",
      snippet: "snippet",
      labelIds: ["INBOX"],
      payload: {
        headers: [
          { name: "Subject", value: "Job offer" },
          { name: "Date", value: "Mon, 12 May 2026 10:00:00 +0000" },
        ],
      },
    });
    mockClientFetch
      .mockResolvedValueOnce({ data: makeMsg("m1") })
      .mockResolvedValueOnce({ data: makeMsg("m2") });

    const result = await fetchGmailEmails(googleSession);
    // 3 total calls: 1 list + 2 messages
    expect(mockClientFetch).toHaveBeenCalledTimes(3);
    expect(result.emails).toHaveLength(2);
    expect(result.threads).toHaveLength(1);
  });

  it("list URL includes maxResults=20 and inbox query", async () => {
    mockClientFetch.mockResolvedValueOnce({ data: { messages: [] } });
    await fetchGmailEmails(googleSession);
    const [listUrl] = mockClientFetch.mock.calls[0] as [string];
    expect(listUrl).toContain("maxResults=20");
    expect(listUrl).toContain("in%3Ainbox");
  });

  it("message URL includes format=metadata and header params", async () => {
    mockClientFetch
      .mockResolvedValueOnce({ data: { messages: [{ id: "m1", threadId: "t1" }] } })
      .mockResolvedValueOnce({
        data: { id: "m1", threadId: "t1", snippet: "s", labelIds: [], payload: { headers: [{ name: "Date", value: "Mon, 12 May 2026 10:00:00 +0000" }] } },
      });
    await fetchGmailEmails(googleSession);
    const [msgUrl] = mockClientFetch.mock.calls[1] as [string];
    expect(msgUrl).toContain("format=metadata");
    expect(msgUrl).toContain("metadataHeaders=Subject");
  });

  it("throws when client.fetch rejects", async () => {
    mockClientFetch.mockRejectedValueOnce(new Error("Gmail API down"));
    await expect(fetchGmailEmails(googleSession)).rejects.toThrow("Gmail API down");
  });

  it("skips Gmail messages missing required provider fields", async () => {
    mockClientFetch
      .mockResolvedValueOnce({ data: { messages: [{ id: "m1", threadId: "t1" }] } })
      .mockResolvedValueOnce({
        data: { id: "", threadId: "t1", snippet: "s", labelIds: [] },
      });

    const result = await fetchGmailEmails(googleSession);

    expect(result.emails).toEqual([]);
    expect(result.threads).toEqual([]);
  });
});

// ── fetchMicrosoftEmails ─────────────────────────────────────────────────────

describe("fetchMicrosoftEmails", () => {
  it("calls Graph API with Bearer token", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    } as Response);

    await fetchMicrosoftEmails("ms-access-tok");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer ms-access-tok"
    );
  });

  it("returns empty emails and threads when inbox is empty", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    } as Response);

    const result = await fetchMicrosoftEmails("tok");
    expect(result.emails).toEqual([]);
    expect(result.threads).toEqual([]);
  });

  it("normalizes messages and builds threads", async () => {
    const raw: MicrosoftMessage[] = [
      { id: "ms-1", conversationId: "c1", subject: "Hello", bodyPreview: "...", receivedDateTime: "2026-05-12T10:00:00Z", isRead: false },
      { id: "ms-2", conversationId: "c1", subject: "Re: Hello", bodyPreview: "...", receivedDateTime: "2026-05-13T10:00:00Z", isRead: false },
    ];
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: raw }),
    } as Response);

    const result = await fetchMicrosoftEmails("tok");
    expect(result.emails).toHaveLength(2);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].id).toBe("c1");
  });

  it("Graph URL targets inbox messages endpoint with $top=20", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    } as Response);

    await fetchMicrosoftEmails("tok");

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("graph.microsoft.com");
    expect(url).toContain("/me/mailFolders/inbox/messages");
    expect(url).toContain("$top=20");
  });

  it("throws when Graph API returns non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    await expect(fetchMicrosoftEmails("expired-tok")).rejects.toThrow("Graph API failed: 401");
  });

  it("handles missing value array in Graph response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await fetchMicrosoftEmails("tok");
    expect(result.emails).toEqual([]);
  });

  it("skips Microsoft messages missing required provider fields", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: [
          { id: "", conversationId: "c1", subject: "Bad", bodyPreview: "", receivedDateTime: "2026-05-12T10:00:00Z", isRead: false },
          { id: "ok", conversationId: "c1", subject: "Good", bodyPreview: "", receivedDateTime: "2026-05-12T10:00:00Z", isRead: false },
        ],
      }),
    } as Response);

    const result = await fetchMicrosoftEmails("tok");

    expect(result.emails).toHaveLength(1);
    expect(result.emails[0].id).toBe("ok");
  });
});
