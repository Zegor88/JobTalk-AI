import { vi, describe, it, expect } from "vitest";

// Mock the AI SDK before importing the service
vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mocked-model"),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from "ai";
import { scoreEmailPriority } from "./ai.server";

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
