import { createHash, randomInt } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 300;
const VALID_OTP_RE = /^\d{6}$/;

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function isValidPakistaniPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return /^03\d{9}$/.test(normalized);
}

export function generateOtp(): string {
  const otp = randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
  return otp.length === OTP_LENGTH ? otp : generateOtp();
}

export function isValidOtpFormat(otp: string): boolean {
  return VALID_OTP_RE.test(otp);
}

/**
 * OTPs are never stored in plaintext. The digest is salted with the phone
 * number so the same OTP coincidence across users cannot be detected.
 */
export function hashOtp(otp: string, phone: string): string {
  return createHash("sha256").update(`${phone}:${otp}`).digest("hex");
}

/**
 * Format-validated equality check for a submitted OTP. The verify route
 * compares digests (`hashOtp`) against the stored value; this helper
 * guards the cheap format checks and keeps the comparison logic in one
 * place for the future non-mock provider path.
 */
export function otpMatches(given: string, stored: string): boolean {
  if (!isValidOtpFormat(given) || !isValidOtpFormat(stored)) {
    return false;
  }
  return given === stored;
}