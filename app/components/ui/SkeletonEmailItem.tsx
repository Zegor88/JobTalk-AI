// app/components/ui/SkeletonEmailItem.tsx
import styles from "./SkeletonEmailItem.module.css";

export function SkeletonEmailItem() {
  return (
    <li className={styles.wrapper} aria-hidden="true">
      <div className={styles.avatar} />
      <div className={styles.content}>
        <div className={styles.line} />
        <div className={styles.lineShort} />
        <div className={styles.lineXShort} />
      </div>
    </li>
  );
}
