import { summarizeThread } from "~/services/ai.server";

const FALLBACK = {
  summary: "Unable to generate summary at this time.",
  actionItems: [] as string[],
  isError: true,
};

export async function action({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as {
      emails?: { subject: string; snippet: string; body?: string }[];
    };

    if (!Array.isArray(body.emails)) {
      return new Response(JSON.stringify(FALLBACK), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await summarizeThread(body.emails);

    return new Response(JSON.stringify({ ...result, isError: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[API] /api/summarize error:", err);
    return new Response(JSON.stringify(FALLBACK), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
