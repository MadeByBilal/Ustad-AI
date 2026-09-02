import { Router } from "express";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import {
  SESSION_COOKIE_NAME,
  isSessionExpired,
  isSessionTokenValid,
} from "../../lib/auth/session.js";
import { Session } from "../../models/index.js";

const router = Router();

router.get("/session", handleSession);
router.get("/me", handleSession);

async function handleSession(req: any, res: any) {
  try {
    const token =
      req.cookies?.[SESSION_COOKIE_NAME] ??
      req.headers.authorization?.replace("Bearer ", "");

    if (!isSessionTokenValid(token)) {
      return ok({ user: null })(res);
    }

    await connectDB();
    const session = await Session.findOne({ token })
      .populate("user_id")
      .lean();

    if (!session || isSessionExpired(session.expires_at)) {
      return ok({ user: null })(res);
    }

    const user = session.user_id as unknown as {
      _id: unknown;
      role: string;
      name?: string;
      email: string;
      language: string;
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
