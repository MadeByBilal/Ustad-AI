/**
 * Deterministic fingerprint of the browser's user agent + IP for the mock
 * session. Not a security control - just useful logging metadata. Lives in
 * its own module because node:crypto must stay out of the Edge bundle.
 */
export declare function fingerprint(userAgent: string, ip: string): string;
//# sourceMappingURL=fingerprint.d.ts.map