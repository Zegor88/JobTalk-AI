import { createHash, randomBytes } from "node:crypto";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import type { OAuthProvider } from "./credential.server";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  email: string;
  provider: OAuthProvider;
  expiresAt: number;
}

export interface OAuthSecurityParams {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

const MS_AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";

export function createOAuthSecurityParams(): OAuthSecurityParams {
  const codeVerifier = randomBytes(48).toString("base64url");
  return {
    state: randomBytes(32).toString("base64url"),
    codeVerifier,
    codeChallenge: createHash("sha256").update(codeVerifier).digest("base64url"),
  };
}

// Factory avoids module-level instantiation that would throw if env vars are absent (e.g. in tests)
const getGoogleClient = () =>
  new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

export function createGoogleAuthUrl(params: Pick<OAuthSecurityParams, "state" | "codeChallenge">): string {
  return getGoogleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // MANDATORY: ensures refresh_token is always returned
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<OAuthTokens> {
  const client = getGoogleClient();
  const { tokens } = await client.getToken({ code, codeVerifier });
  if (!tokens.access_token) throw new Error("Google: no access_token in response");
  if (!tokens.refresh_token) throw new Error("Google: no refresh_token in response");

  const tokenInfo = await client.getTokenInfo(tokens.access_token);
  if (!tokenInfo.email) throw new Error("Google: no email in token info");
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    email: tokenInfo.email,
    provider: "google",
    expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
  };
}

export function createMicrosoftAuthUrl(security: Pick<OAuthSecurityParams, "state" | "codeChallenge">): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    scope: "Mail.Read offline_access email openid profile",
    response_mode: "query",
    state: security.state,
    code_challenge: security.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${MS_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftCode(code: string, codeVerifier: string): Promise<OAuthTokens> {
  const res = await fetch(`${MS_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Microsoft: no access_token in response");
  if (!data.refresh_token) throw new Error("Microsoft: no refresh_token in response");

  const email = await fetchMicrosoftUserEmail(data.access_token);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email,
    provider: "microsoft",
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

async function fetchMicrosoftUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://graph.microsoft.com/oidc/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Microsoft userinfo failed: ${res.status}`);

  const data = (await res.json()) as {
    email?: string;
    preferred_username?: string;
    upn?: string;
  };
  const email = data.email ?? data.preferred_username ?? data.upn;
  if (!email) throw new Error("Microsoft: no email in userinfo response");
  return email;
}
