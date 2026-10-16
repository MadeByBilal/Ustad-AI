import { Router } from "express";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import {
  SESSION_COOKIE_NAME,
  isSessionExpired,
  isSessionTokenValid,
  sessionTtlMs,
} from "../../lib/auth/session.js";
import { clearSessionCookie, sessionCookieOptions } from "../../lib/auth/cookie.js";
import { Session } from "../../models/index.js";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

router.get("/session", handleSession);
router.get("/me", handleSession);

async function handleSession(req: any, res: any) {
  try {
    const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
    const token =
      cookieToken ??
      req.headers.authorization?.replace("Bearer ", "");

    if (!isSessionTokenValid(token)) {
      if (cookieToken) clearSessionCookie(res);
      return ok({ user: null })(res);
    }

    await connectDB();
    const session = await Session.findOne({ token })
      .populate("user_id")
      .lean();

    if (!session || isSessionExpired(session.expires_at)) {
      // Stale cookie: remove it so the middleware and the UI agree the
      // session is gone instead of bouncing the user between pages.
      if (session) await Session.deleteOne({ _id: session._id });
      if (cookieToken) clearSessionCookie(res);
      return ok({ user: null })(res);
    }

    // Sliding expiry: stay signed in as long as the app is used. Refresh at
    // most once a day per session to avoid a write on every request.
    const ttl = sessionTtlMs();
    if (session.expires_at.getTime() - Date.now() < ttl - DAY_MS) {
      await Session.updateOne(
        { _id: session._id },
        { $set: { expires_at: new Date(Date.now() + ttl) } },
      );
      if (cookieToken) {
        res.cookie(SESSION_COOKIE_NAME, cookieToken, sessionCookieOptions(req));
      }
    }

    const user = session.user_id as unknown as {
      _id: unknown;
      role: string;
      name?: string;
      email: string;
      language: string;
      profile_image?: string | null;
      stats?: {
        average_rating?: number;
        reviews_count?: number;
        trust_score?: number;
        cancellations?: number;
      };
    };

    return ok({
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        language: user.language,
        profile_image: user.profile_image ?? null,
        stats: {
          average_rating: user.stats?.average_rating ?? 5.0,
          reviews_count: user.stats?.reviews_count ?? 0,
          trust_score: user.stats?.trust_score ?? 100,
          cancellations: user.stats?.cancellations ?? 0,
        },
      },
    })(res);
  } catch (error) {
    console.error("[auth/session] error:", error);
    return fail(res, "Internal error", 500);
  }
}

export { router as sessionRoutes };
