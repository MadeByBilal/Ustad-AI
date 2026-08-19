import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Lightweight gate for protected areas: redirects to /login when the
 * session cookie is missing. Full role checks happen server-side in the
 * page/API layers where the database is reachable.
 */
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    if (req.nextUrl.pathname.startsWith("/dashboard")) {
      loginUrl.searchParams.set("next", req.nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};