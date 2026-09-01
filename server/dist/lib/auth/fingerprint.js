import { createHash } from "node:crypto";
/**
 * Deterministic fingerprint of the browser's user agent + IP for the mock
 * session. Not a security control - just useful logging metadata. Lives in
 * its own module because node:crypto must stay out of the Edge bundle.
 */
export function fingerprint(userAgent, ip) {
    return createHash("sha256")
        .update(`${userAgent}|${ip}`)
        .digest("hex")
        .slice(0, 16);
}
//# sourceMappingURL=fingerprint.js.map