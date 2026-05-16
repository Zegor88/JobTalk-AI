import { redirect } from "react-router";
import { getSession, destroySession } from "~/services/session.server";
import { deleteOAuthCredential } from "~/services/credential.server";

export async function action({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("Cookie"));
  const sessionId = session.get("sessionId");
  if (sessionId) deleteOAuthCredential(sessionId);
  return redirect("/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
