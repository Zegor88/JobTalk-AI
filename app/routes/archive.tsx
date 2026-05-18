// app/routes/archive.tsx
import { useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { requireSession } from "~/services/session.server";
import { TopAppBar } from "~/components/ui/TopAppBar";
import { EmptyState } from "~/components/ui/EmptyState";
import { Icon } from "~/components/ui/Icon";
import type { Route } from "./+types/archive";
import styles from "./archive.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "JobTalk AI — Archive" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSession(request);
  return null;
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
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Archive() {
  const navigate = useNavigate();

  const emails = useLiveQuery(
    () =>
      db?.emails
        .orderBy("date")
        .reverse()
        .filter((e) => e.archived && !e.deleted)
        .toArray(),
    []
  );

  async function handleRestore(id: string) {
    await db.emails.update(id, { archived: false });
  }

  return (
    <>
      <TopAppBar title="Archive" />

      <main className={styles.page}>
        {!emails ? null : emails.length === 0 ? (
          <EmptyState
            icon="archive-box"
            title="Archive is empty"
            body="Archived emails will appear here."
          />
        ) : (
          <ul className={styles.list}>
            {emails.map((email) => (
              <li key={email.id} className={styles.item}>
                <button
                  type="button"
                  className={styles.itemMain}
                  onClick={() => navigate(`/thread/${email.threadId}`)}
                >
                  <div className={styles.avatar} aria-hidden="true">
                    {getInitial(email.from)}
                  </div>
                  <div className={styles.content}>
                    <div className={styles.header}>
                      <p className={styles.subject}>{email.subject}</p>
                      <span className={styles.date}>{formatDate(email.date)}</span>
                    </div>
                    <p className={styles.snippet}>{email.snippet}</p>
                  </div>
                </button>

                <button
                  type="button"
                  className={styles.restoreBtn}
                  onClick={() => handleRestore(email.id)}
                  aria-label={`Restore "${email.subject}" to inbox`}
                  title="Restore to inbox"
                >
                  <Icon name="inbox" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
