import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { FlowError, workerCancelJob, customerCancelJob } from "@/lib/job/flow";
import { Worker } from "@/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/**
 * Worker or customer cancels a job. The job is closed, the worker
 * (if assigned) is released back to availability.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker", "customer"]);
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

  const role = sessionUser.user.role as string;

  try {
    if (role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail("Worker profile not found for this account", 404);
      }
      const job = await workerCancelJob(jobId, String(worker._id), parsed.data.reason);
      return ok(job);
    } else {
      const job = await customerCancelJob(jobId, String(sessionUser.user._id), parsed.data.reason);
      return ok(job);
    }
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("cancel failed:", e);
    return fail("Internal error", 500);
  }
}
