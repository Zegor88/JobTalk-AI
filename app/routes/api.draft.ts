import { generateDraft } from "~/services/ai.server";
import { z } from "zod";

const FALLBACK = {
  draft: "Unable to generate draft at this time.",
  isError: true,
};

const ALLOWED_CHIP_LABELS = ["Yes, schedule it", "No, not interested", "I'll follow up"] as const;

const DraftRequestSchema = z.object({
  thread: z.array(z.object({
    subject: z.string().trim().min(1).max(300),
    snippet: z.string().trim().min(1).max(1000),
    body: z.string().max(4000).optional(),
  })).min(1).max(10),
  chipLabel: z.enum(ALLOWED_CHIP_LABELS),
});

function fallbackResponse() {
  return new Response(JSON.stringify(FALLBACK), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }: { request: Request }) {
  try {
    if (request.method !== "POST") {
      return fallbackResponse();
    }

    const parsed = DraftRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fallbackResponse();
    }

    const result = await generateDraft(parsed.data.thread, parsed.data.chipLabel);

    return new Response(JSON.stringify({ ...result, isError: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[API] /api/draft error:", err);
    return fallbackResponse();
  }
}
