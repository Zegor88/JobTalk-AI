// app/components/features/SwipeableEmailListItem.tsx
import { useRef, useState, type PointerEvent } from "react";
import type { Email } from "~/models/db.client";
import { PriorityBadge } from "~/components/ui/PriorityBadge";
import styles from "./SwipeableEmailListItem.module.css";

interface Props {
  email: Email;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

/** Derive a single uppercase initial from the email subject (stand-in for sender name) */
function getInitial(subject: string): string {
  return subject.charAt(0).toUpperCase();
}

/** Format ISO date string to a human-readable relative label */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function SwipeableEmailListItem({ email, onArchive, onDelete, onClick }: Props) {
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const [translateX, setTranslateX] = useState(0);
  const [action, setAction] = useState<"archive" | "delete" | null>(null);

  // 40% of viewport width — threshold for triggering action
  const THRESHOLD = typeof window !== "undefined" ? window.innerWidth * 0.4 : 150;

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    startXRef.current = e.clientX;
    isDraggingRef.current = false;
    isPointerDownRef.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 5) {
      isDraggingRef.current = true;
    }
    setTranslateX(dx);
    setAction(dx < 0 ? "archive" : dx > 0 ? "delete" : null);
  }

  function handlePointerUp() {
    isPointerDownRef.current = false;
    if (translateX < -THRESHOLD) {
      onArchive(email.id);
    } else if (translateX > THRESHOLD) {
      onDelete(email.id);
    } else {
      setTranslateX(0); // Snap back
      setAction(null);
    }
  }

  function handlePointerCancel() {
    isPointerDownRef.current = false;
    setTranslateX(0);
    setAction(null);
    isDraggingRef.current = false;
  }

  function handleClick() {
    // Don't trigger click if user was swiping
    if (!isDraggingRef.current) {
      onClick();
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* Action background — renders BEHIND the item */}
      <div
        className={styles.actionPanel}
        data-action={action}
        aria-hidden="true"
      />

      {/* Swipeable content */}
      <div
        className={styles.item}
        style={{ transform: `translateX(${translateX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        role="listitem"
      >
        {/* Sender initial avatar */}
        <div className={styles.avatar} aria-hidden="true">
          {getInitial(email.subject)}
        </div>

        {/* Email content */}
        <div className={styles.content}>
          <div className={styles.header}>
            <p className={styles.subject} data-read={String(email.isRead)}>
              {email.subject}
            </p>
            <span className={styles.date}>{formatDate(email.date)}</span>
          </div>
          <p className={styles.snippet}>{email.snippet}</p>

          {/* Priority badge slot — Story 2.1 fills this */}
          <div className={styles.prioritySlot}>
            <PriorityBadge score={email.priorityScore} />
          </div>
        </div>

        {/* Screen Reader: visually hidden action buttons (AC: 3) */}
        <button
          type="button"
          className={styles.srOnly}
          aria-label="Archive"
          onClick={e => { e.stopPropagation(); onArchive(email.id); }}
        >
          Archive
        </button>
        <button
          type="button"
          className={styles.srOnly}
          aria-label="Delete"
          onClick={e => { e.stopPropagation(); onDelete(email.id); }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
