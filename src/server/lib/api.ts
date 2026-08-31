import { NextResponse } from "next/server";

export interface ApiError {
  code: string;
  message: string;
  message_ur: string;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(
  message: string,
  status = 400,
  details?: unknown,
  code?: string,
  message_ur?: string
) {
  const errorCode = code ?? message.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return NextResponse.json(
    {
      success: false,
      error: {
        code: errorCode,
        message,
        message_ur: message_ur ?? message,
      },
      ...(details ? { details } : {}),
    },
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
      return fail("Not authenticated", 401, undefined, "auth_required", "لاگ ان ضروری ہے");
    }
    if (e.message === "ROLE_FORBIDDEN") {
      return fail("Not allowed for this role", 403, undefined, "role_forbidden", "اس کردار کی اجازت نہیں ہے");
    }
  }
  return fail("Internal error", 500, undefined, "internal_error", "اندرونی خرابی ہوئی ہے");
}
