import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AISummaryCard } from "./AISummaryCard";

describe("AISummaryCard", () => {
  afterEach(() => cleanup());

  it("renders shimmer loading state when isLoading=true", () => {
    const { container } = render(<AISummaryCard isLoading={true} />);
    const card = container.querySelector("[aria-busy='true']");
    expect(card).toBeTruthy();
    expect(card?.getAttribute("aria-label")).toBe("Generating AI summary");
  });

  it("does not render summary content while loading", () => {
    render(
      <AISummaryCard
        isLoading={true}
        summary="Some summary"
        actionItems={["Item 1"]}
      />
    );
    expect(screen.queryByText("Some summary")).toBeNull();
    expect(screen.queryByText("The Ask")).toBeNull();
  });

  it("renders summary and action items when loaded", () => {
    render(
      <AISummaryCard
        isLoading={false}
        summary="Recruiter wants to schedule an interview."
        actionItems={["Reply with availability", "Prepare CV"]}
      />
    );

    expect(screen.getByText("The Ask")).toBeTruthy();
    expect(screen.getByText("Recruiter wants to schedule an interview.")).toBeTruthy();
    expect(screen.getByText("Reply with availability")).toBeTruthy();
    expect(screen.getByText("Prepare CV")).toBeTruthy();
  });

  it("renders sparkle icon when summary is present", () => {
    const { container } = render(
      <AISummaryCard
        isLoading={false}
        summary="Some summary"
      />
    );
    expect(container.textContent).toContain("✨");
  });

  it("renders nothing when not loading and no summary provided", () => {
    const { container } = render(<AISummaryCard isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders error message when error prop is provided", () => {
    render(
      <AISummaryCard
        isLoading={false}
        error="Unable to generate summary at this time."
      />
    );
    expect(
      screen.getByText("Unable to generate summary at this time.")
    ).toBeTruthy();
    expect(screen.queryByText("The Ask")).toBeNull();
  });

  it("renders summary without action list when actionItems is empty", () => {
    render(
      <AISummaryCard
        isLoading={false}
        summary="Brief summary here."
        actionItems={[]}
      />
    );
    expect(screen.getByText("Brief summary here.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
