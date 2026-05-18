// app/routes/home.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { requireSession } from "~/services/session.server";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { SwipeableEmailListItem } from "~/components/features/SwipeableEmailListItem";
import { Snackbar } from "~/components/ui/Snackbar";
import { TopAppBar } from "~/components/ui/TopAppBar";
import { SkeletonEmailItem } from "~/components/ui/SkeletonEmailItem";
import { EmptyState } from "~/components/ui/EmptyState";
import styles from "./home.module.css";

const SWIPE_HINT_KEY = "jobtalk_swipe_hinted";
// Increment when the sync payload schema changes (e.g. new fields added to Email)
const SYNC_SCHEMA_VERSION = "5"; // bumped: email body now fetched from API
const SYNC_SCHEMA_KEY = "jobtalk_sync_schema_v";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "JobTalk AI — Inbox" },
    { name: "description", content: "AI-powered email client for job seekers" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  return { userEmail: session.email };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const { userEmail } = (await serverLoader()) as { userEmail: string };

  const cachedUser = localStorage.getItem("jobtalk_user_email");
  const syncSchema = localStorage.getItem(SYNC_SCHEMA_KEY);
  if (cachedUser !== userEmail || syncSchema !== SYNC_SCHEMA_VERSION) {
    await db.emails.clear();
    await db.threads.clear();
    localStorage.setItem("jobtalk_user_email", userEmail);
    localStorage.setItem(SYNC_SCHEMA_KEY, SYNC_SCHEMA_VERSION);
  }

  try {
    const existing = await db.emails
      .filter((e) => !e.archived && !e.deleted)
      .count();
    if (existing === 0) {
      const response = await fetch("/api/sync");
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(`[JobTalk] Sync HTTP ${response.status}:`, body);
        throw new Error(`Sync failed: ${response.status}`);
      }
      const payload = await response.json();
      if (payload.error) {
        console.error("[JobTalk] Sync error from server:", payload.error);
        throw new Error(payload.error);
      }
      const { emails, threads } = payload;
      await db.emails.bulkPut(emails);
      await db.threads.bulkPut(threads);
    }
  } catch (err) {
    console.warn("[JobTalk] Sync unavailable — using cached data", err);
  }

  try {
    const unscored = await db.emails
      .filter((e) => e.priorityScore === null)
      .toArray();

    if (unscored.length > 0) {
      Promise.all(
        unscored.map(async (email) => {
          try {
            const res = await fetch("/api/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(5000),
              body: JSON.stringify({
                emailId: email.id,
                subject: email.subject,
                snippet: email.snippet,
              }),
            });
            if (!res.ok) return;
            const { priority } = await res.json();
            await db.emails.update(email.id, { priorityScore: priority });
          } catch {
            // per-email failsafe
          }
        })
      ).catch(() => {
        console.warn("[JobTalk] AI scoring pipeline error");
      });
    }
  } catch {
    console.warn("[JobTalk] AI scoring unavailable");
  }

  return { userEmail };
}

clientLoader.hydrate = true;

type SnackbarState = {
  emailId: string;
  message: string;
  action: "archive" | "delete";
} | null;

function getUserInitial(email: string): string {
  return email.charAt(0).toUpperCase();
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const userEmail = (loaderData as { userEmail?: string } | null)?.userEmail ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(SWIPE_HINT_KEY)) {
      setShowSwipeHint(true);
      const t = setTimeout(() => {
        localStorage.setItem(SWIPE_HINT_KEY, "1");
        setShowSwipeHint(false);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, []);

  const emails = useLiveQuery(
    () =>
      db?.emails
        .orderBy("date")
        .reverse()
        .filter((e) => !e.archived && !e.deleted)
        .toArray(),
    []
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
      <TopAppBar
        title="Inbox"
        userInitial={userEmail ? getUserInitial(userEmail) : undefined}
      />

      <main className={styles.page}>
        {!emails ? (
          // Loading state — shimmer skeletons
          <ul className={styles.list} aria-busy="true" aria-label="Loading emails">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonEmailItem key={i} />
            ))}
          </ul>
        ) : emails.length === 0 ? (
          <EmptyState
            icon="envelope-open"
            title="Inbox zero!"
            body="You're all caught up. New emails will appear here."
          />
        ) : (
          <ul className={styles.list}>
            {emails.map((email, index) => (
              <SwipeableEmailListItem
                key={email.id}
                email={email}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onClick={() => navigate(`/thread/${email.threadId}`)}
                threadCount={threadCounts?.[email.threadId] ?? 1}
                showHint={showSwipeHint && index === 0}
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
