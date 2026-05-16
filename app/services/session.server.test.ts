import { vi, describe, it, expect, afterEach } from "vitest";

// Use vi.hoisted to set SESSION_SECRET before module-level createCookieSessionStorage runs
const mockSessionStore = vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-session-secret-for-tests-32chars!";
  process.env.NODE_ENV = "test";

  const store: Record<string, unknown> = {};
  const mockGetSession = vi.fn();
  const mockCommitSession = vi.fn().mockResolvedValue("__jobtalk_session=valid; HttpOnly; Path=/");
  const mockDestroySession = vi.fn().mockResolvedValue("__jobtalk_session=; Max-Age=0; Path=/");

  return { store, mockGetSession, mockCommitSession, mockDestroySession };
});

const mockCredential = vi.hoisted(() => ({
  getOAuthCredential: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    createCookieSessionStorage: () => ({
      getSession: mockSessionStore.mockGetSession,
      commitSession: mockSessionStore.mockCommitSession,
      destroySession: mockSessionStore.mockDestroySession,
    }),
  };
});

vi.mock("./credential.server", () => mockCredential);

import { requireSession, getSession, commitSession, destroySession } from "./session.server";

afterEach(() => {
  vi.clearAllMocks();
});

describe("requireSession", () => {
  it("throws a redirect to /login when session has no userId", async () => {
    mockSessionStore.mockGetSession.mockResolvedValueOnce({
      get: (_key: string) => undefined,
      set: vi.fn(),
    });

    let thrown: unknown;
    try {
      await requireSession(new Request("http://localhost/"));
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Response);
    const response = thrown as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  it("returns SessionData when session contains userId", async () => {
    const sessionData = {
      sessionId: "session-123",
      userId: "user@gmail.com",
      email: "user@gmail.com",
      provider: "google" as const,
      expiresAt: 9999999999999,
    };
    mockCredential.getOAuthCredential.mockReturnValueOnce({
      ...sessionData,
      accessToken: "access-token-abc",
      refreshToken: "refresh-token-xyz",
    });

    mockSessionStore.mockGetSession.mockResolvedValueOnce({
      get: (key: string) => sessionData[key as keyof typeof sessionData],
      set: vi.fn(),
    });

    const result = await requireSession(
      new Request("http://localhost/", {
        headers: { Cookie: "__jobtalk_session=valid" },
      })
    );

    expect(result.userId).toBe("user@gmail.com");
    expect(result.sessionId).toBe("session-123");
    expect(result.email).toBe("user@gmail.com");
    expect(result.provider).toBe("google");
    expect(result.accessToken).toBe("access-token-abc");
    expect(result.refreshToken).toBe("refresh-token-xyz");
    expect(result.expiresAt).toBe(9999999999999);
  });

  it("throws a redirect when the server-side credential is missing", async () => {
    const sessionData = {
      sessionId: "session-123",
      userId: "user@gmail.com",
      email: "user@gmail.com",
      provider: "google" as const,
      expiresAt: 9999999999999,
    };
    mockCredential.getOAuthCredential.mockReturnValueOnce(null);
    mockSessionStore.mockGetSession.mockResolvedValueOnce({
      get: (key: string) => sessionData[key as keyof typeof sessionData],
      set: vi.fn(),
    });

    let thrown: unknown;
    try {
      await requireSession(new Request("http://localhost/"));
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe("/login");
  });
});

describe("getSession / commitSession / destroySession exports", () => {
  it("getSession is exported and callable", async () => {
    mockSessionStore.mockGetSession.mockResolvedValueOnce({ get: vi.fn(), set: vi.fn() });
    const session = await getSession(null);
    expect(session).toBeDefined();
    expect(mockSessionStore.mockGetSession).toHaveBeenCalledWith(null);
  });

  it("commitSession is exported and callable", async () => {
    const cookie = await commitSession({ get: vi.fn(), set: vi.fn() } as any);
    expect(typeof cookie).toBe("string");
  });

  it("destroySession is exported and callable", async () => {
    const cookie = await destroySession({ get: vi.fn(), set: vi.fn() } as any);
    expect(typeof cookie).toBe("string");
  });
});
