import styles from "./AISummaryCard.module.css";

interface Props {
  isLoading: boolean;
  summary?: string;
  actionItems?: string[];
  error?: string;
}

export function AISummaryCard({ isLoading, summary, actionItems, error }: Props) {
  if (isLoading) {
    return (
      <div className={styles.card} aria-busy="true" aria-label="Generating AI summary">
        <div className={styles.shimmerTitle} />
        <div className={styles.shimmerLine} />
        <div className={styles.shimmerLineShort} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">✨</span>
        <span className={styles.title}>The Ask</span>
      </div>
      <p className={styles.summary}>{summary}</p>
      {actionItems && actionItems.length > 0 && (
        <ul className={styles.actionItems}>
          {actionItems.map((item, i) => (
            <li key={`${i}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
