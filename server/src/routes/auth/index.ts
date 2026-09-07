import { Router } from "express";
import { signinRoutes } from "./signin.js";
import { sessionRoutes } from "./session.js";
import { logoutRoutes } from "./logout.js";
import { signupRoutes } from "./signup.js";
import { profileRoutes } from "./profile.js";

const router = Router();

router.use(signinRoutes);
router.use(sessionRoutes);
router.use(logoutRoutes);
router.use(signupRoutes);
router.use(profileRoutes);

export { router as authRoutes };
