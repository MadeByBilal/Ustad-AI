import { describe, expect, it } from "vitest";
import {
  generateOtp,
  hashOtp,
  isValidOtpFormat,
  normalizePhone,
  otpMatches,
  isValidPakistaniPhone,
} from "@/lib/auth/otp";

describe("normalizePhone", () => {
  it("strips spaces, dashes and parentheses", () => {
    expect(normalizePhone("+92 301 1234567")).toBe("03011234567");
    expect(normalizePhone("0301-1234567")).toBe("03011234567");
    expect(normalizePhone("(0301) 1234567")).toBe("03011234567");
    expect(normalizePhone("03011234567")).toBe("03011234567");
  });

  it("rejects non-Pakistani or short numbers", () => {
    expect(isValidPakistaniPhone("123")).toBe(false);
    expect(isValidPakistaniPhone("030112345")).toBe(false);
    expect(isValidPakistaniPhone("04121234567")).toBe(false);
    expect(isValidPakistaniPhone("123456789012")).toBe(false);
  });

  it("accepts canonical 03XXXXXXXXX format", () => {
    expect(isValidPakistaniPhone("03011234567")).toBe(true);
    expect(isValidPakistaniPhone("03159876543")).toBe(true);
  });
});

describe("generateOtp", () => {
  it("returns a six-digit numeric string", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("produces different values on successive calls", () => {
    expect(generateOtp()).not.toBe(generateOtp());
  });
});

describe("otpMatches", () => {
  const stored = "483920";

  it("matches the stored OTP", () => {
    expect(otpMatches(stored, stored)).toBe(true);
  });

  it("rejects a wrong OTP", () => {
    expect(otpMatches(stored, "000000")).toBe(false);
  });

  it("rejects non-6-digit input", () => {
    expect(otpMatches(stored, "12345")).toBe(false);
    expect(otpMatches(stored, "abc123")).toBe(false);
  });
});

describe("hashOtp", () => {
  it("is deterministic for the same phone + OTP", () => {
    expect(hashOtp("483920", "03011234567")).toBe(
      hashOtp("483920", "03011234567")
    );
  });

  it("does not contain the plaintext OTP", () => {
    const digest = hashOtp("483920", "03011234567");
    expect(digest).not.toContain("483920");
    expect(digest).toBeDefined();
  });
});

describe("isValidOtpFormat", () => {
  it("validates six-digit numeric strings only", () => {
    expect(isValidOtpFormat("000000")).toBe(true);
    expect(isValidOtpFormat("123456")).toBe(true);
    expect(isValidOtpFormat("12345")).toBe(false);
    expect(isValidOtpFormat("abcdef")).toBe(false);
  });
});