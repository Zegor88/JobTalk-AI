// app/components/ui/FAB.tsx
import { Icon } from "~/components/ui/Icon";
import styles from "./FAB.module.css";

interface Props {
  onClick?: () => void;
}

export function FAB({ onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.fab}
      onClick={onClick}
      aria-label="Compose new email"
    >
      <Icon name="pencil-square" size={24} />
    </button>
  );
}
