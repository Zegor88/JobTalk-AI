import { createCookieSessionStorage, redirect } from "react-router";
import { getOAuthCredential, type OAuthProvider } from "./credential.server";

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SessionCookieData {
  sessionId?: string;
  userId?: string;
  email?: string;
  provider?: OAuthProvider;
  expiresAt?: number;
  oauthState?: string;
  oauthProvider?: OAuthProvider;
  codeVerifier?: string;
}

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionCookieData>({
    cookie: {
      name: "__jobtalk_session",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
      secrets: [process.env.SESSION_SECRET!],
    },
  });

export { getSession, commitSession, destroySession };

export async function requireSession(request: Request): Promise<SessionData> {
  const session = await getSession(request.headers.get("Cookie"));
  const sessionId = session.get("sessionId");
  const userId = session.get("userId");
  const email = session.get("email");
  const provider = session.get("provider");
  const expiresAt = session.get("expiresAt");
  if (!sessionId || !userId || !email || !provider || typeof expiresAt !== "number") {
    throw redirect("/login");
  }

  const credential = getOAuthCredential(sessionId);
  if (
    !credential ||
    credential.userId !== userId ||
    credential.email !== email ||
    credential.provider !== provider
  ) {
    throw redirect("/login");
  }

  return {
    sessionId,
    userId,
    email,
    provider,
    accessToken: credential.accessToken,
    refreshToken: credential.refreshToken,
    expiresAt,
  };
}
