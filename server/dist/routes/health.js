import { Router } from "express";
import { connectDB, isDbConnected } from "../lib/mongodb.js";
const router = Router();
/**
 * GET /health — health check returning { ok, db }.
 */
router.get("/health", async (req, res) => {
    try {
        await connectDB();
        return res.json({
            ok: true,
            db: isDbConnected() ? "connected" : "connecting",
        });
    }
    catch (error) {
        return res.status(500).json({
            ok: false,
            db: "error",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
export { router as healthRoutes };
//# sourceMappingURL=health.js.map