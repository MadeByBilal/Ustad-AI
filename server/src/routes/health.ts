import { Router, type Request, type Response } from "express";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  return res.json({ status: "ok", message: "Server is running" });
});

export { router as healthRoutes };
