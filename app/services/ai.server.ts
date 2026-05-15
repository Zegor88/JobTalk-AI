import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const PrioritySchema = z.object({
  priority: z.enum(["high", "low"]),
});

/**
 * Scores a single email as "high" or "low" priority using Gemini Flash.
 * Never returns AI-generated text — only the structured score.
 * Fails safe: returns "low" on any error.
 */
export async function scoreEmailPriority(
  subject: string,
  snippet: string
): Promise<"high" | "low"> {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: PrioritySchema,
      prompt: `You are an email priority classifier for a job seeker.
Classify the following email as "high" or "low" priority.

High priority examples: interview invitations, job offers, recruiter follow-ups,
application status updates, urgent requests from hiring managers.

Low priority examples: newsletters, automated confirmations, marketing emails,
generic job board digests.

Subject: ${subject}
Snippet: ${snippet}

Respond with only a JSON object matching the schema.`,
    });

    return object.priority;
  } catch (err) {
    // Fail safe — never crash the inbox
    console.error("[AI] scoreEmailPriority failed:", err);
    return "low";
  }
}
