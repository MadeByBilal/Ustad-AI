import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/server/lib/mongodb";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError, workerUpdateJobStatus } from "@/server/lib/job/flow";
import { Worker } from "@/server/models";

export const dynamic = "force-dynamic";

const statusSchema = z.enum([
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "AWAITING_CUSTOMER_CONFIRMATION",
]);

const bodySchema = z.object({
  status: statusSchema,
  note: z.string().max(500).optional(),
});

/**
 * Worker advances their active job through its lifecycle stages. The
 * assigned worker is resolved from the session profile.
 */
export async function POST(
  req: NextRequest,
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

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail("Worker profile not found for this account", 404);
    }

    const job = await workerUpdateJobStatus(
      jobId,
      String(worker._id),
      parsed.data.status,
      parsed.data.note
    );
    return ok(job);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("status update failed:", e);
    return fail("Internal error", 500);
  }
}