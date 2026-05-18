// app/routes/thread.$threadId.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useFetcher } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/models/db.client";
import { AISummaryCard } from "~/components/ui/AISummaryCard";
import { SmartReplyChip } from "~/components/ui/SmartReplyChip";
import { LightweightComposer } from "~/components/ui/LightweightComposer";
import { TopAppBar } from "~/components/ui/TopAppBar";
import { Icon } from "~/components/ui/Icon";
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
  suggestedReplies?: string[];
  isError?: boolean;
}

interface DraftResult {
  draft: string;
  isError: boolean;
}

const SMART_REPLY_CHIPS = ["Yes, schedule it", "No, not interested", "I'll follow up"];

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
  const cachedSuggestedReplies = (thread as Record<string, unknown> | undefined)?.suggestedReplies as string[] | undefined;
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
      const { summary, actionItems, suggestedReplies } = summarizeFetcher.data;
      db.threads
        .update(threadId, { summary, actionItems, suggestedReplies } as Parameters<typeof db.threads.update>[1])
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
    ? { summary: cachedSummary!, actionItems: cachedActionItems ?? [], suggestedReplies: cachedSuggestedReplies }
    : summarizeFetcher.data && !summarizeFetcher.data.isError
    ? summarizeFetcher.data
    : null;

  const fetcherError =
    !isLoadingSummary && summarizeFetcher.data?.isError
      ? summarizeFetcher.data.summary
      : undefined;

  const showSummaryCard = isLoadingSummary || !!displaySummary || !!fetcherError;

  // Dynamic chips: use AI-generated suggestions if available, fall back to hardcoded
  const chips = displaySummary?.suggestedReplies?.length
    ? displaySummary.suggestedReplies
    : SMART_REPLY_CHIPS;

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

  async function handleArchiveThread() {
    if (!emails?.length || !threadId) return;
    await Promise.all(emails.map((e) => db.emails.update(e.id, { archived: true })));
    navigate("/");
  }

  return (
    <>
      <TopAppBar
        title={threadTitle}
        showBack
        actions={
          <button
            type="button"
            className={styles.archiveBtn}
            onClick={handleArchiveThread}
            aria-label="Archive thread"
          >
            <Icon name="archive-box" size={22} />
          </button>
        }
      />

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
            {chips.map((label) => (
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
            <article key={email.id} className={styles.messageCard}>
              <header className={styles.messageHeader}>
                <div className={styles.senderAvatar} aria-hidden="true">
                  {getInitial(email.from)}
                </div>
                <div className={styles.senderInfo}>
                  <p className={styles.senderName}>{getDisplayName(email.from)}</p>
                  <p className={styles.messageDate}>{formatDate(email.date)}</p>
                </div>
              </header>
              {email.bodyHtml ? (
                <div
                  className={styles.messageBodyHtml}
                  /* HTML is sanitized server-side via sanitize-html with a strict allowlist
                     (no scripts/styles/forms, anchors forced to target=_blank rel=noopener). */
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                />
              ) : (
                <p className={styles.messageBody}>{email.body ?? email.snippet}</p>
              )}
            </article>
          ))
        )}

        {emails && emails.length > 0 && (
          <div className={styles.replyRow}>
            <button
              type="button"
              className={styles.replyBtn}
              onClick={() => setComposerOpen(true)}
              aria-label="Reply to thread"
            >
              <Icon name="pencil-square" size={18} />
              Reply
            </button>
          </div>
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
