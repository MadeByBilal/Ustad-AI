import { NextRequest } from "next/server";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { FlowError, confirmJobDetails } from "@/lib/job/flow";

export const dynamic = "force-dynamic";

/**
 * Customer confirms the analyzed summary ("Sab theek hai") so the job
 * becomes matchable at READY_TO_MATCH.
 */
export async function POST(
  _req: NextRequest,
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

  try {
    const job = await confirmJobDetails(jobId, String(sessionUser.user._id));
    return ok(job);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("confirm failed:", e);
    return fail("Internal error", 500);
  }
}