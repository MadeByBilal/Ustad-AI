import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/server/lib/mongodb";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError, workerOffer } from "@/server/lib/job/flow";
import { Worker } from "@/server/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  job_id: z.string().min(1),
  type: z.enum(["accept", "counter_offer", "decline"]),
  counter_price: z.number().positive().optional(),
  message: z.string().max(500).optional(),
});

/**
 * Worker responds to a broadcast: accept, counter offer, or decline. The
 * worker profile is resolved from the session user.
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
  if (parsed.data.type === "counter_offer" && parsed.data.counter_price == null) {
    return fail("counter_price is required for counter offers", 400);
  }

  try {
    await connectDB();
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail("Worker profile not found for this account", 404);
    }

    const result = await workerOffer(
      parsed.data.job_id,
      String(worker._id),
      {
        type: parsed.data.type,
        counter_price: parsed.data.counter_price,
        message: parsed.data.message,
      },
      new Date()
    );
    return ok(result, 201);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("offer failed:", e);
    return fail("Internal error", 500);
  }
}