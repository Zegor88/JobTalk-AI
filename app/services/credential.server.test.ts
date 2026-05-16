import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCredentialStoreForTests,
  createSessionId,
  deleteOAuthCredential,
  getOAuthCredential,
  storeOAuthCredential,
} from "./credential.server";

beforeEach(() => {
  process.env.SESSION_SECRET = "test-session-secret-for-tests-32chars!";
  clearCredentialStoreForTests();
});

afterEach(() => {
  clearCredentialStoreForTests();
});

describe("server-side OAuth credential store", () => {
  it("stores and retrieves credentials by opaque session id", () => {
    const sessionId = createSessionId();
    storeOAuthCredential(sessionId, {
      userId: "user@gmail.com",
      email: "user@gmail.com",
      provider: "google",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 9999999999999,
    });

    expect(getOAuthCredential(sessionId)).toEqual({
      userId: "user@gmail.com",
      email: "user@gmail.com",
      provider: "google",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 9999999999999,
    });
  });

  it("deletes credentials on logout", () => {
    const sessionId = createSessionId();
    storeOAuthCredential(sessionId, {
      userId: "user@outlook.com",
      email: "user@outlook.com",
      provider: "microsoft",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 9999999999999,
    });

    deleteOAuthCredential(sessionId);

    expect(getOAuthCredential(sessionId)).toBeNull();
  });
});
