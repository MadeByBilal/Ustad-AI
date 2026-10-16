import type { CookieOptions, Request, Response } from "express";
import { SESSION_COOKIE_NAME, sessionTtlMs } from "./session.js";

/**
 * Session cookie flags derived from the request's actual scheme instead of
 * NODE_ENV alone. A production build served over plain http (local `next
 * start`, LAN testing) must not send a `Secure` cookie — browsers drop those
 * silently, which looks exactly like "logged out every time".
 *
 * Real https (Vercel/Render proxies report x-forwarded-proto) keeps
 * SameSite=None + Secure so the cookie also works when the API is called
 * cross-site; plain http falls back to Lax.
 */
export function sessionCookieOptions(req: Request): CookieOptions {
  const forwarded = (req.headers["x-forwarded-proto"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  const isHttps = req.secure || forwarded === "https";

  return {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    path: "/",
    maxAge: sessionTtlMs(),
  };
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}
