import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriorityBadge } from "./PriorityBadge";

describe("PriorityBadge", () => {
  it("renders badge for 'high' score", () => {
    render(<PriorityBadge score="high" />);
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText(/High Priority/i)).toBeDefined();
  });

  it("renders nothing for 'low' score", () => {
    const { container } = render(<PriorityBadge score="low" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for null score", () => {
    const { container } = render(<PriorityBadge score={null} />);
    expect(container.firstChild).toBeNull();
  });
});
