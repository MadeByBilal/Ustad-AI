import { connectDB } from "../mongodb.js";
import { haversineDistanceKm } from "../geo.js";
import { Job, Offer, Worker, type JobDoc } from "../../models/index.js";
import { FlowError } from "./flow.js";

export interface JobResponderWorker {
  id: string;
  name: string;
  category: string;
  skills: string[];
  ustad_score: number;
  completed_jobs: number;
  average_rating: number;
  verified: boolean;
  verification_level: string;
  response_rate: number;
}

export interface JobResponderOffer {
  type: string;
  status: string;
  offered_price: number;
  counter_price: number | null;
}

export interface JobResponder {
  worker: JobResponderWorker;
  distance_km: number | null;
  offer: JobResponderOffer | null;
}

export interface JobDetail {
  job: JobDoc;
  responders: JobResponder[];
}

/**
 * Single-job view for the customer results screen and worker feed:
 *   - the owning customer
 *   - any open BROADCASTING job (worker feed)
 *   - a worker who responded or was selected
 * Responders carry public profile metadata plus distance from the job and
 * their pending offer (null for emergency direct claims).
 */
export async function getJobDetail(jobId: string, userId: string): Promise<JobDetail> {
  await connectDB();

  const job = await Job.findOne({
    _id: jobId,
    $or: [
      { customer_id: userId },
      { status: "BROADCASTING" },
      { "matching.accepted_worker_ids": userId },
      { "matching.selected_worker_id": userId },
    ],
  });
  if (!job) {
    throw new FlowError("job_not_found", "Job not found", 404);
  }

  const responderIds = (job.matching?.accepted_worker_ids ?? []).map(String);
  if (responderIds.length === 0) {
    return { job, responders: [] };
  }

  const [workers, offers] = await Promise.all([
    Worker.find({ _id: { $in: responderIds } }),
    Offer.find({ job_id: jobId, worker_id: { $in: responderIds } }),
  ]);

  const [jobLng, jobLat] =
    job.location?.coordinates && job.location.coordinates.length === 2
      ? job.location.coordinates
      : [null, null];

  const responders: JobResponder[] = workers.map((w) => {
    const offer = offers.find((o) => String(o.worker_id) === String(w._id));
    let distance_km: number | null = null;
    if (
      jobLat != null &&
      jobLng != null &&
      w.location?.coordinates &&
      w.location.coordinates.length === 2
    ) {
      distance_km = Number(
        haversineDistanceKm(
          jobLat,
          jobLng,
          w.location.coordinates[1],
          w.location.coordinates[0]
        ).toFixed(2)
      );
    }
    return {
      worker: {
        id: String(w._id),
        name: w.name,
        category: String(w.category),
        skills: w.skills ?? [],
        ustad_score: w.ustad_score ?? 0,
        completed_jobs: w.completed_jobs ?? 0,
        average_rating: w.average_rating ?? 0,
        verified: Boolean(w.verified),
        verification_level: w.verification_level ?? "identity_reviewed",
        response_rate: w.response_rate ?? 0,
      },
      distance_km,
      offer: offer
        ? {
            type: offer.type,
            status: offer.status,
            offered_price: offer.offered_price ?? 0,
            counter_price: offer.counter_price ?? null,
          }
        : null,
    };
  });

  return { job, responders };
}