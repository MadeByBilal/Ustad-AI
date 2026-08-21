import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Job, Offer, Worker } from "@/models";

export const dynamic = "force-dynamic";

/**
 * Lists the customer's recent direct requests with negotiation status.
 */
export async function GET() {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  try {
    await connectDB();

    // Find jobs created by this customer that are in active negotiation states
    const jobs = await Job.find({
      customer_id: sessionUser.user._id,
      status: { $in: ["BROADCASTING", "ACCEPTED", "CANCELLED", "WORKER_RESPONSES", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION", "COMPLETED"] },
    })
      .sort({ created_at: -1 })
      .limit(20)
      .lean();

    if (jobs.length === 0) {
      return ok({ requests: [] });
    }

    const jobIds = jobs.map((j) => j._id);
    const workerIds = jobs
      .map((j) => j.matching?.selected_worker_id)
      .filter(Boolean);

    // Fetch offers and worker names in parallel (both depend on jobIds/workerIds, not on each other)
    const [offers, workers] = await Promise.all([
      Offer.find({ job_id: { $in: jobIds } })
        .sort({ created_at: -1 })
        .lean(),
      workerIds.length > 0
        ? Worker.find({ _id: { $in: workerIds } })
            .select("name")
            .lean()
        : [],
    ]);
    const workerNameMap = new Map(
      workers.map((w) => [String(w._id), w.name ?? "Ustad"])
    );

    // Group offers by job
    const offersByJob = new Map<string, typeof offers>();
    for (const o of offers) {
      const jid = String(o.job_id);
      if (!offersByJob.has(jid)) offersByJob.set(jid, []);
      offersByJob.get(jid)!.push(o);
    }

    const requests = jobs.map((job) => {
      const jid = String(job._id);
      const jobOffers = offersByJob.get(jid) ?? [];
      const latestOffer = jobOffers[0]; // already sorted by created_at desc

      const workerId = job.matching?.selected_worker_id
        ? String(job.matching.selected_worker_id)
        : null;

      return {
        job_id: jid,
        status: job.status,
        category: job.understanding?.category ?? "",
        description: job.understanding?.description ?? "",
        original_text: job.input?.original_text ?? "",
        urgency: job.understanding?.urgency ?? "normal",
        customer_offer: job.pricing?.customer_offer ?? 0,
        worker_counter_price: job.pricing?.worker_counter_offer ?? null,
        final_price: job.pricing?.final_price ?? null,
        address_label: job.location?.address_label ?? "",
        created_at: new Date(job.created_at).toISOString(),
        worker_name: workerId ? workerNameMap.get(workerId) ?? null : null,
        latest_offer: latestOffer
          ? {
              offer_id: String(latestOffer._id),
              type: latestOffer.type,
              status: latestOffer.status,
              counter_price: latestOffer.counter_price ?? null,
              worker_id: String(latestOffer.worker_id),
            }
          : null,
      };
    });

    return ok({ requests });
  } catch (error) {
    console.error("[requests/list] error:", error);
    return fail("Internal error", 500);
  }
}
