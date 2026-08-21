import { connectDB } from "@/lib/mongodb";
import { haversineDistanceKm } from "@/lib/geo";
import { Job, Offer, Worker } from "@/models";
import { FlowError } from "@/lib/job/flow";

export interface WorkerView {
  id: string;
  name: string;
  category: string;
  skills: string[];
  verified: boolean;
  verification_level: string;
  is_online: boolean;
  is_available: boolean;
  emergency_available: boolean;
  ustad_score: number;
  completed_jobs: number;
  average_rating: number;
  response_rate: number;
  cancellation_rate: number;
  repeat_customers: number;
  confirmed_jobs: number;
  location_updated_at: string | null;
  active_job_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
}

export interface IncomingJobView {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  original_text: string;
  required_skills: string[];
  urgency: string;
  customer_offer: number;
  distance_km: number | null;
  address_label: string;
  photo_ids: string[];
  acceptance_deadline: string | null;
  created_at: string;
  my_offer: {
    type: string;
    status: string;
    counter_price: number | null;
  } | null;
}

export interface ActiveJobView {
  _id: string;
  status: string;
  input?: { original_text?: string };
  understanding?: {
    category?: string;
    subcategory?: string;
    description?: string;
    required_skills?: string[];
    urgency?: string;
  };
  pricing?: {
    customer_offer?: number;
    worker_counter_offer?: number | null;
    final_price?: number | null;
    currency?: string;
  };
  location?: { address_label?: string };
  completion?: {
    before_photo_id?: string | null;
    after_photo_id?: string | null;
    note?: string | null;
  };
}

/** A direct customer request awaiting this worker's response. */
export interface DirectRequestView {
  offer_id: string;
  job_id: string;
  category: string;
  description: string;
  original_text: string;
  required_skills: string[];
  urgency: string;
  customer_offer: number;
  my_counter_price: number | null;
  offer_status: string;
  address_label: string;
  created_at: string;
}

export interface WorkerDashboardData {
  worker: WorkerView;
  active_job: ActiveJobView | null;
  incoming_jobs: IncomingJobView[];
  direct_requests: DirectRequestView[];
}

/**
 * Aggregates everything the worker dashboard needs in one call:
 * profile + stats + availability, the active job (if any) and the
 * broadcasting jobs this worker can still respond to, sorted by how
 * soon their acceptance window closes.
 */
export async function getWorkerDashboard(workerId: string): Promise<WorkerDashboardData> {
  await connectDB();

  const worker = await Worker.findById(workerId).lean();
  if (!worker) {
    throw new FlowError("worker_not_found", "Worker not found", 404);
  }

  const [workerLng, workerLat] =
    worker.location?.coordinates && worker.location.coordinates.length === 2
      ? worker.location.coordinates
      : [null, null];

  const [activeJob, incomingJobs, openOffers, directRequestOffers] = await Promise.all([
    worker.active_job_id ? Job.findById(worker.active_job_id).lean() : null,
    Job.find({
      status: "BROADCASTING",
      "matching.acceptance_deadline": { $gte: new Date() },
      "understanding.category": worker.category,
      "matching.accepted_worker_ids": { $nin: [worker._id] },
    })
      .sort({ "matching.acceptance_deadline": 1 })
      .limit(10)
      .lean(),
    Offer.find({ worker_id: worker._id, status: { $in: ["pending", "declined"] } })
      .lean(),
    // Direct customer requests targeting this worker
    Offer.find({
      worker_id: worker._id,
      type: { $in: ["customer_offer", "counter_offer"] },
      status: "pending",
    })
      .sort({ created_at: -1 })
      .lean(),
  ]);

  const declinedJobIds = new Set(
    openOffers
      .filter((o) => o.status === "declined" && o.type === "decline")
      .map((o) => String(o.job_id))
  );
  const offerByJob = new Map<string, { type: string; status: string; counter_price: number | null }>();
  for (const o of openOffers) {
    if (o.status !== "declined") {
      offerByJob.set(String(o.job_id), {
        type: o.type,
        status: o.status,
        counter_price: o.counter_price ?? null,
      });
    }
  }

  const incoming_jobs: IncomingJobView[] = incomingJobs
    .filter((job) => !declinedJobIds.has(String(job._id)))
    .filter((job) => {
      // Remove jobs that already appear as direct requests
      const jid = String(job._id);
      return !directRequestOffers.some((o) => String(o.job_id) === jid);
    })
    .map((job) => {
      const [jobLng, jobLat] =
        job.location?.coordinates && job.location.coordinates.length === 2
          ? job.location.coordinates
          : [null, null];
      const distance_km =
        workerLat != null && workerLng != null && jobLat != null && jobLng != null
          ? Number(haversineDistanceKm(workerLat, workerLng, jobLat, jobLng).toFixed(1))
          : null;
      return {
        id: String(job._id),
        category: job.understanding?.category ?? "",
        subcategory: job.understanding?.subcategory ?? "",
        description: job.understanding?.description ?? "",
        original_text: job.input?.original_text ?? "",
        required_skills: job.understanding?.required_skills ?? [],
        urgency: job.understanding?.urgency ?? "normal",
        customer_offer: job.pricing?.customer_offer ?? 0,
        distance_km,
        address_label: job.location?.address_label ?? "",
        photo_ids: job.input?.photo_ids ?? [],
        acceptance_deadline: job.matching?.acceptance_deadline
          ? new Date(job.matching.acceptance_deadline).toISOString()
          : null,
        created_at: new Date(job.created_at).toISOString(),
        my_offer: offerByJob.get(String(job._id)) ?? null,
      };
    });

  // Fetch jobs for direct customer offers
  const directJobIds = directRequestOffers
    .filter((o) => o.type === "customer_offer")
    .map((o) => o.job_id);
  const directJobs = directJobIds.length > 0
    ? await Job.find({ _id: { $in: directJobIds } }).lean()
    : [];
  const directJobMap = new Map(directJobs.map((j) => [String(j._id), j]));

  // Latest offer per job (the one the worker needs to respond to)
  const latestOfferByJob = new Map<string, typeof directRequestOffers[0]>();
  for (const o of directRequestOffers) {
    const jid = String(o.job_id);
    const existing = latestOfferByJob.get(jid);
    if (!existing || new Date(o.created_at).getTime() > new Date(existing.created_at).getTime()) {
      latestOfferByJob.set(jid, o);
    }
  }

  const direct_requests: DirectRequestView[] = [];
  for (const [jid, offer] of latestOfferByJob) {
    const job = directJobMap.get(jid);
    if (!job || job.status !== "BROADCASTING") continue;
    direct_requests.push({
      offer_id: String(offer._id),
      job_id: jid,
      category: job.understanding?.category ?? "",
      description: job.understanding?.description ?? "",
      original_text: job.input?.original_text ?? "",
      required_skills: job.understanding?.required_skills ?? [],
      urgency: job.understanding?.urgency ?? "normal",
      customer_offer: job.pricing?.customer_offer ?? 0,
      my_counter_price: offer.type === "counter_offer" ? (offer.counter_price ?? null) : null,
      offer_status: offer.status,
      address_label: job.location?.address_label ?? "",
      created_at: new Date(offer.created_at).toISOString(),
    });
  }

  return {
    worker: {
      id: String(worker._id),
      name: worker.name,
      category: String(worker.category),
      skills: worker.skills ?? [],
      verified: Boolean(worker.verified),
      verification_level: worker.verification_level ?? "identity_reviewed",
      is_online: Boolean(worker.is_online),
      is_available: Boolean(worker.is_available),
      emergency_available: Boolean(worker.emergency_available),
      ustad_score: worker.ustad_score ?? 0,
      completed_jobs: worker.completed_jobs ?? 0,
      average_rating: worker.average_rating ?? 0,
      response_rate: worker.response_rate ?? 0,
      cancellation_rate: worker.cancellation_rate ?? 0,
      repeat_customers: worker.repeat_customers ?? 0,
      confirmed_jobs: worker.confirmed_jobs ?? 0,
      location_updated_at: worker.location_updated_at
        ? new Date(worker.location_updated_at).toISOString()
        : null,
      active_job_id: worker.active_job_id ? String(worker.active_job_id) : null,
      location_lat: workerLat,
      location_lng: workerLng,
    },
    active_job: activeJob
      ? {
          _id: String(activeJob._id),
          status: activeJob.status,
          input: activeJob.input
            ? { original_text: activeJob.input.original_text ?? undefined }
            : undefined,
          understanding: activeJob.understanding
            ? {
                category: activeJob.understanding.category ?? undefined,
                subcategory: activeJob.understanding.subcategory ?? undefined,
                description: activeJob.understanding.description ?? undefined,
                required_skills: activeJob.understanding.required_skills ?? undefined,
                urgency: activeJob.understanding.urgency ?? undefined,
              }
            : undefined,
          pricing: activeJob.pricing
            ? {
                customer_offer: activeJob.pricing.customer_offer ?? undefined,
                worker_counter_offer:
                  activeJob.pricing.worker_counter_offer ?? undefined,
                final_price: activeJob.pricing.final_price ?? undefined,
                currency: activeJob.pricing.currency ?? undefined,
              }
            : undefined,
          location: activeJob.location
            ? { address_label: activeJob.location.address_label ?? undefined }
            : undefined,
          completion: activeJob.completion
            ? {
                before_photo_id:
                  activeJob.completion.before_photo_id
                    ? String(activeJob.completion.before_photo_id)
                    : null,
                after_photo_id:
                  activeJob.completion.after_photo_id
                    ? String(activeJob.completion.after_photo_id)
                    : null,
                note: activeJob.completion.note ?? undefined,
              }
            : undefined,
        }
      : null,
    incoming_jobs,
    direct_requests,
  };
}