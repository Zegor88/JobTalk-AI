// app/routes/api.sync.ts
import { generateMockEmails, generateMockThreads } from "~/services/mock.server";
import type { Route } from "./+types/api.sync";

export async function loader({ request }: Route.LoaderArgs) {
  const emails = generateMockEmails();
  const threads = generateMockThreads();

  return new Response(JSON.stringify({ emails, threads }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Auth mock: HTTP-only cookie — never readable by client JS
      "Set-Cookie": "auth_session=mock_token; HttpOnly; Path=/; SameSite=Strict",
    },
  });
}
