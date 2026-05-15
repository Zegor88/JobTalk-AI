// app/routes/thread.$threadId.tsx
import { useEffect } from "react";
import { useParams, useNavigate, useFetcher } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { AISummaryCard } from "~/components/ui/AISummaryCard";

export function meta() {
  return [
    { title: "JobTalk AI — Thread" },
    { name: "description", content: "Email thread view" },
  ];
}

interface SummarizeResult {
  summary: string;
  actionItems: string[];
  isError?: boolean;
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const summarizeFetcher = useFetcher<SummarizeResult>();

  // Zero network call — reads directly from Dexie
  const emails = useLiveQuery(
    () => db?.emails
      .where("threadId")
      .equals(threadId ?? "")
      .sortBy("date"),
    [threadId]
  );

  // Read thread record to check for cached summary
  const thread = useLiveQuery(
    () => db?.threads.get(threadId ?? ""),
    [threadId]
  );

  const cachedSummary = (thread as Record<string, unknown> | undefined)?.summary as string | undefined;
  const cachedActionItems = (thread as Record<string, unknown> | undefined)?.actionItems as string[] | undefined;
  const hasCachedSummary = !!cachedSummary;

  // Trigger summarization once emails load and no cached result exists (AC: 1)
  useEffect(() => {
    if (
      emails &&
      emails.length > 1 &&
      !hasCachedSummary &&
      summarizeFetcher.state === "idle" &&
      !summarizeFetcher.data
    ) {
      const emailContext = emails.map((e) => ({
        subject: e.subject,
        snippet: e.snippet,
        body: e.body,
      }));
      summarizeFetcher.submit(
        { emails: emailContext },
        { method: "POST", action: "/api/summarize", encType: "application/json" }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails, hasCachedSummary]);

  // Cache successful summary in Dexie (skip fallback/error responses)
  useEffect(() => {
    if (summarizeFetcher.data && !summarizeFetcher.data.isError && threadId) {
      const { summary, actionItems } = summarizeFetcher.data;
      db.threads
        .update(threadId, { summary, actionItems } as Parameters<typeof db.threads.update>[1])
        .catch(err => console.error("[DB] cache summary failed:", err));
    }
  }, [summarizeFetcher.data, threadId]);

  const isLoadingSummary =
    summarizeFetcher.state === "submitting" || summarizeFetcher.state === "loading";

  const displaySummary: SummarizeResult | null = hasCachedSummary
    ? { summary: cachedSummary!, actionItems: cachedActionItems ?? [] }
    : (summarizeFetcher.data && !summarizeFetcher.data.isError ? summarizeFetcher.data : null);

  const fetcherError = !isLoadingSummary && summarizeFetcher.data?.isError
    ? summarizeFetcher.data.summary
    : undefined;

  const showSummaryCard = isLoadingSummary || !!displaySummary || !!fetcherError;

  return (
    <main style={{ padding: "var(--space-4)" }}>
      {/* Navigation Header */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-primary)",
          cursor: "pointer",
          padding: 0,
          marginBottom: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-semibold)"
        }}
      >
        ← Back to Inbox
      </button>

      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Thread</h1>

      {/* AISummaryCard — just under h1 (AC: 2, 3) */}
      {showSummaryCard && (
        <AISummaryCard
          isLoading={isLoadingSummary}
          summary={displaySummary?.summary}
          actionItems={displaySummary?.actionItems}
          error={fetcherError}
        />
      )}

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
          </div>
        ))
      )}
    </main>
  );
}
