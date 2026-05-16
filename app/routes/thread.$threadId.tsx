// app/routes/thread.$threadId.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useFetcher } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { AISummaryCard } from "~/components/ui/AISummaryCard";
import { SmartReplyChip } from "~/components/ui/SmartReplyChip";
import { LightweightComposer } from "~/components/ui/LightweightComposer";
import { TopAppBar } from "~/components/ui/TopAppBar";
import styles from "./thread.module.css";

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

function getInitial(str: string): string {
  return str.charAt(0).toUpperCase();
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const summarizeFetcher = useFetcher<SummarizeResult>();
  const draftFetcher = useFetcher<DraftResult>();

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerClosing, setComposerClosing] = useState(false);
  const [navigateAfterComposerClose, setNavigateAfterComposerClose] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const emails = useLiveQuery(
    () =>
      db?.emails
        .where("threadId")
        .equals(threadId ?? "")
        .sortBy("date"),
    [threadId]
  );

  const thread = useLiveQuery(
    () => db?.threads.get(threadId ?? ""),
    [threadId]
  );

  const cachedSummary = (thread as Record<string, unknown> | undefined)?.summary as string | undefined;
  const cachedActionItems = (thread as Record<string, unknown> | undefined)?.actionItems as string[] | undefined;
  const hasCachedSummary = !!cachedSummary;

  // Top bar title — first email's subject or fallback
  const threadTitle = emails?.[0]?.subject ?? "Thread";

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

  useEffect(() => {
    if (summarizeFetcher.data && !summarizeFetcher.data.isError && threadId) {
      const { summary, actionItems } = summarizeFetcher.data;
      db.threads
        .update(threadId, { summary, actionItems } as Parameters<typeof db.threads.update>[1])
        .catch((err) => console.error("[DB] cache summary failed:", err));
    }
  }, [summarizeFetcher.data, threadId]);

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
    : summarizeFetcher.data && !summarizeFetcher.data.isError
    ? summarizeFetcher.data
    : null;

  const fetcherError =
    !isLoadingSummary && summarizeFetcher.data?.isError
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

  function handleSend(_text: string) {
    closeComposer(true);
  }

  function handleDiscard() {
    closeComposer(false);
  }

  return (
    <>
      <TopAppBar title={threadTitle} showBack />

      <main className={styles.page}>
        {showSummaryCard && (
          <AISummaryCard
            isLoading={isLoadingSummary}
            summary={displaySummary?.summary}
            actionItems={displaySummary?.actionItems}
            error={fetcherError}
          />
        )}

        {displaySummary && emails?.length ? (
          <div className={styles.chipsRow}>
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
          <p className={styles.draftError}>{draftError}</p>
        )}

        {!emails ? (
          <p className={styles.loading}>Loading…</p>
        ) : emails.length === 0 ? (
          <p className={styles.empty}>No messages found.</p>
        ) : (
          emails.map((email) => (
            <div key={email.id} className={styles.messageCard}>
              <div className={styles.messageHeader}>
                <div className={styles.senderAvatar} aria-hidden="true">
                  {getInitial(email.subject)}
                </div>
                <div className={styles.senderInfo}>
                  <p className={styles.senderName}>{email.subject}</p>
                  <p className={styles.messageDate}>{formatDate(email.date)}</p>
                </div>
              </div>
              <p className={styles.messageBody}>
                {email.body ?? email.snippet}
              </p>
            </div>
          ))
        )}
      </main>

      {composerOpen && (
        <LightweightComposer
          draft={draftFetcher.data?.draft ?? ""}
          isClosing={composerClosing}
          onSend={handleSend}
          onDiscard={handleDiscard}
          onExited={handleComposerExited}
        />
      )}
    </>
  );
}
