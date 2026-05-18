import { redirect } from "react-router";
import { exchangeGoogleCode, exchangeMicrosoftCode } from "~/services/oauth.server";
import { getSession, commitSession } from "~/services/session.server";
import { createSessionId, type OAuthProvider } from "~/services/credential.server";

function isOAuthProvider(provider: string | null): provider is OAuthProvider {
  return provider === "google" || provider === "microsoft";
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const provider = url.searchParams.get("provider");
  const state = url.searchParams.get("state");

  if (!code || !provider || !state) return redirect("/login?error=missing_params");
  if (!isOAuthProvider(provider)) return redirect("/login?error=invalid_provider");

  try {
    const session = await getSession(request.headers.get("Cookie"));
    const expectedState = session.get("oauthState");
    const expectedProvider = session.get("oauthProvider");
    const codeVerifier = session.get("codeVerifier");

    if (state !== expectedState || provider !== expectedProvider || !codeVerifier) {
      return redirect("/login?error=invalid_state");
    }

    const tokens =
      provider === "google"
        ? await exchangeGoogleCode(code, codeVerifier)
        : await exchangeMicrosoftCode(code, codeVerifier);

    const sessionId = createSessionId();

    session.unset("oauthState");
    session.unset("oauthProvider");
    session.unset("codeVerifier");
    session.set("sessionId", sessionId);
    session.set("userId", tokens.email);
    session.set("email", tokens.email);
    session.set("provider", tokens.provider);
    session.set("expiresAt", tokens.expiresAt);
    session.set("accessToken", tokens.accessToken);
    session.set("refreshToken", tokens.refreshToken);

    return redirect("/", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch {
    return redirect("/login?error=auth_failed");
  }
}
