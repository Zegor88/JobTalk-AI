import { vi, describe, it, expect, afterEach } from "vitest";

const mockOAuth = vi.hoisted(() => ({
  exchangeGoogleCode: vi.fn(),
  exchangeMicrosoftCode: vi.fn(),
}));

const mockSession = vi.hoisted(() => {
  const sessionObj = {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        oauthState: "valid-state",
        oauthProvider: "google",
        codeVerifier: "verifier-123",
      };
      return values[key];
    }),
    set: vi.fn(),
    unset: vi.fn(),
  };
  return {
    sessionObj,
    getSession: vi.fn().mockResolvedValue(sessionObj),
    commitSession: vi.fn().mockResolvedValue("__jobtalk_session=abc; HttpOnly"),
    destroySession: vi.fn(),
  };
});

const mockCredential = vi.hoisted(() => ({
  createSessionId: vi.fn().mockReturnValue("session-123"),
  storeOAuthCredential: vi.fn(),
}));

vi.mock("~/services/oauth.server", () => mockOAuth);
vi.mock("~/services/session.server", () => mockSession);
vi.mock("~/services/credential.server", () => mockCredential);

import { loader } from "./auth.callback";

afterEach(() => {
  vi.clearAllMocks();
    mockSession.sessionObj.set.mockClear();
    mockSession.sessionObj.unset.mockClear();
    mockSession.sessionObj.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        oauthState: "valid-state",
        oauthProvider: "google",
        codeVerifier: "verifier-123",
      };
      return values[key];
    });
  });

function makeRequest(search: string): Request {
  return new Request(`http://localhost/auth/callback${search}`);
}

describe("GET /auth/callback", () => {
  it("redirects to /login?error=missing_params when code is absent", async () => {
    const res = await loader({ request: makeRequest("?provider=google&state=valid-state") }) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=missing_params");
  });

  it("redirects to /login?error=missing_params when provider is absent", async () => {
    const res = await loader({ request: makeRequest("?code=abc123&state=valid-state") }) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=missing_params");
  });

  it("redirects to /login?error=missing_params when both are absent", async () => {
    const res = await loader({ request: makeRequest("") }) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=missing_params");
  });

  it("Google success: sets session fields and redirects to /", async () => {
    mockOAuth.exchangeGoogleCode.mockResolvedValueOnce({
      accessToken: "google-access",
      refreshToken: "google-refresh",
      email: "user@gmail.com",
      provider: "google",
      expiresAt: 9999999999999,
    });

    const res = await loader({
      request: makeRequest("?code=google-code&provider=google&state=valid-state"),
    }) as Response;

    expect(mockOAuth.exchangeGoogleCode).toHaveBeenCalledWith("google-code", "verifier-123");
    expect(mockCredential.storeOAuthCredential).toHaveBeenCalledWith("session-123", {
      userId: "user@gmail.com",
      email: "user@gmail.com",
      provider: "google",
      accessToken: "google-access",
      refreshToken: "google-refresh",
      expiresAt: 9999999999999,
    });
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("sessionId", "session-123");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("userId", "user@gmail.com");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("email", "user@gmail.com");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("provider", "google");
    expect(mockSession.sessionObj.set).not.toHaveBeenCalledWith("accessToken", expect.anything());
    expect(mockSession.sessionObj.set).not.toHaveBeenCalledWith("refreshToken", expect.anything());
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
    expect(res.headers.get("Set-Cookie")).toContain("__jobtalk_session=abc");
  });

  it("Microsoft success: sets session fields and redirects to /", async () => {
    mockSession.sessionObj.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        oauthState: "valid-state",
        oauthProvider: "microsoft",
        codeVerifier: "verifier-123",
      };
      return values[key];
    });
    mockOAuth.exchangeMicrosoftCode.mockResolvedValueOnce({
      accessToken: "ms-access",
      refreshToken: "ms-refresh",
      email: "user@outlook.com",
      provider: "microsoft",
      expiresAt: 9999999999999,
    });

    const res = await loader({
      request: makeRequest("?code=ms-code&provider=microsoft&state=valid-state"),
    }) as Response;

    expect(mockOAuth.exchangeMicrosoftCode).toHaveBeenCalledWith("ms-code", "verifier-123");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("email", "user@outlook.com");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("provider", "microsoft");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
  });

  it("redirects to /login?error=auth_failed when Google exchange throws", async () => {
    mockOAuth.exchangeGoogleCode.mockRejectedValueOnce(new Error("Token exchange failed"));

    const res = await loader({
      request: makeRequest("?code=bad-code&provider=google&state=valid-state"),
    }) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=auth_failed");
  });

  it("redirects to /login?error=auth_failed when Microsoft exchange throws", async () => {
    mockSession.sessionObj.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        oauthState: "valid-state",
        oauthProvider: "microsoft",
        codeVerifier: "verifier-123",
      };
      return values[key];
    });
    mockOAuth.exchangeMicrosoftCode.mockRejectedValueOnce(new Error("MS error"));

    const res = await loader({
      request: makeRequest("?code=bad-code&provider=microsoft&state=valid-state"),
    }) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=auth_failed");
  });

  it("redirects to invalid_provider for unsupported provider values", async () => {
    const res = await loader({
      request: makeRequest("?code=abc&provider=github&state=valid-state"),
    }) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=invalid_provider");
    expect(mockOAuth.exchangeMicrosoftCode).not.toHaveBeenCalled();
  });

  it("redirects to invalid_state when returned state does not match session state", async () => {
    const res = await loader({
      request: makeRequest("?code=abc&provider=google&state=wrong-state"),
    }) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=invalid_state");
    expect(mockOAuth.exchangeGoogleCode).not.toHaveBeenCalled();
  });
});
