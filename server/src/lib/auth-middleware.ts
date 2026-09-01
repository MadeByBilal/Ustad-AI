import type { Request, Response, NextFunction } from "express";
import { connectDB } from "./mongodb.js";
import {
  SESSION_COOKIE_NAME,
  isSessionExpired,
  isSessionTokenValid,
} from "./auth/session.js";
import { Session, type UserDoc } from "../models/index.js";

export interface SessionUser {
  user: UserDoc & { _id: unknown };
  token: string;
}

/**
 * Express middleware that attaches session user to req.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies?.[SESSION_COOKIE_NAME];

  if (!isSessionTokenValid(token)) {
    return null;
  }

  await connectDB();
  const session = await Session.findOne({ token })
    .populate<{ user_id: UserDoc & { _id: unknown } }>("user_id")
    .lean();

  if (!session || isSessionExpired(session.expires_at)) {
    return null;
  }

  const user = session.user_id as unknown as UserDoc & { _id: unknown } | null;
  if (!user) {
    return null;
  }

  return { user, token: token as string };
}

export type AllowedRole = "customer" | "worker" | "admin";

/**
 * Express middleware: requires one of the allowed roles.
 * Attaches sessionUser to res.locals for downstream handlers.
 */
export function requireRole(roles: AllowedRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await getSessionUser(req);
      if (!session) {
        return fail(res, "Not authenticated", 401, undefined, "auth_required");
      }
      if (!roles.includes(session.user.role as AllowedRole)) {
        return fail(res, "Not allowed for this role", 403, undefined, "role_forbidden");
      }
      res.locals.sessionUser = session;
      next();
    } catch {
      return fail(res, "Internal error", 500);
    }
  };
}

function fail(
  res: Response,
  message: string,
  status: number,
  details?: unknown,
  code?: string
) {
  const errorCode = code ?? message.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return res.status(status).json({
    success: false,
    error: { code: errorCode, message },
    ...(details ? { details } : {}),
  });
}
