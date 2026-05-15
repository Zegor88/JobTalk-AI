import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("~/services/ai.server", () => ({
  summarizeThread: vi.fn(),
}));

import { summarizeThread } from "~/services/ai.server";
import { action } from "./api.summarize";

describe("api.summarize route action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with summary, actionItems and isError=false on success", async () => {
    vi.mocked(summarizeThread).mockResolvedValueOnce({
      summary: "The recruiter wants to schedule an interview.",
      actionItems: ["Reply with availability"],
    });

    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify({
        emails: [{ subject: "Interview", snippet: "Hi, we'd like to..." }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await action({ request });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toBe("The recruiter wants to schedule an interview.");
    expect(data.actionItems).toEqual(["Reply with availability"]);
    expect(data.isError).toBe(false);
  });

  it("returns fallback with isError=true when summarizeThread throws", async () => {
    vi.mocked(summarizeThread).mockRejectedValueOnce(new Error("AI failure"));

    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify({
        emails: [{ subject: "Subject", snippet: "Snippet" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await action({ request });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toBe("Unable to generate summary at this time.");
    expect(data.actionItems).toEqual([]);
    expect(data.isError).toBe(true);
  });

  it("returns fallback when emails field is missing", async () => {
    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify({ other: "data" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await action({ request });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toBe("Unable to generate summary at this time.");
    expect(data.actionItems).toEqual([]);
    expect(summarizeThread).not.toHaveBeenCalled();
  });

  it("returns fallback on malformed JSON body", async () => {
    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: "{ bad json }",
      headers: { "Content-Type": "application/json" },
    });

    const response = await action({ request });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toBe("Unable to generate summary at this time.");
  });
});
