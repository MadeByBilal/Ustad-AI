import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/server/lib/mongodb";
import { fail, ok } from "@/server/lib/api";
import { verifyPassword } from "@/server/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionToken,
} from "@/server/lib/auth/session";
import { fingerprint } from "@/server/lib/auth/fingerprint";
import { Session, User } from "@/server/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const INVALID_CREDENTIALS = "Invalid email or password";

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
 * Email + password sign-in. Uses a single generic error for unknown emails
 * and wrong passwords so the endpoint cannot be used to enumerate accounts.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
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
      return fail(INVALID_CREDENTIALS, 401);
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

    const response = ok({
      user: { id: user._id, role: user.role, name: user.name, email: user.email },
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("[auth/signin] error:", error);
    return fail("Internal error", 500);
  }
}
