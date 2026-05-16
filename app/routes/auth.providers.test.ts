import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOAuth = vi.hoisted(() => ({
  createOAuthSecurityParams: vi.fn().mockReturnValue({
    state: "state-123",
    codeVerifier: "verifier-123",
    codeChallenge: "challenge-123",
  }),
  createGoogleAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/auth"),
  createMicrosoftAuthUrl: vi.fn().mockReturnValue("https://login.microsoftonline.com/auth"),
}));

const mockSession = vi.hoisted(() => {
  const sessionObj = { get: vi.fn(), set: vi.fn() };
  return {
    sessionObj,
    getSession: vi.fn().mockResolvedValue(sessionObj),
    commitSession: vi.fn().mockResolvedValue("__jobtalk_session=state; HttpOnly"),
  };
});

vi.mock("~/services/oauth.server", () => mockOAuth);
vi.mock("~/services/session.server", () => mockSession);

import { loader as googleLoader } from "./auth.google";
import { loader as microsoftLoader } from "./auth.microsoft";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/callback?provider=google";
  process.env.MICROSOFT_CLIENT_ID = "ms-client";
  process.env.MICROSOFT_CLIENT_SECRET = "ms-secret";
  process.env.MICROSOFT_REDIRECT_URI = "http://localhost:3000/auth/callback?provider=microsoft";
});

describe("OAuth initiation routes", () => {
  it("Google redirects to config error when redirect URI is missing", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    delete process.env.GOOGLE_REDIRECT_URI;

    const res = await googleLoader({ request: new Request("http://localhost/auth/google") }) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=config");
  });

  it("Google stores state and code verifier before redirecting", async () => {
    const res = await googleLoader({ request: new Request("http://localhost/auth/google") }) as Response;

    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("oauthState", "state-123");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("oauthProvider", "google");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("codeVerifier", "verifier-123");
    expect(mockOAuth.createGoogleAuthUrl).toHaveBeenCalledWith({
      state: "state-123",
      codeVerifier: "verifier-123",
      codeChallenge: "challenge-123",
    });
    expect(res.headers.get("Set-Cookie")).toContain("__jobtalk_session=state");
    expect(res.headers.get("Location")).toBe("https://accounts.google.com/auth");
  });

  it("Microsoft redirects to config error when redirect URI is missing", async () => {
    process.env.MICROSOFT_CLIENT_ID = "ms-client";
    process.env.MICROSOFT_CLIENT_SECRET = "ms-secret";
    delete process.env.MICROSOFT_REDIRECT_URI;

    const res = await microsoftLoader({
      request: new Request("http://localhost/auth/microsoft"),
    }) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login?error=config");
  });

  it("Microsoft stores state and code verifier before redirecting", async () => {
    const res = await microsoftLoader({
      request: new Request("http://localhost/auth/microsoft"),
    }) as Response;

    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("oauthState", "state-123");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("oauthProvider", "microsoft");
    expect(mockSession.sessionObj.set).toHaveBeenCalledWith("codeVerifier", "verifier-123");
    expect(mockOAuth.createMicrosoftAuthUrl).toHaveBeenCalledWith({
      state: "state-123",
      codeVerifier: "verifier-123",
      codeChallenge: "challenge-123",
    });
    expect(res.headers.get("Set-Cookie")).toContain("__jobtalk_session=state");
    expect(res.headers.get("Location")).toBe("https://login.microsoftonline.com/auth");
  });
});
