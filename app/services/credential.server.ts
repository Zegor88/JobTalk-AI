import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

export type OAuthProvider = "google" | "microsoft";

export interface OAuthCredential {
  userId: string;
  email: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

type CredentialStore = Map<string, string>;

const storeSymbol = Symbol.for("jobtalk.oauthCredentialStore");

const globalWithStore = globalThis as typeof globalThis & {
  [storeSymbol]?: CredentialStore;
};

function credentialStore(): CredentialStore {
  globalWithStore[storeSymbol] ??= new Map<string, string>();
  return globalWithStore[storeSymbol];
}

function encryptionKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET or CREDENTIAL_ENCRYPTION_KEY");
  return createHash("sha256").update(secret).digest();
}

function encryptCredential(credential: OAuthCredential): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credential), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

function decryptCredential(payload: string): OAuthCredential {
  const [ivPart, tagPart, ciphertextPart] = payload.split(".");
  if (!ivPart || !tagPart || !ciphertextPart) throw new Error("Invalid credential payload");

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as OAuthCredential;
}

export function createSessionId(): string {
  return randomUUID();
}

export function storeOAuthCredential(sessionId: string, credential: OAuthCredential): void {
  credentialStore().set(sessionId, encryptCredential(credential));
}

export function getOAuthCredential(sessionId: string): OAuthCredential | null {
  const payload = credentialStore().get(sessionId);
  if (!payload) return null;
  return decryptCredential(payload);
}

export function deleteOAuthCredential(sessionId: string): void {
  credentialStore().delete(sessionId);
}

export function clearCredentialStoreForTests(): void {
  credentialStore().clear();
}
