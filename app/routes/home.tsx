// app/routes/home.tsx
import type { Route } from "./+types/home";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "JobTalk AI — Inbox" },
    { name: "description", content: "AI-powered email client for job seekers" },
  ];
}

// clientLoader runs on the CLIENT after hydration.
// It syncs remote data into Dexie, then returns nothing —
// the component reads state from Dexie via useLiveQuery, NOT from loader data.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  try {
    const response = await fetch("/api/sync");
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
    const { emails, threads } = await response.json();
    await db.emails.bulkPut(emails);
    await db.threads.bulkPut(threads);
  } catch {
    // Offline or network error: swallow silently, fallback to Dexie cache
    console.warn("[JobTalk] Sync unavailable — using cached data");
  }
  return null; // No loader data — components use useLiveQuery
}

// Required when using clientLoader without a server loader
clientLoader.hydrate = true;

export default function Home() {
  // Source of truth: Dexie.js — not loader return value
  const emails = useLiveQuery(() => db?.emails.orderBy("date").reverse().toArray(), []);

  return (
    <main style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Inbox</h1>
      {!emails ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      ) : emails.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>No emails cached yet.</p>
      ) : (
        <ul style={{ listStyle: "none" }}>
          {emails.map((email) => (
            <li
              key={email.id}
              style={{
                padding: "var(--space-4)",
                borderBottom: "1px solid var(--color-border)",
                opacity: email.isRead ? 0.6 : 1,
              }}
            >
              <p style={{ fontWeight: "var(--font-semibold)", fontSize: "var(--text-sm)" }}>
                {email.subject}
              </p>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)" }}>
                {email.snippet}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
