import { redirect } from "react-router";
import { createMicrosoftAuthUrl, createOAuthSecurityParams } from "~/services/oauth.server";
import { commitSession, getSession } from "~/services/session.server";

export async function loader({ request }: { request: Request }) {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
    return redirect("/login?error=config");
  }

  const security = createOAuthSecurityParams();
  const session = await getSession(request.headers.get("Cookie"));
  session.set("oauthState", security.state);
  session.set("oauthProvider", "microsoft");
  session.set("codeVerifier", security.codeVerifier);

  return redirect(createMicrosoftAuthUrl(security), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
