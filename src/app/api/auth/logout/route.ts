import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { fail, ok } from "@/lib/api";
import {
  SESSION_COOKIE_NAME,
  isSessionTokenValid,
} from "@/lib/auth/session";
import { Session } from "@/models";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (isSessionTokenValid(token)) {
      await connectDB();
      await Session.deleteOne({ token });
    }

    const response = ok({ logged_out: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("[auth/logout] error:", error);
    return fail("Internal error", 500);
  }
}
