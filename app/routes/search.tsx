// app/routes/search.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { requireSession } from "~/services/session.server";
import { db } from "~/models/db.client";
import { SwipeableEmailListItem } from "~/components/features/SwipeableEmailListItem";
import { EmptyState } from "~/components/ui/EmptyState";
import { Icon } from "~/components/ui/Icon";
import { Snackbar } from "~/components/ui/Snackbar";
import type { Route } from "./+types/search";
import styles from "./search.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "JobTalk AI — Search" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSession(request);
  return null;
}

type SnackbarState = {
  emailId: string;
  message: string;
  action: "archive" | "delete";
} | null;

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const q = query.trim().toLowerCase();

  const results = useLiveQuery(
    () => {
      if (!q) return [];
      return db?.emails
        .filter(
          (e) =>
            !e.archived &&
            !e.deleted &&
            (e.subject.toLowerCase().includes(q) ||
              e.snippet.toLowerCase().includes(q))
        )
        .toArray();
    },
    [q]
  );

  const threadCounts = useLiveQuery(
    () =>
      db?.emails.toArray().then((all) =>
        all.reduce((acc, e) => {
          acc[e.threadId] = (acc[e.threadId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ),
    []
  );

  async function handleArchive(id: string) {
    await db.emails.update(id, { archived: true });
    setSnackbar({ emailId: id, message: "Email archived", action: "archive" });
  }

  async function handleDelete(id: string) {
    await db.emails.update(id, { deleted: true });
    setSnackbar({ emailId: id, message: "Email deleted", action: "delete" });
  }

  async function handleUndo() {
    if (!snackbar) return;
    if (snackbar.action === "delete") {
      await db.emails.update(snackbar.emailId, { deleted: false });
    } else if (snackbar.action === "archive") {
      await db.emails.update(snackbar.emailId, { archived: false });
    }
    setSnackbar(null);
  }

  return (
    <>
      {/* Custom search bar replaces TopAppBar on this screen */}
      <div className={styles.searchBar} role="search">
        <span className={styles.searchIcon} aria-hidden="true">
          <Icon name="search" size={20} />
        </span>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search emails…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Search emails"
        />
        {query && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <Icon name="x-mark" size={16} />
          </button>
        )}
      </div>

      <main className={styles.page}>
        {!q ? (
          <p className={styles.hint}>Type to search your inbox</p>
        ) : !results || results.length === 0 ? (
          <EmptyState
            icon="search"
            title="No results"
            body={`No emails found for "${query}"`}
          />
        ) : (
          <ul className={styles.list}>
            {results.map((email) => (
              <SwipeableEmailListItem
                key={email.id}
                email={email}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onClick={() => navigate(`/thread/${email.threadId}`)}
                threadCount={threadCounts?.[email.threadId] ?? 1}
              />
            ))}
          </ul>
        )}
      </main>

      {snackbar && (
        <Snackbar
          message={snackbar.message}
          onUndo={handleUndo}
          onDismiss={() => setSnackbar(null)}
        />
      )}
    </>
  );
}
