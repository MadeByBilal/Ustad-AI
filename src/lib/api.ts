import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * Maps internal auth errors to the correct HTTP status so route handlers
 * don't re-implement role checks.
 */
export function authError(e: unknown) {
  if (e instanceof Error) {
    if (e.message === "AUTH_REQUIRED") {
      return fail("Not authenticated", 401);
    }
    if (e.message === "ROLE_FORBIDDEN") {
      return fail("Not allowed for this role", 403);
    }
  }
  return fail("Internal error", 500);
}