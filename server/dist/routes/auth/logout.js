import { Router } from "express";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { SESSION_COOKIE_NAME } from "../../lib/auth/session.js";
import { Session } from "../../models/index.js";
const router = Router();
router.post("/logout", async (req, res) => {
    try {
        const token = req.cookies?.[SESSION_COOKIE_NAME] ??
            req.headers.authorization?.replace("Bearer ", "");
        if (token) {
            await connectDB();
            await Session.deleteOne({ token });
        }
        res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
        return ok({})(res);
    }
    catch (error) {
        console.error("[auth/logout] error:", error);
        return fail(res, "Internal error", 500);
    }
});
export { router as logoutRoutes };
//# sourceMappingURL=logout.js.map