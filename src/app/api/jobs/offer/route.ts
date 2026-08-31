import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/server/lib/mongodb";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { validateCustomerOffer } from "@/server/lib/job/offers";
import { Job, Offer } from "@/server/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  job_id: z.string().min(1),
  worker_id: z.string().min(1),
  offer_price: z.number().positive(),
  message: z.string().max(500).optional(),
});

/**
 * Customer sends an offer to a worker. This records the customer's
 * counter-offer/negotiation with the worker before final acceptance.
 */
export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();

    // Verify job belongs to customer
    const job = await Job.findById(parsed.data.job_id).lean();
    if (!job) {
      return fail("Job not found", 404);
    }
    if (String(job.customer_id) !== String(sessionUser.user._id)) {
      return fail("You do not own this job", 403);
    }

    // Validate offer amount
    const validation = validateCustomerOffer(
      parsed.data.offer_price,
      job.pricing?.estimate_min ?? 0,
      job.pricing?.estimate_max ?? 0,
    );

    if (!validation.valid) {
      const reason =
        validation.reason === "too_low"
          ? `minimum: ₨ ${validation.min_allowed}`
          : `maximum: ₨ ${validation.max_allowed}`;
      return fail(`Invalid offer price (${reason})`, 400);
    }

    // Record the offer in database (create or update Offer document)
    const offer = await Offer.findOneAndUpdate(
      {
        job_id: parsed.data.job_id,
        worker_id: parsed.data.worker_id,
      },
      {
        job_id: parsed.data.job_id,
        worker_id: parsed.data.worker_id,
        type: "customer_offer",
        status: "pending",
        offered_price: parsed.data.offer_price,
        message: parsed.data.message,
        created_at: new Date(),
      },
      { upsert: true, new: true },
    );

    return ok(
      {
        success: true,
        offer_id: offer._id,
        message: "Offer sent to worker",
      },
      201,
    );
  } catch (e) {
    console.error("customer offer failed:", e);
    return fail("Internal error", 500);
  }
}
