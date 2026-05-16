import styles from "./SmartReplyChip.module.css";

interface Props {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SmartReplyChip({ label, onClick, isLoading = false, disabled = false }: Props) {
  return (
    <button
      className={styles.chip}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={isLoading ? `Generating reply: ${label}` : label}
    >
      {isLoading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : null}
      <span>{label}</span>
    </button>
  );
}
