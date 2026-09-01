export declare const PASSWORD_MIN_LENGTH = 8;
export declare function hashPassword(password: string): string;
export declare function verifyPassword(password: string, stored: string): boolean;
export interface PasswordStrength {
    valid: boolean;
    reason?: string;
}
/** Minimum bar: 8+ characters with at least one letter and one number. */
export declare function validatePasswordStrength(password: string): PasswordStrength;
//# sourceMappingURL=password.d.ts.map