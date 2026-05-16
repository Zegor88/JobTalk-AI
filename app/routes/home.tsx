// app/routes/home.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { requireSession } from "~/services/session.server";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { SwipeableEmailListItem } from "~/components/features/SwipeableEmailListItem";
import { Snackbar } from "~/components/ui/Snackbar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "JobTalk AI — Inbox" },
    { name: "description", content: "AI-powered email client for job seekers" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSession(request);
  return null;
}

// clientLoader runs on the CLIENT after hydration.
// It syncs remote data into Dexie, then returns nothing —
// the component reads state from Dexie via useLiveQuery, NOT from loader data.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  try {
    const existing = await db.emails
      .filter((e) => !e.archived && !e.deleted)
      .count();
    if (existing === 0) {
      const response = await fetch("/api/sync");
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      const { emails, threads } = await response.json();
      await db.emails.bulkPut(emails);
      await db.threads.bulkPut(threads);
    }
  } catch {
    // Offline or network error: swallow silently, fallback to Dexie cache
    console.warn("[JobTalk] Sync unavailable — using cached data");
  }
  // ── Score unscored emails via BFF (fire-and-forget — does not block loader) ──
  try {
    const unscored = await db.emails
      .filter((e) => e.priorityScore === null)
      .toArray();

    if (unscored.length > 0) {
      // Fire-and-forget: no await — clientLoader returns immediately,
      // useLiveQuery re-renders badges as scores arrive asynchronously.
      Promise.all(
        unscored.map(async (email) => {
          try {
            // F2: 5 s timeout per request — prevents infinite hang on slow AI API
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
            // F3: guard non-JSON bodies (e.g. 502 HTML error page)
            if (!res.ok) return;
            const { priority } = await res.json();
            // Use email.id from closure — not server-returned emailId — avoids
            // no-op update("", ...) when server fail-safe returns empty string.
            await db.emails.update(email.id, { priorityScore: priority });
          } catch {
            // Per-email fail safe — one bad request never aborts the rest
          }
        })
      ).catch(() => {
        // Outer fail safe — Promise.all itself should never reject, but be safe
        console.warn("[JobTalk] AI scoring pipeline error");
      });
    }
  } catch {
    console.warn("[JobTalk] AI scoring unavailable — emails shown without priority");
  }

  return null; // No loader data — components use useLiveQuery
}

// Required when using clientLoader without a server loader
clientLoader.hydrate = true;

type SnackbarState = {
  emailId: string;
  message: string;
  action: "archive" | "delete";
} | null;

export default function Home() {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  // Source of truth: Dexie.js — filter excludes archived and deleted items (AC: 1, 2)
  const emails = useLiveQuery(
    () => db?.emails
      .orderBy("date")
      .reverse()
      .filter(e => !e.archived && !e.deleted)
      .toArray(),
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
    await db.emails.update(snackbar.emailId, { archived: false, deleted: false });
    setSnackbar(null);
  }

  return (
    <main style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Inbox</h1>
      {!emails ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      ) : emails.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Inbox zero! 🎉</p>
      ) : (
        <ul style={{ listStyle: "none" }}>
          {emails.map(email => (
            <SwipeableEmailListItem
              key={email.id}
              email={email}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onClick={() => navigate(`/thread/${email.threadId}`)}
            />
          ))}
        </ul>
      )}

      {snackbar && (
        <Snackbar
          message={snackbar.message}
          onUndo={handleUndo}
          onDismiss={() => setSnackbar(null)}
        />
      )}
    </main>
  );
}
