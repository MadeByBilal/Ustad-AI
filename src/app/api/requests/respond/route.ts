import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { respondToDirectRequest, RequestError } from "@/lib/job/requests";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  offer_id: z.string().min(1),
  action: z.enum(["accept", "counter_offer", "decline"]),
  counter_price: z.number().positive().optional(),
  message: z.string().max(500).optional(),
});

/**
 * Worker responds to a direct customer request: accept, counter-offer, or decline.
 */
export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker"]);
  } catch (e) {
    return authError(e);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  if (parsed.data.action === "counter_offer" && !parsed.data.counter_price) {
    return fail("counter_price is required for counter-offers", 400);
  }

  try {
    const result = await respondToDirectRequest(
      String(sessionUser.user._id),
      parsed.data.offer_id,
      {
        action: parsed.data.action,
        counter_price: parsed.data.counter_price,
        message: parsed.data.message,
      }
    );
    return ok(result);
  } catch (e) {
    if (e instanceof RequestError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("respondToDirectRequest failed:", e);
    return fail("Internal error", 500);
  }
}
