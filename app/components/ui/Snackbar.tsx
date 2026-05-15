// app/components/ui/Snackbar.tsx
import { useEffect } from "react";
import styles from "./Snackbar.module.css";

interface Props {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Pure UI component — no Dexie calls, no side-effects beyond the auto-dismiss timer */
export function Snackbar({ message, onUndo, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={styles.snackbar} role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" onClick={onUndo}>Undo</button>
    </div>
  );
}
