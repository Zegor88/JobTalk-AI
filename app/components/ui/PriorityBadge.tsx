import styles from "./PriorityBadge.module.css";

interface Props {
  score: "high" | "low" | null;
}

/**
 * Renders a "High Priority" pill badge for AI-scored emails.
 * Renders nothing for "low" or null scores.
 */
export function PriorityBadge({ score }: Props) {
  if (score !== "high") return null;

  return (
    <span
      className={styles.badge}
      role="status"
      aria-label="High priority email"
    >
      ⚡ High Priority
    </span>
  );
}
