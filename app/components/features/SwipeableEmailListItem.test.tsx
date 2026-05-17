import { render, fireEvent, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SwipeableEmailListItem } from "./SwipeableEmailListItem";
import type { Email } from "~/models/db.client";

const mockEmail: Email = {
  id: "e1",
  threadId: "t1",
  subject: "Test Subject",
  snippet: "Test snippet",
  date: "2026-05-15T09:00:00Z",
  isRead: false,
  priorityScore: null,
  archived: false,
  deleted: false,
  starred: false,
};

describe("SwipeableEmailListItem", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders email content correctly", () => {
    render(
      <SwipeableEmailListItem
        email={mockEmail}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText("Test Subject")).toBeDefined();
    expect(screen.getByText("Test snippet")).toBeDefined();
    // Avatar initial
    expect(screen.getByText("T")).toBeDefined();
  });

  it("contains visually hidden screen reader buttons for triage actions", () => {
    const onArchive = vi.fn();
    const onDelete = vi.fn();

    render(
      <SwipeableEmailListItem
        email={mockEmail}
        onArchive={onArchive}
        onDelete={onDelete}
        onClick={vi.fn()}
      />
    );

    const archiveBtn = screen.getByRole("button", { name: /archive/i });
    const deleteBtn = screen.getByRole("button", { name: /delete/i });

    expect(archiveBtn).toBeDefined();
    expect(deleteBtn).toBeDefined();

    fireEvent.click(archiveBtn);
    expect(onArchive).toHaveBeenCalledWith("e1");

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith("e1");
  });

  it("calls onClick when tapped without swiping", () => {
    const onClick = vi.fn();

    render(
      <SwipeableEmailListItem
        email={mockEmail}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onClick={onClick}
      />
    );

    const item = screen.getByRole("listitem");
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalled();
  });

  it("left swipe beyond threshold calls onArchive", () => {
    const onArchive = vi.fn();

    render(
      <SwipeableEmailListItem
        email={mockEmail}
        onArchive={onArchive}
        onDelete={vi.fn()}
        onClick={vi.fn()}
      />
    );

    const item = screen.getByRole("listitem");
    // dx = -500 → exceeds 40% of jsdom's window.innerWidth (1024 * 0.4 = 409.6)
    act(() => { fireEvent.pointerDown(item, { clientX: 500 }); });
    act(() => { fireEvent.pointerMove(item, { clientX: 0 }); });
    act(() => { fireEvent.pointerUp(item); });

    expect(onArchive).toHaveBeenCalledWith("e1");
  });

  it("right swipe beyond threshold calls onDelete", () => {
    const onDelete = vi.fn();

    render(
      <SwipeableEmailListItem
        email={mockEmail}
        onArchive={vi.fn()}
        onDelete={onDelete}
        onClick={vi.fn()}
      />
    );

    const item = screen.getByRole("listitem");
    // dx = +500 → exceeds 40% of jsdom's window.innerWidth (1024 * 0.4 = 409.6)
    act(() => { fireEvent.pointerDown(item, { clientX: 0 }); });
    act(() => { fireEvent.pointerMove(item, { clientX: 500 }); });
    act(() => { fireEvent.pointerUp(item); });

    expect(onDelete).toHaveBeenCalledWith("e1");
  });

  it("renders thread count badge when threadCount > 1", () => {
    render(
      <SwipeableEmailListItem
        email={mockEmail}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
        threadCount={3}
      />
    );

    expect(screen.getByText("(3)")).toBeDefined();
  });

  it("does not render thread count badge when threadCount is 1", () => {
    render(
      <SwipeableEmailListItem
        email={mockEmail}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
        threadCount={1}
      />
    );

    expect(screen.queryByText("(1)")).toBeNull();
  });
});
