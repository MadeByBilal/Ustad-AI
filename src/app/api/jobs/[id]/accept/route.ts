import { NextRequest } from "next/server";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { FlowError, workerAcceptJob } from "@/lib/job/flow";
import { Worker } from "@/models";

export const dynamic = "force-dynamic";

/**
 * Worker claims a broadcast job. The worker profile is resolved from the
 * session user so clients never need to know profile ids.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker"]);
  } catch (e) {
    return authError(e);
  }

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  try {
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail("Worker profile not found for this account", 404);
    }

    const job = await workerAcceptJob(jobId, String(worker._id));
    return ok(job);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("accept failed:", e);
    return fail("Internal error", 500);
  }
}