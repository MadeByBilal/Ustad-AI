import { connectDB } from "./mongodb.js";
import { SESSION_COOKIE_NAME, isSessionExpired, isSessionTokenValid, } from "./auth/session.js";
import { Session } from "../models/index.js";
/**
 * Express middleware that attaches session user to req.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 */
export async function getSessionUser(req) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : req.cookies?.[SESSION_COOKIE_NAME];
    if (!isSessionTokenValid(token)) {
        return null;
    }
    await connectDB();
    const session = await Session.findOne({ token })
        .populate("user_id")
        .lean();
    if (!session || isSessionExpired(session.expires_at)) {
        return null;
    }
    const user = session.user_id;
    if (!user) {
        return null;
    }
    return { user, token: token };
}
/**
 * Express middleware: requires one of the allowed roles.
 * Attaches sessionUser to res.locals for downstream handlers.
 */
export function requireRole(roles) {
    return async (req, res, next) => {
        try {
            const session = await getSessionUser(req);
            if (!session) {
                return fail(res, "Not authenticated", 401, undefined, "auth_required");
            }
            if (!roles.includes(session.user.role)) {
                return fail(res, "Not allowed for this role", 403, undefined, "role_forbidden");
            }
            res.locals.sessionUser = session;
            next();
        }
        catch {
            return fail(res, "Internal error", 500);
        }
    };
}
function fail(res, message, status, details, code) {
    const errorCode = code ?? message.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    return res.status(status).json({
        success: false,
        error: { code: errorCode, message },
        ...(details ? { details } : {}),
    });
}
//# sourceMappingURL=auth-middleware.js.map