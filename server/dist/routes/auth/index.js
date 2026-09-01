import { Router } from "express";
import { signinRoutes } from "./signin.js";
import { sessionRoutes } from "./session.js";
import { logoutRoutes } from "./logout.js";
import { signupRoutes } from "./signup.js";
const router = Router();
router.use(signinRoutes);
router.use(sessionRoutes);
router.use(logoutRoutes);
router.use(signupRoutes);
export { router as authRoutes };
//# sourceMappingURL=index.js.map