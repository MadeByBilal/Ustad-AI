import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { fail, ok } from "@/lib/api";
import {
  OTP_TTL_SECONDS,
  generateOtp,
  hashOtp,
  isValidPakistaniPhone,
  normalizePhone,
} from "@/lib/auth/otp";
import { User, USER_ROLES, type UserRole } from "@/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  role: z.enum(USER_ROLES).optional(),
});

/**
 * Mock OTP request. When MOCK_OTP_ENABLED=true the generated OTP is
 * returned in the response so the demo can auto-approve. The OTP is
 * stored hashed (sha256 salted with the phone) with a 5-minute TTL.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!isValidPakistaniPhone(phone)) {
    return fail("Enter a valid Pakistani mobile number (03XXXXXXXXX)", 422);
  }

  await connectDB();

  const otp = generateOtp();
  const role = parsed.data.role as UserRole | undefined;

  const result = (await User.findOneAndUpdate(
    { phone },
    {
      $set: {
        otp_hash: hashOtp(otp, phone),
        otp_expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      },
      $setOnInsert: {
        phone,
        role: role ?? "customer",
        language: "ur",
      },
    },
    { upsert: true, new: true, rawResult: true }
  )) as unknown as {
    value: { _id: unknown } | null;
    lastErrorObject?: { upserted?: unknown } | null;
  };

  const isNewUser = Boolean(result.lastErrorObject?.upserted);

  const mockEnabled = process.env.MOCK_OTP_ENABLED === "true";

  return ok({
    phone,
    otp_expires_in_seconds: OTP_TTL_SECONDS,
    is_new_user: isNewUser,
    ...(mockEnabled ? { mock_otp: otp } : {}),
  });
}