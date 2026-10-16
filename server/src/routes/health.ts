import { Router, type Request, type Response } from "express";

const router = Router();

const healthHandler = (_req: Request, res: Response) => {
  return res.json({ status: "ok", message: "Server is running" });
};

// Plain path for infra/deploy health checks, /api/health for the app surface.
router.get("/health", healthHandler);
router.get("/api/health", healthHandler);

export { router as healthRoutes };
