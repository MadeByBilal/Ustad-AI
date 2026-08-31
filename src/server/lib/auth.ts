import { cookies, headers } from "next/headers";
import { connectDB } from "@/server/lib/mongodb";
import {
  SESSION_COOKIE_NAME,
  isSessionExpired,
  isSessionTokenValid,
} from "@/server/lib/auth/session";
import { Session, type UserDoc } from "@/server/models";

export interface SessionUser {
  user: UserDoc & { _id: unknown };
  token: string;
}

/**
 * Server-side session lookup shared by pages and API routes.
 * Returns null when the cookie is missing, malformed, expired or the
 * session record no longer exists.
 *
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookies().get(SESSION_COOKIE_NAME)?.value;
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
 * Throws when the current session user does not have one of the allowed
 * roles. Pages catch this via `redirect("/login")` or notFound().
 */
export async function requireRole(
  roles: AllowedRole[]
): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    throw new Error("AUTH_REQUIRED");
  }
  if (!roles.includes(session.user.role as AllowedRole)) {
    throw new Error("ROLE_FORBIDDEN");
  }
  return session;
}