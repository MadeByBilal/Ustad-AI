import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { FlowError, workerAttachPhoto } from "@/lib/job/flow";
import { Worker } from "@/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.enum(["before", "after"]),
  photo_id: z.string().min(1),
  note: z.string().trim().max(300).optional(),
});

/**
 * Attaches a before/after photo (and optional work note) to the active
 * job's completion record. The photo itself is uploaded first via
 * /api/workers/me/photos.
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

    const job = await workerAttachPhoto(jobId, String(worker._id), parsed.data);
    return ok(job, 201);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("media attach failed:", e);
    return fail("Internal error", 500);
  }
}