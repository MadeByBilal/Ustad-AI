import { randomUUID } from "node:crypto";
import {
  Job,
  JobEvent,
  Message,
  Offer,
  Worker,
  SYSTEM_SENDER_ID,
  type JobDoc,
  type JobStatus,
} from "@/models";
import { analyzeJobInput } from "./analyze";
import { validateCustomerOffer, validateWorkerCounter } from "./offers";
import {
  canTransition,
  expireIfDeadlinePassed,
  resolveAcceptanceDeadline,
  resolveSelectionDeadline,
  type JobActor,
} from "./state-machine";
import { searchEligibleWorkers } from "@/lib/matching";
import type { UrgencyLevel, WorkerCategory } from "@/models";

export class FlowError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 409
  ) {
    super(message);
    this.name = "FlowError";
  }
}

export interface JobInputPayload {
  type: "voice" | "text" | "photo";
  original_text?: string;
  transcript?: string;
  photo_ids?: string[];
  category_hint?: WorkerCategory | null;
  urgency_hint?: UrgencyLevel | null;
  location?: {
    coordinates?: [number, number] | null;
    address_label?: string;
    search_radius_km?: number;
  };
}

export interface BroadcastResult {
  job: JobDoc;
  broadcast_id: string;
  eligible_workers_count: number;
  acceptance_deadline: Date;
}

async function recordEvent(
  jobId: unknown,
  from_state: JobStatus,
  to_state: JobStatus,
  actor_id: string,
  actor_type: JobActor,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await JobEvent.create({
    job_id: jobId,
    from_state,
    to_state,
    actor_id,
    actor_type,
    metadata,
  });
}

/**
 * System message appended to the job chat whenever the lifecycle moves
 * ("Job accepted", "On the way", ...). Both parties see these.
 */
async function recordSystemMessage(jobId: unknown, content: string): Promise<void> {
  await Message.create({
    job_id: jobId,
    sender_id: SYSTEM_SENDER_ID,
    sender_type: "system",
    content,
  });
}

function formatPrice(rs: number): string {
  return `Rs ${Math.round(rs).toLocaleString("en-PK")}`;
}

async function requireJob(
  filter: Record<string, unknown>
): Promise<JobDoc> {
  const job = await Job.findOne(filter);
  if (!job) {
    throw new FlowError("job_not_found", "Job not found", 404);
  }
  return job;
}

function guardJourney(job: JobDoc, from: JobStatus, to: JobStatus, actor: JobActor): void {
  if (job.status !== from || !canTransition(job.status, to, actor)) {
    throw new FlowError(
      "invalid_status",
      `Job cannot move from ${job.status} to ${to}`,
      409
    );
  }
}

function analysisTextFor(input: JobInputPayload): string {
  return [input.original_text ?? "", input.transcript ?? ""]
    .join(" ")
    .trim();
}

/**
 * Creates a DRAFT job, runs the (pure, synchronous) analysis and settles
 * on WAITING_FOR_CUSTOMER with the lifecycle events recorded.
 */
export async function createAndAnalyzeJob(
  customerId: string,
  input: JobInputPayload
): Promise<JobDoc> {
  const analysis = analyzeJobInput(analysisTextFor(input), {
    categoryHint: input.category_hint ?? undefined,
    urgencyHint: input.urgency_hint ?? undefined,
  });

  const created = await Job.create({
    customer_id: customerId,
    status: "DRAFT",
    input: {
      type: input.type,
      original_text: input.original_text ?? "",
      transcript: input.transcript ?? "",
      photo_ids: input.photo_ids ?? [],
    },
    understanding: {
      category: analysis.category ?? "",
      subcategory: analysis.subcategory,
      description: analysis.description,
      required_skills: analysis.required_skills,
      urgency: analysis.urgency,
      safety_flags: analysis.safety_flags,
      confidence: analysis.confidence,
      clarification_required: analysis.clarification_required,
    },
    pricing: {
      estimate_min: analysis.estimate_min,
      estimate_max: analysis.estimate_max,
      inspection_fee: analysis.inspection_fee ?? 0,
    },
    location: {
      type: "Point",
      coordinates: input.location?.coordinates ?? undefined,
      address_label: input.location?.address_label ?? "",
    },
    matching: {
      search_radius_km: input.location?.search_radius_km ?? 5,
    },
  });

  const jobId = created._id;
  await recordEvent(jobId, "DRAFT", "ANALYZING", "system", "system", {
    method: "synchronous-analysis",
  });

  const job = await Job.findOneAndUpdate(
    { _id: jobId, status: "DRAFT" },
    { $set: { status: "WAITING_FOR_CUSTOMER" } },
    { new: true }
  );
  if (!job) {
    throw new FlowError("invalid_status", "Job could not be settled", 409);
  }

  await recordEvent(jobId, "ANALYZING", "WAITING_FOR_CUSTOMER", "system", "system");
  return job;
}

/**
 * Re-runs analysis after the customer edits their input while the job is
 * still at WAITING_FOR_CUSTOMER.
 */
export async function reanalyzeJob(
  jobId: string,
  customerId: string,
  input: JobInputPayload
): Promise<JobDoc> {
  const job = await requireJob({ _id: jobId, customer_id: customerId });
  guardJourney(job, "WAITING_FOR_CUSTOMER", "ANALYZING", "customer");

  const analysis = analyzeJobInput(analysisTextFor(input), {
    categoryHint: input.category_hint ?? undefined,
    urgencyHint: input.urgency_hint ?? undefined,
  });

  await recordEvent(jobId, "WAITING_FOR_CUSTOMER", "ANALYZING", customerId, "customer", {
    reason: "customer-edited-details",
  });

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, customer_id: customerId, status: "WAITING_FOR_CUSTOMER" },
    {
      $set: {
        status: "WAITING_FOR_CUSTOMER",
        input: {
          type: input.type,
          original_text: input.original_text ?? "",
          transcript: input.transcript ?? "",
          photo_ids: input.photo_ids ?? [],
        },
        "understanding.category": analysis.category ?? "",
        "understanding.subcategory": analysis.subcategory,
        "understanding.description": analysis.description,
        "understanding.required_skills": analysis.required_skills,
        "understanding.urgency": analysis.urgency,
        "understanding.safety_flags": analysis.safety_flags,
        "understanding.confidence": analysis.confidence,
        "understanding.clarification_required": analysis.clarification_required,
        "pricing.estimate_min": analysis.estimate_min,
        "pricing.estimate_max": analysis.estimate_max,
        "pricing.inspection_fee": analysis.inspection_fee ?? 0,
        ...(input.location
          ? {
              "location.coordinates": input.location.coordinates ?? [],
              "location.address_label": input.location.address_label ?? "",
              "matching.search_radius_km": input.location.search_radius_km ?? 5,
            }
          : {}),
      },
    },
    { new: true }
  );

  if (!updated) {
    throw new FlowError("invalid_status", "Job could not be re-analyzed", 409);
  }

  await recordEvent(jobId, "ANALYZING", "WAITING_FOR_CUSTOMER", "system", "system");
  return updated;
}

/** "Sab theek hai" — customer confirms the summary and the job becomes matchable. */
export async function confirmJobDetails(jobId: string, customerId: string): Promise<JobDoc> {
  const job = await requireJob({ _id: jobId, customer_id: customerId });
  guardJourney(job, "WAITING_FOR_CUSTOMER", "READY_TO_MATCH", "customer");

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, customer_id: customerId, status: "WAITING_FOR_CUSTOMER" },
    { $set: { status: "READY_TO_MATCH" } },
    { new: true }
  );
  if (!updated) {
    throw new FlowError("invalid_status", "Job could not be confirmed", 409);
  }

  await recordEvent(jobId, "WAITING_FOR_CUSTOMER", "READY_TO_MATCH", customerId, "customer", {
    source: "summary-confirm",
  });
  return updated;
}

/**
 * Broadcasts a confirmed job to eligible workers. Normal jobs require a
 * customer offer; emergency jobs skip negotiation (offer may be null).
 */
export async function submitOfferAndBroadcast(
  jobId: string,
  customerId: string,
  offerRs: number | null,
  now: Date = new Date()
): Promise<BroadcastResult> {
  const job = await requireJob({ _id: jobId, customer_id: customerId });
  guardJourney(job, "READY_TO_MATCH", "BROADCASTING", "customer");

  const urgency: UrgencyLevel = job.understanding?.urgency ?? "normal";
  if (urgency !== "emergency" && (offerRs === null || offerRs === undefined)) {
    throw new FlowError("offer_required", "A customer offer is required", 400);
  }

  if (offerRs !== null && offerRs !== undefined) {
    const check = validateCustomerOffer(
      offerRs,
      job.pricing?.estimate_min ?? 0,
      job.pricing?.estimate_max ?? 0
    );
    if (!check.valid) {
      throw new FlowError(
        check.reason === "too_high" ? "offer_too_high" : "offer_too_low",
        check.reason === "too_high"
          ? `Offer above the Rs ${check.max_allowed} ceiling`
          : `Offer below the Rs ${check.min_allowed} floor`,
        400
      );
    }
  }

  const [lng, lat] =
    job.location?.coordinates && job.location.coordinates.length === 2
      ? job.location.coordinates
      : [0, 0];

  const ranked = await searchEligibleWorkers({
    category: (job.understanding?.category ?? "plumber") as WorkerCategory,
    required_skills: job.understanding?.required_skills ?? [],
    lat,
    lng,
    radius_km: job.matching?.search_radius_km ?? 5,
    urgency,
    limit: 15,
  });
  const eligible_workers_count = ranked.length;
  const broadcast_id = randomUUID();
  const acceptance_deadline = resolveAcceptanceDeadline(urgency, now);

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, customer_id: customerId, status: "READY_TO_MATCH" },
    {
      $set: {
        status: "BROADCASTING",
        "pricing.customer_offer": offerRs ?? 0,
        "matching.broadcast_round": 1,
        "matching.broadcast_id": broadcast_id,
        "matching.eligible_workers_count": eligible_workers_count,
        "matching.acceptance_deadline": acceptance_deadline,
        "matching.accepted_worker_ids": [],
      },
    },
    { new: true }
  );
  if (!updated) {
    throw new FlowError("invalid_status", "Job could not be broadcast", 409);
  }

  await recordEvent(jobId, "READY_TO_MATCH", "BROADCASTING", customerId, "customer", {
    broadcast_id,
    eligible_workers_count,
    acceptance_deadline: acceptance_deadline.toISOString(),
  });

  return {
    job: updated,
    broadcast_id,
    eligible_workers_count,
    acceptance_deadline,
  };
}

/** Best-effort rollback of a job claim when the worker lock fails. */
async function rollbackClaim(jobId: string, workerId: string, target: JobStatus, urgency: UrgencyLevel): Promise<void> {
  const revert: Record<string, unknown> =
    urgency === "emergency"
      ? {
          status: "BROADCASTING",
          "matching.selected_worker_id": null,
        }
      : {
          status: "BROADCASTING",
          "matching.selection_deadline": null,
        };
  await Job.findOneAndUpdate(
    { _id: jobId, status: target, "matching.accepted_worker_ids": workerId },
    { $set: revert, $pull: { "matching.accepted_worker_ids": workerId } },
    { new: true }
  );
}

/**
 * Worker claims a broadcast job atomically.
 *   - normal: BROADCASTING -> WORKER_RESPONSES (multiple workers may respond)
 *   - emergency: BROADCASTING -> ACCEPTED for the FIRST responder (atomic guard)
 */
export async function workerAcceptJob(
  jobId: string,
  workerId: string,
  now: Date = new Date()
): Promise<JobDoc> {
  const job = await requireJob({ _id: jobId });
  if (job.status !== "BROADCASTING") {
    throw new FlowError("invalid_status", "Job is not broadcasting", 409);
  }
  if (expireIfDeadlinePassed(job.status, job.matching, now) === "EXPIRED") {
    throw new FlowError("acceptance_window_closed", "Acceptance window has closed", 410);
  }

  const urgency: UrgencyLevel = job.understanding?.urgency ?? "normal";
  const target: JobStatus = urgency === "emergency" ? "ACCEPTED" : "WORKER_RESPONSES";

  const claimFilter: Record<string, unknown> = {
    _id: jobId,
    status: "BROADCASTING",
    "matching.acceptance_deadline": { $gte: now },
  };
  const claimSet: Record<string, unknown> =
    urgency === "emergency"
      ? {
          status: "ACCEPTED",
          "matching.selected_worker_id": workerId,
          "matching.acceptance_deadline": null,
        }
      : {
          status: "WORKER_RESPONSES",
          "matching.selection_deadline": resolveSelectionDeadline(now),
        };
  if (urgency === "emergency") {
    claimFilter["matching.accepted_worker_ids"] = { $size: 0 };
  }

  const claimed = await Job.findOneAndUpdate(
    claimFilter,
    { $set: claimSet, $push: { "matching.accepted_worker_ids": workerId } },
    { new: true }
  );
  if (!claimed) {
    throw new FlowError("job_already_claimed", "Job was claimed by another worker", 409);
  }

  const lock = await Worker.updateOne(
    { _id: workerId, active_job_id: null },
    { $set: { active_job_id: jobId, is_available: false } }
  );
  if (lock.matchedCount !== 1) {
    await rollbackClaim(jobId, workerId, target, urgency);
    throw new FlowError("worker_not_available", "Worker is already busy", 409);
  }

  await recordEvent(jobId, "BROADCASTING", target, workerId, "worker", {
    urgency,
    broadcast_id: job.matching?.broadcast_id ?? null,
  });
  await recordSystemMessage(
    jobId,
    urgency === "emergency"
      ? "Emergency job accepted — worker is on the way"
      : "Job accepted"
  );
  return claimed;
}

export type WorkerOfferType = "accept" | "counter_offer" | "decline";

export interface WorkerOfferInput {
  type: WorkerOfferType;
  counter_price?: number;
  message?: string;
}

export interface WorkerOfferResult {
  job: JobDoc;
  offer: {
    _id?: unknown;
    type: WorkerOfferType;
    status: string;
    counter_price?: number | null;
  };
}

/**
 * Worker responds to a broadcast with an accept, a counter offer, or a
 * decline. Accepts/counters claim the worker for a normal job
 * (BROADCASTING -> WORKER_RESPONSES); an emergency only allows a direct
 * claim (BROADCASTING -> ACCEPTED for the first responder). Declines are
 * recorded as offers without claiming anything.
 */
export async function workerOffer(
  jobId: string,
  workerId: string,
  input: WorkerOfferInput,
  now: Date = new Date()
): Promise<WorkerOfferResult> {
  const job = await requireJob({ _id: jobId });
  if (job.status !== "BROADCASTING") {
    throw new FlowError("invalid_status", "Job is not broadcasting", 409);
  }
  if (expireIfDeadlinePassed(job.status, job.matching, now) === "EXPIRED") {
    throw new FlowError("acceptance_window_closed", "Acceptance window has closed", 410);
  }

  const urgency: UrgencyLevel = job.understanding?.urgency ?? "normal";
  const customerOffer = job.pricing?.customer_offer ?? 0;
  const estimateMax = job.pricing?.estimate_max ?? 0;

  if (input.type === "counter_offer") {
    const price = input.counter_price ?? 0;
    const check = validateWorkerCounter(price, customerOffer, estimateMax);
    if (!check.valid) {
      throw new FlowError(
        check.reason === "too_low" ? "counter_too_low" : "counter_too_high",
        check.reason === "too_low"
          ? `Counter offer must be at least ${check.min_allowed}`
          : `Counter offer cannot exceed ${check.max_allowed}`,
        400
      );
    }
  }

  if (input.type === "decline") {
    const offer = await Offer.create({
      job_id: jobId,
      worker_id: workerId,
      type: "decline",
      status: "declined",
      offered_price: 0,
      message: input.message ?? null,
    });
    return { job, offer };
  }

  const emergency = urgency === "emergency";
  if (emergency) {
    throw new FlowError("invalid_status", "Emergency jobs only accept a direct claim", 409);
  }

  const offerExpiry = resolveSelectionDeadline(now);

  const claimSet: Record<string, unknown> = {
    status: "WORKER_RESPONSES",
    "matching.selection_deadline": resolveSelectionDeadline(now),
  };
  if (input.type === "counter_offer") {
    claimSet["pricing.worker_counter_offer"] = input.counter_price;
  }

  const claimed = await Job.findOneAndUpdate(
    {
      _id: jobId,
      status: "BROADCASTING",
      "matching.acceptance_deadline": { $gte: now },
    },
    { $set: claimSet, $push: { "matching.accepted_worker_ids": workerId } },
    { new: true }
  );
  if (!claimed) {
    throw new FlowError("job_already_claimed", "Job was claimed by another worker", 409);
  }

  const lock = await Worker.updateOne(
    { _id: workerId, active_job_id: null },
    { $set: { active_job_id: jobId, is_available: false } }
  );
  if (lock.matchedCount !== 1) {
    await rollbackClaim(jobId, workerId, "WORKER_RESPONSES", urgency);
    throw new FlowError("worker_not_available", "Worker is already busy", 409);
  }

  const offer = await Offer.create({
    job_id: jobId,
    worker_id: workerId,
    type: input.type,
    status: "pending",
    offered_price: customerOffer > 0 ? customerOffer : 0,
    expires_at: offerExpiry,
    ...(input.type === "counter_offer"
      ? { counter_price: input.counter_price, message: input.message ?? null }
      : {}),
  });

  await recordEvent(jobId, "BROADCASTING", "WORKER_RESPONSES", workerId, "worker", {
    reason: input.type === "counter_offer" ? "counter-offer" : "accepted-offer",
    urgency,
    broadcast_id: job.matching?.broadcast_id ?? null,
  });
  await recordSystemMessage(
    jobId,
    input.type === "counter_offer"
      ? `Counter-offer submitted: ${formatPrice(input.counter_price ?? 0)} — waiting for the customer`
      : `Offer submitted: ${formatPrice(customerOffer)} — waiting for the customer`
  );

  return { job: claimed, offer };
}

/**
 * Worker advances an assigned job through its lifecycle stages
 * (ACCEPTED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS ->
 * AWAITING_CUSTOMER_CONFIRMATION). The worker must be the selected worker
 * and the transition must be legal for the actor or a FlowError is raised.
 *
 * Photo gates: normal jobs require a before photo to start work, and every
 * job requires an after photo to be marked complete. Reaching
 * AWAITING_CUSTOMER_CONFIRMATION releases the worker's availability lock.
 */
const STATUS_SYSTEM_MESSAGES: Partial<Record<JobStatus, string>> = {
  EN_ROUTE: "On the way",
  ARRIVED: "Worker has arrived",
  IN_PROGRESS: "Work has started",
  AWAITING_CUSTOMER_CONFIRMATION: "Work complete — please confirm",
};

export async function workerUpdateJobStatus(
  jobId: string,
  workerId: string,
  status: JobStatus,
  note?: string
): Promise<JobDoc> {
  const job = await requireJob({
    _id: jobId,
    "matching.selected_worker_id": workerId,
  });
  guardJourney(job, job.status, status, "worker");

  const urgency: UrgencyLevel = job.understanding?.urgency ?? "normal";
  if (
    status === "IN_PROGRESS" &&
    urgency !== "emergency" &&
    !job.completion?.before_photo_id
  ) {
    throw new FlowError(
      "before_photo_required",
      "Upload a before photo before starting work",
      400
    );
  }
  if (status === "AWAITING_CUSTOMER_CONFIRMATION" && !job.completion?.after_photo_id) {
    throw new FlowError(
      "after_photo_required",
      "Upload an after photo before completing the job",
      400
    );
  }

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, status: job.status },
    { $set: { status } },
    { new: true }
  );
  if (!updated) {
    throw new FlowError("invalid_status", "Job status changed concurrently", 409);
  }

  await recordEvent(jobId, job.status, status, workerId, "worker", note ? { note } : {});
  const systemMessage = STATUS_SYSTEM_MESSAGES[status];
  if (systemMessage) {
    await recordSystemMessage(jobId, systemMessage);
  }

  if (status === "AWAITING_CUSTOMER_CONFIRMATION") {
    await Worker.updateOne(
      { _id: workerId, active_job_id: jobId },
      { $set: { active_job_id: null, is_available: true } }
    );
  }
  return updated;
}

export interface AttachPhotoInput {
  type: "before" | "after";
  photo_id: string;
  note?: string;
}

/**
 * Attaches a before/after photo (plus an optional work note) to the job
 * completion record. Only the assigned worker can attach photos, and only
 * while the job is active.
 */
export async function workerAttachPhoto(
  jobId: string,
  workerId: string,
  input: AttachPhotoInput
): Promise<JobDoc> {
  const job = await requireJob({
    _id: jobId,
    "matching.selected_worker_id": workerId,
  });
  const activeStatuses: JobStatus[] = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
  if (!activeStatuses.includes(job.status)) {
    throw new FlowError("invalid_status", "Photos can only be attached to an active job", 409);
  }

  const field =
    input.type === "before"
      ? "completion.before_photo_id"
      : "completion.after_photo_id";
  const updated = await Job.findOneAndUpdate(
    { _id: jobId, status: job.status, "matching.selected_worker_id": workerId },
    {
      $set: {
        [field]: input.photo_id,
        ...(input.note ? { "completion.note": input.note } : {}),
      },
    },
    { new: true }
  );
  if (!updated) {
    throw new FlowError("invalid_status", "Job changed concurrently", 409);
  }

  await recordEvent(jobId, job.status, job.status, workerId, "worker", {
    photo: input.type,
    photo_id: input.photo_id,
    note: input.note ?? null,
  });
  return updated;
}

/**
 * Customer picks a worker from those who responded. Other responders are
 * released back to availability.
 */
export async function customerSelectWorker(
  jobId: string,
  customerId: string,
  workerId: string,
  now: Date = new Date()
): Promise<JobDoc> {
  const job = await requireJob({ _id: jobId, customer_id: customerId });
  if (job.status !== "WORKER_RESPONSES" && job.status !== "CUSTOMER_SELECTING") {
    throw new FlowError("invalid_status", "Job is not awaiting selection", 409);
  }
  if (expireIfDeadlinePassed(job.status, job.matching, now) === "EXPIRED") {
    throw new FlowError("selection_window_closed", "Selection window has closed", 410);
  }

  const responders = (job.matching?.accepted_worker_ids ?? []).map(String);
  if (!responders.includes(workerId)) {
    throw new FlowError("worker_not_responding", "Worker did not respond to this job", 403);
  }

  const pendingOffer = await Offer.findOne({
    job_id: jobId,
    worker_id: workerId,
    status: "pending",
  });
  const agreedPrice =
    pendingOffer?.type === "counter_offer"
      ? (pendingOffer.counter_price ?? job.pricing?.customer_offer ?? 0)
      : (pendingOffer?.offered_price ?? job.pricing?.customer_offer ?? 0);

  if (job.status === "WORKER_RESPONSES") {
    await recordEvent(jobId, "WORKER_RESPONSES", "CUSTOMER_SELECTING", "system", "system", {
      reason: "customer-selecting",
    });
  }

  const selected = await Job.findOneAndUpdate(
    {
      _id: jobId,
      customer_id: customerId,
      status: { $in: ["WORKER_RESPONSES", "CUSTOMER_SELECTING"] },
      "matching.selected_worker_id": null,
    },
    {
      $set: {
        status: "ACCEPTED",
        "matching.selected_worker_id": workerId,
        "matching.selection_deadline": null,
        pricing: {
          ...(job.pricing ?? {}),
          customer_offer: job.pricing?.customer_offer ?? 0,
          worker_counter_offer:
            pendingOffer?.type === "counter_offer"
              ? (pendingOffer.counter_price ?? null)
              : null,
          final_price: agreedPrice,
          status: "agreed",
        },
      },
    },
    { new: true }
  );
  if (!selected) {
    throw new FlowError("invalid_status", "Job could not be accepted", 409);
  }

  const lock = await Worker.updateOne(
    { _id: workerId, active_job_id: jobId },
    { $set: { is_available: false } }
  );
  if (lock.matchedCount !== 1) {
    throw new FlowError("worker_not_available", "Worker is no longer available", 409);
  }

  const others = responders.filter((id) => id !== workerId);
  if (others.length > 0) {
    await Worker.updateMany(
      { _id: { $in: others }, active_job_id: jobId },
      { $set: { active_job_id: null, is_available: true } }
    );
  }

  if (pendingOffer) {
    await Offer.updateOne(
      { job_id: jobId, worker_id: workerId, status: "pending" },
      { $set: { status: "selected", expires_at: null } }
    );
  }
  if (others.length > 0) {
    await Offer.updateMany(
      { job_id: jobId, worker_id: { $in: others }, status: "pending" },
      { $set: { status: "declined", expires_at: null } }
    );
  }

  await recordEvent(jobId, "CUSTOMER_SELECTING", "ACCEPTED", customerId, "customer", {
    worker_id: workerId,
    final_price: agreedPrice,
  });
  await recordSystemMessage(
    jobId,
    `Worker selected — job confirmed at ${formatPrice(agreedPrice)}`
  );
  return selected;
}

/**
 * Customer rejects one worker's offer (counter-offer or accept). The
 * rejected worker is released back to availability and the job either
 * returns to READY_TO_MATCH for a new broadcast or is closed.
 */
export async function customerRejectWorker(
  jobId: string,
  customerId: string,
  workerId: string,
  action: "close" | "rebroadcast" = "close",
  now: Date = new Date()
): Promise<JobDoc> {
  const job = await requireJob({ _id: jobId, customer_id: customerId });
  if (job.status !== "WORKER_RESPONSES" && job.status !== "CUSTOMER_SELECTING") {
    throw new FlowError("invalid_status", "Job is not awaiting selection", 409);
  }
  if (expireIfDeadlinePassed(job.status, job.matching, now) === "EXPIRED") {
    throw new FlowError("selection_window_closed", "Selection window has closed", 410);
  }

  const responders = (job.matching?.accepted_worker_ids ?? []).map(String);
  if (!responders.includes(workerId)) {
    throw new FlowError("worker_not_responding", "Worker did not respond to this job", 403);
  }

  const target: JobStatus = action === "rebroadcast" ? "READY_TO_MATCH" : "CANCELLED";
  guardJourney(job, job.status, target, "customer");

  const update: Record<string, unknown> =
    action === "rebroadcast"
      ? {
          status: "READY_TO_MATCH",
          "matching.accepted_worker_ids": [],
          "matching.selected_worker_id": null,
          "matching.selection_deadline": null,
          "matching.acceptance_deadline": null,
        }
      : { status: "CANCELLED" };

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, customer_id: customerId, status: job.status },
    { $set: update },
    { new: true }
  );
  if (!updated) {
    throw new FlowError("invalid_status", "Job changed concurrently", 409);
  }

  await Offer.updateOne(
    { job_id: jobId, worker_id: workerId, status: "pending" },
    { $set: { status: "declined", expires_at: null } }
  );
  await Worker.updateOne(
    { _id: workerId, active_job_id: jobId },
    { $set: { active_job_id: null, is_available: true } }
  );

  await recordEvent(jobId, job.status, target, customerId, "customer", {
    worker_id: workerId,
    reason: action === "rebroadcast" ? "offer-rejected-rebroadcast" : "offer-rejected-close",
  });
  await recordSystemMessage(
    jobId,
    action === "rebroadcast"
      ? "Counter-offer rejected — re-broadcasting to more ustads"
      : "Counter-offer rejected — job closed"
  );
  return updated;
}

/**
 * Worker cancels an assigned job they can no longer complete. The job is
 * closed, the worker's availability is restored and their cancellation
 * rate is raised (capped at 100).
 */
export async function workerCancelJob(
  jobId: string,
  workerId: string,
  note?: string
): Promise<JobDoc> {
  const job = await requireJob({ _id: jobId, "matching.selected_worker_id": workerId });
  const cancellable: JobStatus[] = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
  if (!cancellable.includes(job.status)) {
    throw new FlowError(
      "invalid_status",
      `Job cannot be cancelled from ${job.status}`,
      409
    );
  }
  guardJourney(job, job.status, "CANCELLED", "worker");

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, status: job.status, "matching.selected_worker_id": workerId },
    { $set: { status: "CANCELLED" } },
    { new: true }
  );
  if (!updated) {
    throw new FlowError("invalid_status", "Job changed concurrently", 409);
  }

  await Worker.updateOne(
    { _id: workerId, active_job_id: jobId },
    {
      $set: { active_job_id: null, is_available: true },
      $inc: { cancellation_rate: 1 },
      $min: { cancellation_rate: 100 },
    }
  );
  await Offer.updateMany(
    { job_id: jobId, worker_id: workerId, status: "pending" },
    { $set: { status: "declined", expires_at: null } }
  );

  await recordEvent(jobId, job.status, "CANCELLED", workerId, "worker", {
    reason: "worker-cancelled",
    ...(note ? { note } : {}),
  });
  await recordSystemMessage(jobId, "Job cancelled by the worker");
  return updated;
}

/**
 * Lazy deadline enforcement: marks a job EXPIRED when its acceptance or
 * selection window has passed and releases any locked workers.
 */
export async function markExpired(jobId: string, now: Date = new Date()): Promise<JobDoc | null> {
  const job = await requireJob({ _id: jobId });
  const target = expireIfDeadlinePassed(job.status, job.matching, now);
  if (!target) {
    return null;
  }

  const updated = await Job.findOneAndUpdate(
    { _id: jobId, status: job.status },
    {
      $set: {
        status: "EXPIRED",
        "matching.acceptance_deadline": null,
        "matching.selection_deadline": null,
      },
    },
    { new: true }
  );
  if (!updated) {
    throw new FlowError("invalid_status", "Job could not be expired", 409);
  }

  const responders = (job.matching?.accepted_worker_ids ?? []).map(String);
  if (responders.length > 0) {
    await Worker.updateMany(
      { _id: { $in: responders }, active_job_id: jobId },
      { $set: { active_job_id: null, is_available: true } }
    );
  }

  await recordEvent(jobId, job.status, "EXPIRED", "system", "system", {
    reason: "deadline-passed",
  });
  return updated;
}