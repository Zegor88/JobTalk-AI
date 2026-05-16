// app/components/ui/TopAppBar.tsx
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "~/components/ui/Icon";
import styles from "./TopAppBar.module.css";

interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Slot for right-side action buttons */
  actions?: ReactNode;
  /** Show user avatar initial; if provided, renders a link to /settings */
  userInitial?: string;
}

export function TopAppBar({ title, showBack, onBack, actions, userInitial }: Props) {
  const navigate = useNavigate();

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  }

  return (
    <header className={styles.bar} role="banner">
      {showBack ? (
        <button
          type="button"
          className={styles.backBtn}
          onClick={handleBack}
          aria-label="Go back"
        >
          <Icon name="chevron-left" size={24} />
        </button>
      ) : null}

      <h1 className={styles.title}>{title}</h1>

      <div className={styles.actions}>
        {actions}
        {userInitial && (
          <Link
            to="/settings"
            className={styles.avatarBtn}
            aria-label="Open settings"
          >
            {userInitial}
          </Link>
        )}
      </div>
    </header>
  );
}
