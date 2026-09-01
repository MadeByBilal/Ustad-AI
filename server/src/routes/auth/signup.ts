import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { hashPassword, validatePasswordStrength } from "../../lib/auth/password.js";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionToken,
} from "../../lib/auth/session.js";
import { fingerprint } from "../../lib/auth/fingerprint.js";
import { Session, User } from "../../models/index.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1, "Name is required").max(100),
  role: z.enum(["customer", "worker"]).default("customer"),
  language: z.enum(["en", "ur"]).default("en"),
});

router.post("/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
    }

    const strength = validatePasswordStrength(parsed.data.password);
    if (!strength.valid) {
      return fail(res, strength.reason!, 400);
    }

    const email = parsed.data.email.trim().toLowerCase();
    await connectDB();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return fail(res, "Email already registered", 409);
    }

    const password_hash = hashPassword(parsed.data.password);
    const user = await User.create({
      email,
      password_hash,
      name: parsed.data.name,
      role: parsed.data.role,
      language: parsed.data.language,
    });

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
    }, 201)(res);
  } catch (error) {
    console.error("[auth/signup] error:", error);
    return fail(res, "Internal error", 500);
  }
});

export { router as signupRoutes };
