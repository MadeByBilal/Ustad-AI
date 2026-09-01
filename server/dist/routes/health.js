import { Router } from "express";
const router = Router();
router.get("/health", (_req, res) => {
    return res.json({ status: "ok", message: "Server is running" });
});
export { router as healthRoutes };
//# sourceMappingURL=health.js.map