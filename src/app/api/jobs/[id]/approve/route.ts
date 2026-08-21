import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Job, JobEvent, Message, Worker, SYSTEM_SENDER_ID } from "@/models";
import { canTransition } from "@/lib/job/state-machine";
import { WORKER_SCORE_COMPLETION_REWARD } from "@/lib/job/flow";

const bodySchema = z.object({
  action: z.enum(["approve", "dispute"]),
  note: z.string().max(500).optional(),
});

export const dynamic = "force-dynamic";

/**
 * Customer approves or disputes completed work.
 * AWAITING_CUSTOMER_CONFIRMATION -> COMPLETED (approve) or DISPUTED (dispute).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  try {
    const { id: jobId } = await params;
    if (!jobId) {
      return fail("Job id is required", 400);
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
    }

    await connectDB();

    const job = await Job.findOne({ _id: jobId, customer_id: sessionUser.user._id });
    if (!job) {
      return fail("Job not found", 404);
    }

    if (job.status !== "AWAITING_CUSTOMER_CONFIRMATION") {
      return fail("Job is not awaiting confirmation", 409);
    }

    const targetStatus = parsed.data.action === "approve" ? "COMPLETED" : "DISPUTED";

    if (!canTransition("AWAITING_CUSTOMER_CONFIRMATION", targetStatus, "customer")) {
      return fail(`Cannot ${parsed.data.action} from current status`, 409);
    }

    const updated = await Job.findOneAndUpdate(
      { _id: jobId, status: "AWAITING_CUSTOMER_CONFIRMATION" },
      {
        $set: {
          status: targetStatus,
          "completion.customer_confirmed": parsed.data.action === "approve",
        },
      },
      { new: true }
    );

    if (!updated) {
      return fail("Job status changed concurrently", 409);
    }

    // Record event
    await JobEvent.create({
      job_id: jobId,
      from_state: "AWAITING_CUSTOMER_CONFIRMATION",
      to_state: targetStatus,
      actor_id: String(sessionUser.user._id),
      actor_type: "customer",
      metadata: { action: parsed.data.action, note: parsed.data.note ?? null },
    });

    // System message
    const messageContent =
      parsed.data.action === "approve"
        ? "Work approved by customer — job completed"
        : `Work disputed by customer${parsed.data.note ? `: ${parsed.data.note}` : ""}`;
    await Message.create({
      job_id: jobId,
      sender_id: SYSTEM_SENDER_ID,
      sender_type: "system",
      content: messageContent,
    });

    // Release worker if completed
    if (targetStatus === "COMPLETED" && job.matching?.selected_worker_id) {
      const workerId = job.matching.selected_worker_id;
      const releasedWorker = await Worker.findOneAndUpdate(
        { _id: workerId, active_job_id: jobId },
        {
          $set: { active_job_id: null, is_available: true },
          $inc: {
            completed_jobs: 1,
            ustad_score: WORKER_SCORE_COMPLETION_REWARD,
          },
        },
        { new: true }
      );
      if (releasedWorker && releasedWorker.ustad_score > 100) {
        await Worker.updateOne({ _id: workerId }, { $set: { ustad_score: 100 } });
      }
      if (parsed.data.action === "approve") {
        await Worker.findOneAndUpdate(
          { _id: workerId },
          { $inc: { confirmed_jobs: 1 } }
        );
      }
    }

    return ok(updated);
  } catch (error) {
    console.error("[jobs/approve] error:", error);
    return fail("Internal error", 500);
  }
}
