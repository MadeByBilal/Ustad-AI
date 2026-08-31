import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError, customerSelectWorker } from "@/server/lib/job/flow";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  worker_id: z.string().min(1),
});

/** Customer picks one of the responding workers; the job becomes ACCEPTED. */
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
    const job = await customerSelectWorker(
      jobId,
      String(sessionUser.user._id),
      parsed.data.worker_id
    );
    return ok(job);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("select-worker failed:", e);
    return fail("Internal error", 500);
  }
}