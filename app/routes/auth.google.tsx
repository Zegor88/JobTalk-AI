import { redirect } from "react-router";
import { createGoogleAuthUrl, createOAuthSecurityParams } from "~/services/oauth.server";
import { commitSession, getSession } from "~/services/session.server";

export async function loader({ request }: { request: Request }) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return redirect("/login?error=config");
  }

  const security = createOAuthSecurityParams();
  const session = await getSession(request.headers.get("Cookie"));
  session.set("oauthState", security.state);
  session.set("oauthProvider", "google");
  session.set("codeVerifier", security.codeVerifier);

  return redirect(createGoogleAuthUrl(security), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
