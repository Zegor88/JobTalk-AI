import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("~/services/ai.server", () => ({
  scoreEmailPriority: vi.fn(),
}));

import { scoreEmailPriority } from "~/services/ai.server";
import { action } from "./api.score";

describe("api.score route action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with JSON body containing the score", async () => {
    vi.mocked(scoreEmailPriority).mockResolvedValueOnce("high");

    const request = new Request("http://localhost/api/score", {
      method: "POST",
      body: JSON.stringify({ emailId: "123", subject: "Sub", snippet: "Snip" }),
    });

    const response = await action({ request, params: {}, context: {} });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ emailId: "123", priority: "high" });
  });

  it("fails safe when the ai service throws", async () => {
    vi.mocked(scoreEmailPriority).mockRejectedValueOnce(new Error("Network failure"));

    const request = new Request("http://localhost/api/score", {
      method: "POST",
      body: JSON.stringify({ emailId: "123", subject: "Sub", snippet: "Snip" }),
    });

    const response = await action({ request, params: {}, context: {} });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ emailId: "123", priority: "low" });
  });

  it("fails safe when json parsing throws", async () => {
    const request = new Request("http://localhost/api/score", {
      method: "POST",
      body: "{ bad json }",
    });

    const response = await action({ request, params: {}, context: {} });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ emailId: "", priority: "low" });
  });

  it("returns 400 with priority:low when required fields are missing (F5)", async () => {
    const request = new Request("http://localhost/api/score", {
      method: "POST",
      // subject present but emailId missing → validation fails
      body: JSON.stringify({ subject: "Sub", snippet: "Snip" }),
    });

    const response = await action({ request, params: {}, context: {} });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.priority).toBe("low");
    expect(scoreEmailPriority).not.toHaveBeenCalled();
  });
});

