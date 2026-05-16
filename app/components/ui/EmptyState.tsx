// app/components/ui/EmptyState.tsx
import type { IconName } from "~/components/ui/Icon";
import { Icon } from "~/components/ui/Icon";
import styles from "./EmptyState.module.css";

interface Props {
  icon: IconName;
  title: string;
  body?: string;
}

export function EmptyState({ icon, title, body }: Props) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.iconWrap} aria-hidden="true">
        <Icon name={icon} size={36} />
      </div>
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
    </div>
  );
}
