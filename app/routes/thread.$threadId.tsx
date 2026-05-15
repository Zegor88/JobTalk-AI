// app/routes/thread.$threadId.tsx
import { useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";

export function meta() {
  return [
    { title: "JobTalk AI — Thread" },
    { name: "description", content: "Email thread view" },
  ];
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();

  // Zero network call — reads directly from Dexie (AC: 4)
  const emails = useLiveQuery(
    () => db?.emails
      .where("threadId")
      .equals(threadId ?? "")
      .sortBy("date"),
    [threadId]
  );

  return (
    <main style={{ padding: "var(--space-4)" }}>
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Thread</h1>
      {!emails ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      ) : emails.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>No messages found.</p>
      ) : (
        emails.map(email => (
          <div
            key={email.id}
            style={{
              marginBottom: "var(--space-4)",
              padding: "var(--space-4)",
              backgroundColor: "var(--color-surface)",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
            }}
          >
            <p style={{ fontWeight: "var(--font-semibold)", fontSize: "var(--text-sm)" }}>
              {email.subject}
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>
              {new Date(email.date).toLocaleString()}
            </p>
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>
              {email.snippet}
            </p>
            {/* AISummaryCard slot — Story 2.2 injects here */}
          </div>
        ))
      )}
    </main>
  );
}
