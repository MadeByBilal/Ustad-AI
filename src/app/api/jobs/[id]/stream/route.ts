import { NextRequest } from "next/server";
import { connectDB } from "@/server/lib/mongodb";
import { authError, fail } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError } from "@/server/lib/job/flow";
import { createJobStream } from "@/server/lib/job/stream";
import { Worker } from "@/server/models";

export const dynamic = "force-dynamic";

/**
 * Server-sent events for a job. Customers (the owner) and workers
 * (broadcasting / responded / selected) receive `job_event`, `message` and
 * `heartbeat` events in real time so status updates and chat messages
 * arrive without polling. Callers should set `onerror` to reconnect.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer", "worker"]);
  } catch (e) {
    return authError(e);
  }

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  try {
    await connectDB();
    let userId = String(sessionUser.user._id);
    let role: "customer" | "worker" = "customer";
    if (sessionUser.user.role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail("Worker profile not found for this account", 404);
      }
      userId = String(worker._id);
      role = "worker";
    }

    const stream = await createJobStream(jobId, userId, role, req.signal);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("stream failed:", e);
    return fail("Internal error", 500);
  }
}