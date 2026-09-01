import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { verifyPassword } from "../../lib/auth/password.js";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionToken,
} from "../../lib/auth/session.js";
import { fingerprint } from "../../lib/auth/fingerprint.js";
import { Session, User } from "../../models/index.js";

const router = Router();

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const INVALID_CREDENTIALS = "Invalid email or password";

router.post("/signin", async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
    }

    const email = parsed.data.email.trim().toLowerCase();
    await connectDB();

    const user = await User.findOne({ email })
      .select("+password_hash")
      .lean();

    if (
      !user ||
      typeof user.password_hash !== "string" ||
      !verifyPassword(parsed.data.password, user.password_hash)
    ) {
      return fail(res, INVALID_CREDENTIALS, 401);
    }

    const token = createSessionToken();
    const userAgent = req.headers["user-agent"] ?? "";
    const ip = (req.headers["x-forwarded-for"] as string) ?? "local";
    await Session.create({
      token,
      user_id: user._id,
      role: user.role,
      fingerprint: fingerprint(userAgent, ip),
      expires_at: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    });

    return ok({
      user: { id: user._id, role: user.role, name: user.name, email: user.email },
    })(res);
  } catch (error) {
    console.error("[auth/signin] error:", error);
    return fail(res, "Internal error", 500);
  }
});

export { router as signinRoutes };
