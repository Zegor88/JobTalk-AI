import { render, fireEvent, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Snackbar } from "./Snackbar";

describe("Snackbar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders the message", () => {
    render(<Snackbar message="Test message" onUndo={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText("Test message")).toBeDefined();
  });

  it("calls onUndo when the Undo button is clicked", () => {
    const onUndo = vi.fn();
    render(<Snackbar message="Test message" onUndo={onUndo} onDismiss={vi.fn()} />);
    
    const undoBtn = screen.getByRole("button", { name: /undo/i });
    fireEvent.click(undoBtn);
    expect(onUndo).toHaveBeenCalled();
  });

  it("calls onDismiss after 3000ms", () => {
    const onDismiss = vi.fn();
    render(<Snackbar message="Test message" onUndo={vi.fn()} onDismiss={onDismiss} />);
    
    expect(onDismiss).not.toHaveBeenCalled();
    
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(onDismiss).toHaveBeenCalled();
  });
});
