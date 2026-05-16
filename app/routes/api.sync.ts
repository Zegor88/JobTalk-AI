import { requireSession } from "~/services/session.server";
import { fetchGmailEmails, fetchMicrosoftEmails } from "~/services/bff.server";
import type { Route } from "./+types/api.sync";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request); // throws redirect("/login") if session invalid

  try {
    const payload =
      session.provider === "google"
        ? await fetchGmailEmails({ ...session, provider: "google" })
        : await fetchMicrosoftEmails(session.accessToken);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    console.error("[JobTalk] /api/sync error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
