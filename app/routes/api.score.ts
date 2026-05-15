import { scoreEmailPriority } from "~/services/ai.server";
import type { Route } from "./+types/api.score";

export async function action({ request }: Route.ActionArgs) {
  let emailId = "";
  try {
    const body = await request.json() as {
      emailId: string;
      subject: string;
      snippet: string;
    };

    // F5: runtime validation — prevent undefined/null reaching the AI prompt
    if (
      typeof body.emailId !== "string" || !body.emailId ||
      typeof body.subject !== "string" ||
      typeof body.snippet !== "string"
    ) {
      return new Response(
        JSON.stringify({ emailId: body.emailId ?? "", priority: "low" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    emailId = body.emailId;

    const priority = await scoreEmailPriority(body.subject, body.snippet);

    return new Response(
      JSON.stringify({ emailId, priority }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    // Fail safe — parse error or malformed body
    console.error("[API] /api/score error:", err);
    return new Response(
      JSON.stringify({ emailId, priority: "low" }),
      {
        status: 200,  // Return 200 so clientLoader doesn't crash
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
