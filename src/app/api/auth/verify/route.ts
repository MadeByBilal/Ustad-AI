import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { fail, ok } from "@/lib/api";
import {
  hashOtp,
  isValidOtpFormat,
  isValidPakistaniPhone,
  normalizePhone,
} from "@/lib/auth/otp";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionToken,
} from "@/lib/auth/session";
import { fingerprint } from "@/lib/auth/fingerprint";
import { Session, User } from "@/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  otp: z.string().min(1, "OTP is required"),
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
 * Verifies the OTP, creates a server-side session record and issues an
 * httpOnly cookie. Roles are enforced by the session record, so the
 * cookie itself carries no user data.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  const phone = normalizePhone(parsed.data.phone);
  const { otp } = parsed.data;

  if (!isValidPakistaniPhone(phone)) {
    return fail("Enter a valid Pakistani mobile number (03XXXXXXXXX)", 422);
  }
  if (!isValidOtpFormat(otp)) {
    return fail("OTP must be six digits", 422);
  }

  await connectDB();

  const user = await User.findOne({ phone })
    .select("+otp_hash +otp_expires_at")
    .lean();

  if (!user || !user.otp_hash || !user.otp_expires_at) {
    return fail("No OTP was requested for this number. Request one first.", 404);
  }

  if (user.otp_expires_at.getTime() < Date.now()) {
    return fail("OTP expired. Request a new one.", 410);
  }

  if (hashOtp(otp, phone) !== user.otp_hash) {
    return fail("Incorrect OTP", 401);
  }

  const token = createSessionToken();
  const userAgent = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for") ?? "local";

  const session = await Session.create({
    token,
    user_id: user._id,
    role: user.role,
    fingerprint: fingerprint(userAgent, ip),
    expires_at: new Date(
      Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    ),
  });

  const response = ok({
    user: { id: user._id, role: user.role, name: user.name, phone: user.phone },
    session_id: session._id,
  });
  setSessionCookie(response, token);
  return response;
}