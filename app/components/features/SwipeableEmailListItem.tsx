// app/components/features/SwipeableEmailListItem.tsx
import { useRef, useState, type PointerEvent } from "react";
import type { Email } from "~/models/db.client";
import { PriorityBadge } from "~/components/ui/PriorityBadge";
import { Icon } from "~/components/ui/Icon";
import styles from "./SwipeableEmailListItem.module.css";

interface Props {
  email: Email;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  threadCount?: number;
  showHint?: boolean;
}

function getDisplayName(from?: string): string {
  if (!from) return "?";
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].trim() : from;
}

function getInitial(from?: string): string {
  return getDisplayName(from).charAt(0).toUpperCase();
}

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

export function SwipeableEmailListItem({ email, onArchive, onDelete, onClick, threadCount, showHint }: Props) {
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const translateXRef = useRef(0); // tracks current value for use in pointerUp without stale closure
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [action, setAction] = useState<"archive" | "delete" | null>(null);

  // 40% of viewport width — threshold for triggering action
  const THRESHOLD = typeof window !== "undefined" ? window.innerWidth * 0.4 : 150;

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    startXRef.current = e.clientX;
    isDraggingRef.current = false;
    isPointerDownRef.current = true;
    setIsDragging(false);
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 5) {
      isDraggingRef.current = true;
      if (!isDragging) setIsDragging(true);
    }
    translateXRef.current = dx;
    setTranslateX(dx);
    // Left swipe = Archive, Right swipe = Delete
    setAction(dx < 0 ? "archive" : dx > 0 ? "delete" : null);
  }

  function handlePointerUp() {
    isPointerDownRef.current = false;
    setIsDragging(false);
    const tx = translateXRef.current;
    if (tx < -THRESHOLD) {
      setTranslateX(-window.innerWidth);
      onArchive(email.id);
    } else if (tx > THRESHOLD) {
      setTranslateX(window.innerWidth);
      onDelete(email.id);
    } else {
      setTranslateX(0);
      translateXRef.current = 0;
      setAction(null);
    }
  }

  function handlePointerCancel() {
    isPointerDownRef.current = false;
    setIsDragging(false);
    translateXRef.current = 0;
    setTranslateX(0);
    setAction(null);
    isDraggingRef.current = false;
  }

  function handleClick() {
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
      >
        {action === "archive" && (
          <span className={styles.actionLabel}>
            <Icon name="archive-box" size={22} />
            Archive
          </span>
        )}
        {action === "delete" && (
          <span className={styles.actionLabel}>
            <Icon name="trash" size={22} />
            Delete
          </span>
        )}
      </div>

      {/* Swipeable content */}
      <div
        className={`${styles.item}${showHint ? ` ${styles["item--hint"]}` : ""}`}
        data-starred={String(email.starred)}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        role="listitem"
      >
        {/* Sender initial avatar */}
        <div className={styles.avatar} aria-hidden="true">
          {getInitial(email.from)}
        </div>

        {/* Email content */}
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.subjectRow}>
              <p className={styles.subject} data-read={String(email.isRead)}>
                {email.subject}
              </p>
              {(threadCount ?? 1) > 1 && (
                <span className={styles.threadCount} aria-label={`${threadCount} messages`}>
                  ({threadCount})
                </span>
              )}
            </div>
            <span className={styles.date}>{formatDate(email.date)}</span>
          </div>
          <p className={styles.snippet}>{email.snippet}</p>

          <div className={styles.meta}>
            <div className={styles.prioritySlot}>
              <PriorityBadge score={email.priorityScore} />
            </div>
          </div>
        </div>

        {/* Screen Reader: visually hidden action buttons */}
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
