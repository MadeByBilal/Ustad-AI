import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { FlowError, customerRejectWorker } from "@/lib/job/flow";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  worker_id: z.string().min(1),
  action: z.enum(["close", "rebroadcast"]).optional(),
});

/**
 * Customer rejects a worker's offer (counter-offer or accept). The job is
 * either closed or returned to READY_TO_MATCH for a fresh broadcast, and
 * the rejected worker is released back to availability.
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
    const job = await customerRejectWorker(
      jobId,
      String(sessionUser.user._id),
      parsed.data.worker_id,
      parsed.data.action
    );
    return ok(job);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("reject-offer failed:", e);
    return fail("Internal error", 500);
  }
}