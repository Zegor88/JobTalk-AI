import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LightweightComposer } from "./LightweightComposer";

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LightweightComposer", () => {
  it("renders the pre-filled draft in the textarea", () => {
    render(
      <LightweightComposer
        draft="Thank you for reaching out."
        onSend={() => {}}
        onDiscard={() => {}}
      />
    );
    const textarea = screen.getByRole("textbox", { name: /draft reply/i });
    expect((textarea as HTMLTextAreaElement).value).toBe("Thank you for reaching out.");
  });

  it("calls onSend with current textarea text when Send is clicked", () => {
    const handleSend = vi.fn();
    render(
      <LightweightComposer
        draft="Initial draft."
        onSend={handleSend}
        onDiscard={() => {}}
      />
    );
    const textarea = screen.getByRole("textbox", { name: /draft reply/i });
    fireEvent.change(textarea, { target: { value: "Edited reply text." } });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
    expect(handleSend).toHaveBeenCalledWith("Edited reply text.");
  });

  it("calls onDiscard when Discard is clicked", () => {
    const handleDiscard = vi.fn();
    render(
      <LightweightComposer
        draft="Some draft."
        onSend={() => {}}
        onDiscard={handleDiscard}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /discard draft/i }));
    expect(handleDiscard).toHaveBeenCalledTimes(1);
  });

  it("auto-focuses the textarea when opened", () => {
    render(
      <LightweightComposer draft="Draft text." onSend={() => {}} onDiscard={() => {}} />
    );

    const textarea = screen.getByRole("textbox", { name: /draft reply/i });
    expect(document.activeElement).toBe(textarea);
  });

  it("auto-expands the textarea height on input", () => {
    render(
      <LightweightComposer draft="Draft text." onSend={() => {}} onDiscard={() => {}} />
    );

    const textarea = screen.getByRole("textbox", { name: /draft reply/i }) as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 144 });
    fireEvent.input(textarea, { target: { value: "Line 1\nLine 2\nLine 3" } });

    expect(textarea.style.height).toBe("144px");
  });

  it("syncs textarea text when the draft prop changes", () => {
    const { rerender } = render(
      <LightweightComposer draft="First draft." onSend={() => {}} onDiscard={() => {}} />
    );

    rerender(
      <LightweightComposer draft="Second draft." onSend={() => {}} onDiscard={() => {}} />
    );

    const textarea = screen.getByRole("textbox", { name: /draft reply/i });
    expect((textarea as HTMLTextAreaElement).value).toBe("Second draft.");
  });

  it("calls onExited when the closing animation ends", () => {
    vi.useFakeTimers();
    const handleExited = vi.fn();
    render(
      <LightweightComposer
        draft="Draft text."
        isClosing
        onSend={() => {}}
        onDiscard={() => {}}
        onExited={handleExited}
      />
    );

    vi.advanceTimersByTime(250);
    expect(handleExited).toHaveBeenCalledTimes(1);
  });

  it("renders Send and Discard buttons", () => {
    render(
      <LightweightComposer draft="" onSend={() => {}} onDiscard={() => {}} />
    );
    expect(screen.getByRole("button", { name: /send reply/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /discard draft/i })).toBeTruthy();
  });

  it("has dialog role for accessibility", () => {
    render(
      <LightweightComposer draft="" onSend={() => {}} onDiscard={() => {}} />
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
