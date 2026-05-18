// app/components/ui/BottomNav.tsx
import { NavLink } from "react-router";
import { Icon } from "~/components/ui/Icon";
import styles from "./BottomNav.module.css";

const TABS = [
  { to: "/",         label: "Inbox",   icon: "inbox"       },
  { to: "/search",   label: "Search",  icon: "search"      },
  { to: "/archive",  label: "Archive", icon: "archive-box" },
  { to: "/settings", label: "Settings",icon: "settings"    },
] as const;

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {TABS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            isActive ? `${styles.tab} ${styles["tab--active"]}` : styles.tab
          }
          aria-label={label}
        >
          <span className={styles.iconWrap}>
            <span className={styles.activeIndicator} aria-hidden="true" />
            <Icon name={icon} size={22} />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
