import { vi, describe, it, expect } from "vitest";

// Mock the AI SDK before importing the service
vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mocked-model"),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from "ai";
import { scoreEmailPriority, summarizeThread } from "./ai.server";

describe("scoreEmailPriority", () => {
  it("returns 'high' when model classifies as high", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { priority: "high" },
    } as any);

    const result = await scoreEmailPriority(
      "Interview scheduled for tomorrow",
      "Hi, we'd like to schedule your technical interview..."
    );
    expect(result).toBe("high");
  });

  it("returns 'low' when model classifies as low", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { priority: "low" },
    } as any);

    const result = await scoreEmailPriority(
      "Weekly newsletter",
      "Check out these job listings..."
    );
    expect(result).toBe("low");
  });

  it("fails safe to 'low' on AI error", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("API quota exceeded"));

    const result = await scoreEmailPriority("Subject", "Snippet");
    expect(result).toBe("low");
  });
});

describe("summarizeThread", () => {
  it("returns summary and actionItems from AI", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        summary: "The recruiter is requesting a technical interview this week.",
        actionItems: ["Reply to confirm availability", "Prepare coding questions"],
      },
    } as any);

    const result = await summarizeThread([
      { subject: "Interview Request", snippet: "Hi, we'd like to schedule..." },
    ]);

    expect(result.summary).toBe("The recruiter is requesting a technical interview this week.");
    expect(result.actionItems).toEqual([
      "Reply to confirm availability",
      "Prepare coding questions",
    ]);
  });

  it("returns fallback summary when AI throws", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const result = await summarizeThread([
      { subject: "Subject", snippet: "Snippet" },
    ]);

    expect(result.summary).toBe("Unable to generate summary at this time.");
    expect(result.actionItems).toEqual([]);
  });

  it("handles empty emails array without crashing", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { summary: "No content.", actionItems: [] },
    } as any);

    const result = await summarizeThread([]);
    expect(result.summary).toBe("No content.");
    expect(result.actionItems).toEqual([]);
  });

  it("uses body over snippet when body is provided", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { summary: "Full body used.", actionItems: [] },
    } as any);

    await summarizeThread([
      { subject: "Subject", snippet: "Short preview", body: "Full email body content here." },
    ]);

    const call = vi.mocked(generateObject).mock.calls.at(-1)![0] as { prompt: string };
    expect(call.prompt).toContain("Full email body content here.");
    expect(call.prompt).not.toContain("Short preview");
  });
});
