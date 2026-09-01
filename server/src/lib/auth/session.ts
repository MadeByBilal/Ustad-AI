/**
 * Session helpers with zero Node-only imports so this module can be
 * bundled into the Edge runtime (middleware). Uses the Web Crypto API
 * available in Node 18+, Edge and browsers.
 */

export const SESSION_COOKIE_NAME = "ustad_session";
export const SESSION_TTL_DAYS = 30;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createSessionToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function createSessionId(): string {
  return globalThis.crypto.randomUUID();
}

export function isSessionTokenValid(token: string | null | undefined): boolean {
  if (!token) return false;
  return /^[a-f0-9]{64}$/.test(token);
}

export function isSessionExpired(
  expiresAt: Date,
  now: Date = new Date()
): boolean {
  return expiresAt.getTime() <= now.getTime();
}
