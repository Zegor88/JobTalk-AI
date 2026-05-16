import { vi, describe, it, expect, afterEach } from "vitest";

const { mockGenerateAuthUrl, mockGetToken, mockGetTokenInfo } = vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/callback?provider=google";
  process.env.MICROSOFT_CLIENT_ID = "test-ms-client-id";
  process.env.MICROSOFT_CLIENT_SECRET = "test-ms-client-secret";
  process.env.MICROSOFT_REDIRECT_URI = "http://localhost:3000/auth/callback?provider=microsoft";
  return {
    mockGenerateAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/mock-auth"),
    mockGetToken: vi.fn(),
    mockGetTokenInfo: vi.fn(),
  };
});

vi.mock("google-auth-library", () => ({
  CodeChallengeMethod: { S256: "S256" },
  // Use a regular function (not arrow) so it's usable as a constructor with `new`
  OAuth2Client: vi.fn(function (this: object) {
    Object.assign(this, {
      generateAuthUrl: mockGenerateAuthUrl,
      getToken: mockGetToken,
      getTokenInfo: mockGetTokenInfo,
    });
  }),
}));

import {
  createGoogleAuthUrl,
  createMicrosoftAuthUrl,
  exchangeGoogleCode,
  exchangeMicrosoftCode,
} from "./oauth.server";

afterEach(() => {
  vi.clearAllMocks();
});

describe("createGoogleAuthUrl", () => {
  it("calls generateAuthUrl with access_type=offline", () => {
    createGoogleAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ access_type: "offline" })
    );
  });

  it("calls generateAuthUrl with prompt=consent", () => {
    createGoogleAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "consent" })
    );
  });

  it("calls generateAuthUrl with state and PKCE challenge", () => {
    createGoogleAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "state-123",
        code_challenge: "challenge-123",
        code_challenge_method: "S256",
      })
    );
  });

  it("includes gmail.readonly scope", () => {
    createGoogleAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    const [callArgs] = mockGenerateAuthUrl.mock.calls;
    const { scope } = callArgs[0] as { scope: string[] };
    expect(scope).toContain("https://www.googleapis.com/auth/gmail.readonly");
  });

  it("includes userinfo.email scope", () => {
    createGoogleAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    const [callArgs] = mockGenerateAuthUrl.mock.calls;
    const { scope } = callArgs[0] as { scope: string[] };
    expect(scope).toContain("https://www.googleapis.com/auth/userinfo.email");
  });
});

describe("createMicrosoftAuthUrl", () => {
  it("includes offline_access scope", () => {
    const url = createMicrosoftAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    expect(url).toContain("offline_access");
  });

  it("includes Mail.Read scope", () => {
    const url = createMicrosoftAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    expect(url).toContain("Mail.Read");
  });

  it("includes profile scope for OIDC userinfo email lookup", () => {
    const url = createMicrosoftAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    expect(url).toContain("profile");
  });

  it("targets the Microsoft OAuth authorize endpoint", () => {
    const url = createMicrosoftAuthUrl({ state: "state-123", codeChallenge: "challenge-123" });
    expect(url).toContain("login.microsoftonline.com");
    expect(url).toContain("oauth2/v2.0/authorize");
  });

  it("includes state and PKCE challenge", () => {
    const url = new URL(createMicrosoftAuthUrl({
      state: "state-123",
      codeChallenge: "challenge-123",
    }));
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-123");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });
});

describe("exchangeGoogleCode", () => {
  it("returns OAuthTokens on success", async () => {
    mockGetToken.mockResolvedValueOnce({
      tokens: {
        access_token: "access-123",
        refresh_token: "refresh-456",
        expiry_date: 9999999999999,
      },
    });
    mockGetTokenInfo.mockResolvedValueOnce({ email: "user@gmail.com" });

    const result = await exchangeGoogleCode("auth-code-abc", "verifier-123");

    expect(mockGetToken).toHaveBeenCalledWith({
      code: "auth-code-abc",
      codeVerifier: "verifier-123",
    });
    expect(result.accessToken).toBe("access-123");
    expect(result.refreshToken).toBe("refresh-456");
    expect(result.email).toBe("user@gmail.com");
    expect(result.provider).toBe("google");
    expect(result.expiresAt).toBe(9999999999999);
  });

  it("throws when refreshToken is absent", async () => {
    mockGetToken.mockResolvedValueOnce({
      tokens: { access_token: "access-only", refresh_token: undefined, expiry_date: null },
    });
    mockGetTokenInfo.mockResolvedValueOnce({ email: "user@gmail.com" });

    await expect(exchangeGoogleCode("code", "verifier")).rejects.toThrow(
      "Google: no refresh_token"
    );
  });

  it("throws when access_token is null", async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: { access_token: null } });
    await expect(exchangeGoogleCode("bad-code", "verifier")).rejects.toThrow("Google: no access_token");
  });

  it("throws when getToken rejects", async () => {
    mockGetToken.mockRejectedValueOnce(new Error("Network error"));
    await expect(exchangeGoogleCode("bad-code", "verifier")).rejects.toThrow("Network error");
  });
});

describe("exchangeMicrosoftCode", () => {
  it("throws when token endpoint returns non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 400 } as Response);
    await expect(exchangeMicrosoftCode("bad-code", "verifier")).rejects.toThrow(
      "Microsoft token exchange failed: 400"
    );
  });

  it("returns OAuthTokens on success", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "ms-access",
          refresh_token: "ms-refresh",
          expires_in: 3600,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "user@outlook.com" }),
      } as Response);

    const result = await exchangeMicrosoftCode("ms-code", "verifier-123");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.body as URLSearchParams).get("code_verifier")).toBe("verifier-123");
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("https://graph.microsoft.com/oidc/userinfo");
    expect(result.accessToken).toBe("ms-access");
    expect(result.refreshToken).toBe("ms-refresh");
    expect(result.email).toBe("user@outlook.com");
    expect(result.provider).toBe("microsoft");
  });

  it("throws when Microsoft userinfo does not contain an email", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "ms-access",
          refresh_token: "ms-refresh",
          expires_in: 3600,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: "abc" }),
      } as Response);

    await expect(exchangeMicrosoftCode("ms-code", "verifier")).rejects.toThrow(
      "Microsoft: no email in userinfo response"
    );
  });
});
