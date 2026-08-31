import { NextRequest } from "next/server";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError } from "@/server/lib/job/flow";
import { getWorkerDashboard } from "@/server/lib/worker/dashboard";
import { Worker } from "@/server/models";

export const dynamic = "force-dynamic";

/**
 * Worker dashboard payload: profile + stats, availability, the active job
 * and the broadcasting jobs the worker can respond to. The worker profile
 * is resolved from the session and must match the requested id.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker"]);
  } catch (e) {
    return authError(e);
  }

  const workerId = params.id.trim();
  if (!workerId) {
    return fail("Worker id is required", 400);
  }

  try {
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail("Worker profile not found for this account", 404);
    }
    if (String(worker._id) !== workerId) {
      return fail("Worker not found", 404);
    }

    const data = await getWorkerDashboard(workerId);
    return ok(data);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("worker dashboard failed:", e);
    return fail("Internal error", 500);
  }
}