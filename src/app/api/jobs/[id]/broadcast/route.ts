import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError, submitOfferAndBroadcast } from "@/server/lib/job/flow";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  offer_rs: z.coerce.number().int().min(0).nullable().optional(),
});

/**
 * Broadcasts a confirmed job to eligible workers. Normal jobs require a
 * customer offer; emergency jobs may omit it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return fail("Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const broadcast = await submitOfferAndBroadcast(
      jobId,
      String(sessionUser.user._id),
      parsed.data.offer_rs ?? null
    );
    return ok({
      job: broadcast.job,
      broadcast_id: broadcast.broadcast_id,
      eligible_workers_count: broadcast.eligible_workers_count,
      acceptance_deadline: broadcast.acceptance_deadline,
    });
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("broadcast failed:", e);
    return fail("Internal error", 500);
  }
}