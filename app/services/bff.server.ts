import { OAuth2Client } from "google-auth-library";
import { storeOAuthCredential, type OAuthCredential } from "~/services/credential.server";
import type { Email, Thread } from "~/models/db.client";

export type SyncPayload = { emails: Email[]; threads: Thread[] };
export type GoogleSyncSession = OAuthCredential & { sessionId: string; provider: "google" };

export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

export interface MicrosoftMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
}

// Factory avoids module-level instantiation — same pattern as oauth.server.ts
function getGoogleClient(session: GoogleSyncSession): OAuth2Client {
  const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });
  // setCredentials enables auto token refresh when client.fetch() detects expiry
  client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  client.on("tokens", (tokens) => {
    if (!tokens.access_token && !tokens.refresh_token && !tokens.expiry_date) return;
    storeOAuthCredential(session.sessionId, {
      userId: session.userId,
      email: session.email,
      provider: "google",
      accessToken: tokens.access_token ?? session.accessToken,
      refreshToken: tokens.refresh_token ?? session.refreshToken,
      expiresAt: tokens.expiry_date ?? session.expiresAt,
    });
  });
  return client;
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

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject,
    snippet: raw.snippet ?? "",
    date,
    isRead,
    priorityScore: null,
    archived: false,
    deleted: false,
  };
}

export function normalizeMicrosoftMessage(raw: MicrosoftMessage): Email {
  if (!hasRequiredMicrosoftFields(raw)) throw new Error("Invalid Microsoft message");
  return {
    id: raw.id,
    threadId: raw.conversationId,
    subject: raw.subject || "(no subject)",
    snippet: raw.bodyPreview ?? "",
    date: raw.receivedDateTime,
    isRead: raw.isRead,
    priorityScore: null,
    archived: false,
    deleted: false,
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
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
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
    "&$select=id,conversationId,subject,bodyPreview,receivedDateTime,isRead" +
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
