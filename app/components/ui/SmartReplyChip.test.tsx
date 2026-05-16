import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SmartReplyChip } from "./SmartReplyChip";

afterEach(() => cleanup());

describe("SmartReplyChip", () => {
  it("renders the label text", () => {
    render(<SmartReplyChip label="Yes, schedule it" onClick={() => {}} />);
    expect(screen.getByText("Yes, schedule it")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<SmartReplyChip label="I'll follow up" onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(<SmartReplyChip label="No, not interested" onClick={handleClick} disabled />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("shows spinner and disables button when isLoading is true", () => {
    render(<SmartReplyChip label="Yes, schedule it" onClick={() => {}} isLoading />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("does not call onClick when loading", () => {
    const handleClick = vi.fn();
    render(<SmartReplyChip label="Yes, schedule it" onClick={handleClick} isLoading />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
