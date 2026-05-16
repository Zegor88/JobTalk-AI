import { vi, describe, it, expect, afterEach } from "vitest";

vi.mock("~/services/session.server", () => ({
  requireSession: vi.fn(),
}));

vi.mock("~/services/bff.server", () => ({
  fetchGmailEmails: vi.fn(),
  fetchMicrosoftEmails: vi.fn(),
}));

import { loader } from "./api.sync";
import { requireSession } from "~/services/session.server";
import { fetchGmailEmails, fetchMicrosoftEmails } from "~/services/bff.server";
import type { Mock } from "vitest";

const makeRequest = () => new Request("http://localhost/api/sync");

const googleSession = {
  sessionId: "sid-1",
  userId: "user-1",
  email: "user@gmail.com",
  provider: "google" as const,
  accessToken: "goog-access",
  refreshToken: "goog-refresh",
  expiresAt: Date.now() + 3600_000,
};

const microsoftSession = {
  ...googleSession,
  provider: "microsoft" as const,
  email: "user@outlook.com",
  accessToken: "ms-access",
};

const mockPayload = {
  emails: [
    {
      id: "e1",
      threadId: "t1",
      subject: "Test",
      snippet: "...",
      date: "2026-05-12T10:00:00Z",
      isRead: false,
      priorityScore: null,
      archived: false,
      deleted: false,
    },
  ],
  threads: [
    { id: "t1", subject: "Test", lastMessageDate: "2026-05-12T10:00:00Z" },
  ],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/sync — authentication", () => {
  it("calls requireSession with the request", async () => {
    (requireSession as Mock).mockResolvedValueOnce(googleSession);
    (fetchGmailEmails as Mock).mockResolvedValueOnce(mockPayload);

    const req = makeRequest();
    await loader({ request: req } as Parameters<typeof loader>[0]);

    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it("propagates redirect when session is invalid (unauthenticated)", async () => {
    const redirect = new Response(null, { status: 302, headers: { Location: "/login" } });
    (requireSession as Mock).mockImplementationOnce(() => { throw redirect; });

    await expect(
      loader({ request: makeRequest() } as Parameters<typeof loader>[0])
    ).rejects.toBe(redirect);
  });
});

describe("GET /api/sync — Google provider", () => {
  it("returns 200 with { emails, threads } JSON for Google", async () => {
    (requireSession as Mock).mockResolvedValueOnce(googleSession);
    (fetchGmailEmails as Mock).mockResolvedValueOnce(mockPayload);

    const res = await loader({ request: makeRequest() } as Parameters<typeof loader>[0]);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const body = await res.json() as typeof mockPayload;
    expect(body.emails).toHaveLength(1);
    expect(body.threads).toHaveLength(1);
  });

  it("calls fetchGmailEmails with the authenticated Google session", async () => {
    (requireSession as Mock).mockResolvedValueOnce(googleSession);
    (fetchGmailEmails as Mock).mockResolvedValueOnce(mockPayload);

    await loader({ request: makeRequest() } as Parameters<typeof loader>[0]);

    expect(fetchGmailEmails).toHaveBeenCalledWith(googleSession);
    expect(fetchMicrosoftEmails).not.toHaveBeenCalled();
  });
});

describe("GET /api/sync — Microsoft provider", () => {
  it("returns 200 with { emails, threads } JSON for Microsoft", async () => {
    (requireSession as Mock).mockResolvedValueOnce(microsoftSession);
    (fetchMicrosoftEmails as Mock).mockResolvedValueOnce(mockPayload);

    const res = await loader({ request: makeRequest() } as Parameters<typeof loader>[0]);

    expect(res.status).toBe(200);
    const body = await res.json() as typeof mockPayload;
    expect(body.emails).toHaveLength(1);
  });

  it("calls fetchMicrosoftEmails with accessToken only", async () => {
    (requireSession as Mock).mockResolvedValueOnce(microsoftSession);
    (fetchMicrosoftEmails as Mock).mockResolvedValueOnce(mockPayload);

    await loader({ request: makeRequest() } as Parameters<typeof loader>[0]);

    expect(fetchMicrosoftEmails).toHaveBeenCalledWith("ms-access");
    expect(fetchGmailEmails).not.toHaveBeenCalled();
  });
});

describe("GET /api/sync — error handling", () => {
  it("returns 502 with { error: 'sync_failed' } when fetchGmailEmails throws", async () => {
    (requireSession as Mock).mockResolvedValueOnce(googleSession);
    (fetchGmailEmails as Mock).mockRejectedValueOnce(new Error("Gmail down"));

    const res = await loader({ request: makeRequest() } as Parameters<typeof loader>[0]);

    expect(res.status).toBe(502);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("sync_failed");
  });

  it("returns 502 with { error: 'sync_failed' } when fetchMicrosoftEmails throws", async () => {
    (requireSession as Mock).mockResolvedValueOnce(microsoftSession);
    (fetchMicrosoftEmails as Mock).mockRejectedValueOnce(new Error("Graph 401"));

    const res = await loader({ request: makeRequest() } as Parameters<typeof loader>[0]);

    expect(res.status).toBe(502);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("sync_failed");
  });

  it("response Content-Type is application/json on 502", async () => {
    (requireSession as Mock).mockResolvedValueOnce(googleSession);
    (fetchGmailEmails as Mock).mockRejectedValueOnce(new Error("fail"));

    const res = await loader({ request: makeRequest() } as Parameters<typeof loader>[0]);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
