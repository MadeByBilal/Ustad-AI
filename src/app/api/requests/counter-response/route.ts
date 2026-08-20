import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { respondToCounter, RequestError } from "@/lib/job/requests";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  offer_id: z.string().min(1),
  action: z.enum(["accept", "decline"]),
});

/**
 * Customer responds to a worker's counter-offer: accept or decline.
 */
export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await respondToCounter(
      String(sessionUser.user._id),
      parsed.data.offer_id,
      { action: parsed.data.action }
    );
    return ok(result);
  } catch (e) {
    if (e instanceof RequestError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("respondToCounter failed:", e);
    return fail("Internal error", 500);
  }
}
