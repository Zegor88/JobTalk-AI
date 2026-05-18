import { createCookieSessionStorage, redirect } from "react-router";
import type { OAuthProvider } from "./credential.server";

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
  accessToken?: string;
  refreshToken?: string;
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
  const accessToken = session.get("accessToken");
  const refreshToken = session.get("refreshToken");
  if (
    !sessionId ||
    !userId ||
    !email ||
    !provider ||
    typeof expiresAt !== "number" ||
    !accessToken ||
    !refreshToken
  ) {
    throw redirect("/login");
  }

  return {
    sessionId,
    userId,
    email,
    provider,
    accessToken,
    refreshToken,
    expiresAt,
  };
}
