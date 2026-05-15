import { render, fireEvent, screen, cleanup } from "@testing-library/react";
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
});
