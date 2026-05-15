import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const PrioritySchema = z.object({
  priority: z.enum(["high", "low"]),
});

const SummarizationSchema = z.object({
  summary: z.string(),
  actionItems: z.array(z.string()),
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

const SUMMARIZE_FALLBACK = {
  summary: "Unable to generate summary at this time.",
  actionItems: [] as string[],
};

/**
 * Summarizes an email thread into "The Ask" (1-2 sentences) plus action items.
 * Uses generateObject with Zod for structured output. Fails safe on any error.
 */
export async function summarizeThread(
  emails: { subject: string; snippet: string; body?: string }[]
): Promise<{ summary: string; actionItems: string[] }> {
  try {
    const emailText = emails
      .map((e, i) => `Email ${i + 1}:\nSubject: ${e.subject}\n${e.body ?? e.snippet}`)
      .join("\n\n");

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: SummarizationSchema,
      prompt: `You are an AI assistant helping a job seeker manage their email inbox.
Analyze the following email thread and provide:
1. A 1-2 sentence summary ("The Ask") — what is the core ask or topic of this thread?
2. Concise action items the user needs to take

${emailText}

Respond with a JSON object matching the schema.`,
    });

    return object;
  } catch (err) {
    console.error("[AI] summarizeThread failed:", err);
    return SUMMARIZE_FALLBACK;
  }
}
