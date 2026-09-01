export function ok(data, status = 200) {
    return (res) => res.status(status).json({ success: true, data });
}
export function fail(res, message, status = 400, details, code, message_ur) {
    const errorCode = code ?? message.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    return res.status(status).json({
        success: false,
        error: {
            code: errorCode,
            message,
            message_ur: message_ur ?? message,
        },
        ...(details ? { details } : {}),
    });
}
/**
 * Maps internal auth errors to the correct HTTP status so route handlers
 * don't re-implement role checks.
 */
export function authError(res, e) {
    if (e instanceof Error) {
        if (e.message === "AUTH_REQUIRED") {
            return fail(res, "Not authenticated", 401, undefined, "auth_required", "لاگ ان ضروری ہے");
        }
        if (e.message === "ROLE_FORBIDDEN") {
            return fail(res, "Not allowed for this role", 403, undefined, "role_forbidden", "اس کردار کی اجازت نہیں ہے");
        }
    }
    return fail(res, "Internal error", 500, undefined, "internal_error", "اندرونی خرابی ہوئی ہے");
}
//# sourceMappingURL=api.js.map