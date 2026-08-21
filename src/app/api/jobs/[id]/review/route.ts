import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Job, Review, Worker } from "@/models";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(500).optional(),
});

export const dynamic = "force-dynamic";

/**
 * Customer submits a review for completed work.
 * Creates a Review document and updates the worker's average rating.
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

    const job = await Job.findOne({
      _id: jobId,
      customer_id: sessionUser.user._id,
      status: "COMPLETED",
    });

    if (!job) {
      return fail("Job not found or not completed", 404);
    }

    // Check if review already exists
    const existing = await Review.findOne({ job_id: jobId });
    if (existing) {
      return fail("You already reviewed this job", 409);
    }

    const workerId = job.matching?.selected_worker_id;
    if (!workerId) {
      return fail("No worker assigned to this job", 400);
    }

    // Create review
    const review = await Review.create({
      job_id: jobId,
      customer_id: sessionUser.user._id,
      worker_id: workerId,
      rating: parsed.data.rating,
      text: parsed.data.text ?? "",
    });

    // Update worker's average rating
    const allReviews = await Review.find({ worker_id: workerId }).lean();
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Worker.findOneAndUpdate(
      { _id: workerId },
      { $set: { average_rating: Math.round(avgRating * 10) / 10 } }
    );

    return ok({ review_id: String(review._id) }, 201);
  } catch (error) {
    console.error("[jobs/review] error:", error);
    return fail("Internal error", 500);
  }
}
