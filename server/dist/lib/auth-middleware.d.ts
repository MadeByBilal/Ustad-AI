import type { Request, Response, NextFunction } from "express";
import { type UserDoc } from "../models/index.js";
export interface SessionUser {
    user: UserDoc & {
        _id: unknown;
    };
    token: string;
}
/**
 * Express middleware that attaches session user to req.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 */
export declare function getSessionUser(req: Request): Promise<SessionUser | null>;
export type AllowedRole = "customer" | "worker" | "admin";
/**
 * Express middleware: requires one of the allowed roles.
 * Attaches sessionUser to res.locals for downstream handlers.
 */
export declare function requireRole(roles: AllowedRole[]): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth-middleware.d.ts.map