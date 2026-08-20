import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ok } from "@/lib/api";
import {
  SESSION_COOKIE_NAME,
  isSessionExpired,
  isSessionTokenValid,
} from "@/lib/auth/session";
import { Session } from "@/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!isSessionTokenValid(token)) {
    return ok({ user: null });
  }

  await connectDB();
  const session = await Session.findOne({ token })
    .populate("user_id")
    .lean();

  if (!session || isSessionExpired(session.expires_at)) {
    return ok({ user: null });
  }

  const user = session.user_id as unknown as {
    _id: unknown;
    role: string;
    name?: string;
    email: string;
    language: string;
  };

  return ok({
    user: {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      language: user.language,
    },
  });
}