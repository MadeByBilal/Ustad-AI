import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
/**
 * Password hashing with scrypt (built into Node — no native dependency).
 * Stored format: scrypt$N$r$p$saltHex$hashHex so parameters travel with
 * the hash and can be tuned later without invalidating old passwords.
 */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
export const PASSWORD_MIN_LENGTH = 8;
export function hashPassword(password) {
    const salt = randomBytes(SALT_BYTES);
    const derived = scryptSync(password, salt, KEY_LENGTH, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
    });
    return [
        "scrypt",
        String(SCRYPT_N),
        String(SCRYPT_R),
        String(SCRYPT_P),
        salt.toString("hex"),
        derived.toString("hex"),
    ].join("$");
}
export function verifyPassword(password, stored) {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") {
        return false;
    }
    const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
        return false;
    }
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length === 0) {
        return false;
    }
    let actual;
    try {
        actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, {
            N,
            r,
            p,
        });
    }
    catch {
        return false;
    }
    return timingSafeEqual(actual, expected);
}
/** Minimum bar: 8+ characters with at least one letter and one number. */
export function validatePasswordStrength(password) {
    if (password.length < PASSWORD_MIN_LENGTH) {
        return {
            valid: false,
            reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        };
    }
    if (!/[a-zA-Z]/.test(password)) {
        return { valid: false, reason: "Password must contain at least one letter" };
    }
    if (!/\d/.test(password)) {
        return { valid: false, reason: "Password must contain at least one number" };
    }
    return { valid: true };
}
//# sourceMappingURL=password.js.map