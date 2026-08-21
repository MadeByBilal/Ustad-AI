import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { fail, ok } from "@/lib/api";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionToken,
} from "@/lib/auth/session";
import { fingerprint } from "@/lib/auth/fingerprint";
import { Session, User, Worker, WORKER_CATEGORIES } from "@/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["customer", "worker"]),
  worker: z
    .object({
      category: z.enum(WORKER_CATEGORIES),
      skills: z.array(z.string().trim().min(1)).min(1, "Pick at least one skill"),
    })
    .optional(),
});

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/**
 * Email + password sign-up. Creates the user with a scrypt-hashed password
 * and, for technicians, a minimal worker profile (category + skills) so
 * they are discoverable by voice matching immediately. A session cookie is
 * issued right away — sign-up doubles as sign-in.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
    }

    const { name, role } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const strength = validatePasswordStrength(parsed.data.password);
    if (!strength.valid) {
      return fail(strength.reason ?? "Weak password", 422);
    }

    if (role === "worker" && !parsed.data.worker) {
      return fail("Technicians must pick a category and at least one skill", 400);
    }

    await connectDB();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return fail("An account with this email already exists", 409);
    }

    const user = await User.create({
      role,
      name,
      email,
      password_hash: hashPassword(parsed.data.password),
    });

    if (role === "worker" && parsed.data.worker) {
      await Worker.create({
        user_id: user._id,
        name,
        category: parsed.data.worker.category,
        skills: parsed.data.worker.skills,
        verified: false,
        is_online: false,
        is_available: true,
        // Default location in Karachi — workers update via LocationUpdater
        location: { type: "Point", coordinates: [67.0011, 24.8607] },
        service_area: {
          type: "Polygon",
          coordinates: [
            [
              [66.94, 24.80],
              [67.06, 24.80],
              [67.06, 24.92],
              [66.94, 24.92],
              [66.94, 24.80],
            ],
          ],
        },
      });
    }

    const token = createSessionToken();
    const userAgent = req.headers.get("user-agent") ?? "";
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    await Session.create({
      token,
      user_id: user._id,
      role: user.role,
      fingerprint: fingerprint(userAgent, ip),
      expires_at: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    const response = ok(
      { user: { id: user._id, role: user.role, name: user.name, email: user.email } },
      201
    );
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("[auth/signup] error:", error);
    return fail("Internal error", 500);
  }
}
