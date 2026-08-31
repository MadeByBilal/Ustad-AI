import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionToken,
  isSessionTokenValid,
} from "@/server/lib/auth/session";

describe("createSessionToken", () => {
  it("returns a 64-char hex token", () => {
    expect(createSessionToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces unique tokens", () => {
    expect(createSessionToken()).not.toBe(createSessionToken());
  });
});

describe("isSessionTokenValid", () => {
  it("accepts well-formed tokens", () => {
    expect(isSessionTokenValid(createSessionToken())).toBe(true);
  });

  it("rejects empty, short and non-hex tokens", () => {
    expect(isSessionTokenValid("")).toBe(false);
    expect(isSessionTokenValid("abc")).toBe(false);
    expect(isSessionTokenValid("z".repeat(64))).toBe(false);
    expect(isSessionTokenValid(null)).toBe(false);
  });
});

describe("session constants", () => {
  it("defines the cookie name and TTL", () => {
    expect(SESSION_COOKIE_NAME).toBe("ustad_session");
    expect(SESSION_TTL_DAYS).toBeGreaterThanOrEqual(1);
  });
});