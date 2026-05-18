import { OAuth2Client } from "google-auth-library";
import type { OAuthCredential } from "~/services/credential.server";
import type { Email, Thread } from "~/models/db.client";
import { renderEmailBody } from "~/services/email-renderer.server";

export type SyncPayload = { emails: Email[]; threads: Thread[] };
export type GoogleSyncSession = OAuthCredential & { sessionId: string; provider: "google" };

interface GmailPart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    mimeType?: string;
    body?: { data?: string; size?: number };
    parts?: GmailPart[];
  };
}

export interface MicrosoftMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  from?: { emailAddress?: { name?: string; address?: string } };
  body?: { contentType?: string; content?: string };
}

// Factory avoids module-level instantiation — same pattern as oauth.server.ts
function getGoogleClient(session: GoogleSyncSession): OAuth2Client {
  const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });
  // setCredentials enables auto token refresh when client.fetch() detects expiry.
  // Refreshed tokens are short-lived for the current request only — the session
  // cookie holds the persistent refresh_token, which the OAuth2 client will
  // re-use to mint a new access_token on the next request if needed.
  client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  return client;
}

/** Recursively walk MIME parts and collect the first text/plain and text/html bodies. */
function extractGmailBodies(part: GmailPart | undefined): { plain: string; html: string } {
  const result = { plain: "", html: "" };
  if (!part) return result;

  function walk(p: GmailPart | undefined): void {
    if (!p) return;
    if (p.mimeType === "text/plain" && p.body?.data && !result.plain) {
      result.plain = Buffer.from(p.body.data, "base64url").toString("utf-8");
    } else if (p.mimeType === "text/html" && p.body?.data && !result.html) {
      result.html = Buffer.from(p.body.data, "base64url").toString("utf-8");
    }
    if (p.parts) {
      for (const sub of p.parts) {
        if (result.plain && result.html) return;
        walk(sub);
      }
    }
  }
  walk(part);
  return result;
}

/** Decode HTML entities in plain text (e.g. Gmail snippets contain &amp; &#39; etc.) */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parseGmailDate(dateHeader: string, internalDate?: string): string {
  const parsedHeader = new Date(dateHeader);
  if (Number.isFinite(parsedHeader.getTime())) return parsedHeader.toISOString();

  const internalTimestamp = internalDate ? Number(internalDate) : NaN;
  if (Number.isFinite(internalTimestamp)) return new Date(internalTimestamp).toISOString();

  return new Date().toISOString();
}

function hasRequiredGmailFields(raw: Partial<GmailMessage>): raw is GmailMessage {
  return typeof raw.id === "string" && raw.id.length > 0
    && typeof raw.threadId === "string" && raw.threadId.length > 0;
}

function hasRequiredMicrosoftFields(raw: Partial<MicrosoftMessage>): raw is MicrosoftMessage {
  return typeof raw.id === "string" && raw.id.length > 0
    && typeof raw.conversationId === "string" && raw.conversationId.length > 0
    && typeof raw.receivedDateTime === "string" && raw.receivedDateTime.length > 0;
}

export function normalizeGmailMessage(raw: GmailMessage): Email {
  if (!hasRequiredGmailFields(raw)) throw new Error("Invalid Gmail message");
  const headers = raw.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const subject = getHeader("Subject") || "(no subject)";
  const date = parseGmailDate(getHeader("Date"), raw.internalDate);
  const isRead = !(raw.labelIds ?? []).includes("UNREAD");
  const from = getHeader("From");
  const { plain, html } = extractGmailBodies(raw.payload as GmailPart | undefined);
  const rendered = renderEmailBody({ plain, html });

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject,
    snippet: decodeEntities(raw.snippet ?? ""),
    body: rendered.body || undefined,
    bodyHtml: rendered.bodyHtml || undefined,
    date,
    isRead,
    from: from || undefined,
    priorityScore: null,
    archived: false,
    deleted: false,
    starred: false,
  };
}

export function normalizeMicrosoftMessage(raw: MicrosoftMessage): Email {
  if (!hasRequiredMicrosoftFields(raw)) throw new Error("Invalid Microsoft message");
  const senderName = raw.from?.emailAddress?.name;
  const senderAddress = raw.from?.emailAddress?.address;
  const from = senderName
    ? senderAddress ? `${senderName} <${senderAddress}>` : senderName
    : senderAddress;

  const rawBody = raw.body?.content ?? "";
  const isHtml = raw.body?.contentType === "html";
  const rendered = rawBody
    ? renderEmailBody({
        plain: isHtml ? undefined : rawBody,
        html: isHtml ? rawBody : undefined,
      })
    : { body: "", bodyHtml: "" };

  return {
    id: raw.id,
    threadId: raw.conversationId,
    subject: raw.subject || "(no subject)",
    snippet: raw.bodyPreview ?? "",
    body: rendered.body || undefined,
    bodyHtml: rendered.bodyHtml || undefined,
    date: raw.receivedDateTime,
    isRead: raw.isRead,
    from: from || undefined,
    priorityScore: null,
    archived: false,
    deleted: false,
    starred: false,
  };
}

export function buildThreadsFromEmails(emails: Email[]): Thread[] {
  const threadMap = new Map<string, Thread>();
  for (const email of emails) {
    const existing = threadMap.get(email.threadId);
    if (!existing || email.date > existing.lastMessageDate) {
      threadMap.set(email.threadId, {
        id: email.threadId,
        subject: email.subject,
        lastMessageDate: email.date,
      });
    }
  }
  return Array.from(threadMap.values());
}

export async function fetchGmailEmails(session: GoogleSyncSession): Promise<SyncPayload> {
  const client = getGoogleClient(session);

  const listRes = await client.fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in%3Ainbox"
  );
  const listData = listRes.data as { messages?: Array<{ id: string; threadId: string }> };
  const messageRefs = listData.messages ?? [];

  const rawMessages = await Promise.all(
    messageRefs.map(({ id }) =>
      client
        .fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`
        )
        .then((r) => r.data as GmailMessage)
    )
  );

  const emails = rawMessages.filter(hasRequiredGmailFields).map(normalizeGmailMessage);
  const threads = buildThreadsFromEmails(emails);
  return { emails, threads };
}

export async function fetchMicrosoftEmails(accessToken: string): Promise<SyncPayload> {
  const url =
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages" +
    "?$top=20" +
    "&$select=id,conversationId,subject,bodyPreview,body,receivedDateTime,isRead,from" +
    "&$orderby=receivedDateTime desc";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Graph API failed: ${res.status}`);

  const data = (await res.json()) as { value?: MicrosoftMessage[] };
  const emails = (data.value ?? []).filter(hasRequiredMicrosoftFields).map(normalizeMicrosoftMessage);
  const threads = buildThreadsFromEmails(emails);
  return { emails, threads };
}
