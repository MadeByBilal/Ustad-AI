import type { Response } from "express";
export interface ApiError {
    code: string;
    message: string;
    message_ur: string;
}
export declare function ok<T>(data: T, status?: number): (res: Response) => Response<any, Record<string, any>>;
export declare function fail(res: Response, message: string, status?: number, details?: unknown, code?: string, message_ur?: string): Response<any, Record<string, any>>;
/**
 * Maps internal auth errors to the correct HTTP status so route handlers
 * don't re-implement role checks.
 */
export declare function authError(res: Response, e: unknown): Response<any, Record<string, any>>;
//# sourceMappingURL=api.d.ts.map