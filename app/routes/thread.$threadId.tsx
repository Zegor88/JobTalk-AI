// app/routes/thread.$threadId.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useFetcher } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { AISummaryCard } from "~/components/ui/AISummaryCard";
import { SmartReplyChip } from "~/components/ui/SmartReplyChip";
import { LightweightComposer } from "~/components/ui/LightweightComposer";

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

interface DraftResult {
  draft: string;
  isError: boolean;
}

const SMART_REPLY_CHIPS = ["Yes, schedule it", "No, not interested", "I'll follow up"];

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const summarizeFetcher = useFetcher<SummarizeResult>();
  const draftFetcher = useFetcher<DraftResult>();

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerClosing, setComposerClosing] = useState(false);
  const [navigateAfterComposerClose, setNavigateAfterComposerClose] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

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

  // Trigger summarization once emails load and no cached result exists
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
        JSON.stringify({ emails: emailContext }),
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

  // Open composer once draft arrives
  useEffect(() => {
    if (draftFetcher.data && !draftFetcher.data.isError) {
      setComposerOpen(true);
    }
  }, [draftFetcher.data]);

  const isLoadingSummary =
    summarizeFetcher.state === "submitting" || summarizeFetcher.state === "loading";

  const isDraftLoading = draftFetcher.state !== "idle";
  const draftError = draftFetcher.data?.isError ? draftFetcher.data.draft : undefined;

  const displaySummary: SummarizeResult | null = hasCachedSummary
    ? { summary: cachedSummary!, actionItems: cachedActionItems ?? [] }
    : (summarizeFetcher.data && !summarizeFetcher.data.isError ? summarizeFetcher.data : null);

  const fetcherError = !isLoadingSummary && summarizeFetcher.data?.isError
    ? summarizeFetcher.data.summary
    : undefined;

  const showSummaryCard = isLoadingSummary || !!displaySummary || !!fetcherError;

  function handleChipTap(label: string) {
    if (!emails?.length || isDraftLoading) return;
    setSelectedChip(label);
    const emailContext = emails.map((e) => ({
      subject: e.subject,
      snippet: e.snippet,
      body: e.body,
    }));
    draftFetcher.submit(
      JSON.stringify({ thread: emailContext, chipLabel: label }),
      { method: "POST", action: "/api/draft", encType: "application/json" }
    );
  }

  function closeComposer(shouldNavigate: boolean) {
    setNavigateAfterComposerClose(shouldNavigate);
    setComposerClosing(true);
  }

  function handleComposerExited() {
    const shouldNavigate = navigateAfterComposerClose;
    setComposerOpen(false);
    setComposerClosing(false);
    setNavigateAfterComposerClose(false);
    setSelectedChip(null);
    if (shouldNavigate) {
      navigate("/");
    }
  }

  function handleSend(text: string) {
    // Optimistic send — no real network call for MVP
    closeComposer(true);
  }

  function handleDiscard() {
    closeComposer(false);
  }

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

      {/* AISummaryCard — just under h1 */}
      {showSummaryCard && (
        <AISummaryCard
          isLoading={isLoadingSummary}
          summary={displaySummary?.summary}
          actionItems={displaySummary?.actionItems}
          error={fetcherError}
        />
      )}

      {/* SmartReplyChips — visible only when summary is loaded (AC: 1) */}
      {displaySummary && emails?.length ? (
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            flexWrap: "wrap",
            marginBottom: "var(--space-4)",
          }}
        >
          {SMART_REPLY_CHIPS.map((label) => (
            <SmartReplyChip
              key={label}
              label={label}
              onClick={() => handleChipTap(label)}
              isLoading={isDraftLoading && selectedChip === label}
              disabled={isDraftLoading && selectedChip !== label}
            />
          ))}
        </div>
      ) : null}

      {draftError && (
        <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
          {draftError}
        </p>
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

      {/* LightweightComposer — fixed overlay, outside scroll (AC: 3-6) */}
      {composerOpen && (
        <LightweightComposer
          draft={draftFetcher.data?.draft ?? ""}
          isClosing={composerClosing}
          onSend={handleSend}
          onDiscard={handleDiscard}
          onExited={handleComposerExited}
        />
      )}
    </main>
  );
}
