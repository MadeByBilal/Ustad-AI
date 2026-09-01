/**
 * Session helpers with zero Node-only imports so this module can be
 * bundled into the Edge runtime (middleware). Uses the Web Crypto API
 * available in Node 18+, Edge and browsers.
 */
export declare const SESSION_COOKIE_NAME = "ustad_session";
export declare const SESSION_TTL_DAYS = 30;
export declare function createSessionToken(): string;
export declare function createSessionId(): string;
export declare function isSessionTokenValid(token: string | null | undefined): boolean;
export declare function isSessionExpired(expiresAt: Date, now?: Date): boolean;
//# sourceMappingURL=session.d.ts.map