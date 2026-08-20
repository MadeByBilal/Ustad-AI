import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/auth/password";

describe("hashPassword", () => {
  it("returns a self-describing scrypt hash with salt and parameters", () => {
    const hash = hashPassword("correct horse battery staple 9");
    const parts = hash.split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    // N, r, p parameters are decimal integers
    for (const p of [parts[1], parts[2], parts[3]]) {
      expect(p).toMatch(/^\d+$/);
    }
    // salt + derived key are hex
    expect(parts[4]).toMatch(/^[a-f0-9]+$/);
    expect(parts[5]).toMatch(/^[a-f0-9]+$/);
  });

  it("uses a random salt so identical passwords hash differently", () => {
    const a = hashPassword("same-password-1");
    const b = hashPassword("same-password-1");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("verifies a correct password", () => {
    const stored = hashPassword("hunter2hunter2");
    expect(verifyPassword("hunter2hunter2", stored)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const stored = hashPassword("hunter2hunter2");
    expect(verifyPassword("hunter2hunter3", stored)).toBe(false);
  });

  it("rejects a password with different case", () => {
    const stored = hashPassword("CaseSensitive9");
    expect(verifyPassword("casesensitive9", stored)).toBe(false);
  });

  it("returns false for a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("whatever1", "not-a-hash")).toBe(false);
    expect(verifyPassword("whatever1", "")).toBe(false);
    expect(verifyPassword("whatever1", "scrypt$bad$params")).toBe(false);
  });

  it("returns false for a truncated hash of the right shape", () => {
    const stored = hashPassword("full-password-7");
    const truncated = stored.split("$").slice(0, 5).join("$");
    expect(verifyPassword("full-password-7", truncated)).toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("accepts a strong password (8+ chars, letter and number)", () => {
    expect(validatePasswordStrength("ustad-2026")).toEqual({ valid: true });
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = validatePasswordStrength("ab1");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/8/);
  });

  it("rejects passwords without a letter", () => {
    expect(validatePasswordStrength("12345678").valid).toBe(false);
  });

  it("rejects passwords without a number", () => {
    expect(validatePasswordStrength("onlylettershere").valid).toBe(false);
  });

  it("rejects empty input", () => {
    expect(validatePasswordStrength("").valid).toBe(false);
  });
});
