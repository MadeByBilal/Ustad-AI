import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { requireRole } from "../../lib/auth-middleware.js";
import {
  FlowError,
  reanalyzeJob,
  workerAcceptJob,
  workerOffer,
  workerUpdateJobStatus,
  workerCancelJob,
  customerCancelJob,
  confirmJobDetails,
  submitOfferAndBroadcast,
  customerRejectWorker,
  customerSelectWorker,
  workerAttachPhoto,
  WORKER_SCORE_COMPLETION_REWARD,
} from "../../lib/job/flow.js";
import { getJobDetail } from "../../lib/job/detail.js";
import { listJobMessages, sendJobMessage } from "../../lib/job/chat.js";
import { Job, JobEvent, Message, Review, Worker, Offer, SYSTEM_SENDER_ID } from "../../models/index.js";
import { canTransition } from "../../lib/job/state-machine.js";
import { getTrackingTarget } from "../../lib/tracking/realtime.js";

const router = Router();

const TRACKING_STATUSES = new Set([
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "AWAITING_CUSTOMER_CONFIRMATION",
]);

const patchSchema = z
  .object({
    type: z.enum(["voice", "text", "photo"]).default("text"),
    original_text: z.string().trim().max(2000).optional(),
    transcript: z.string().max(4000).optional(),
    photo_ids: z.array(z.string()).max(6).optional(),
    category_hint: z.string().nullable().optional(),
    urgency_hint: z.string().nullable().optional(),
    location: z
      .object({
        coordinates: z
          .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
          .nullable()
          .optional(),
        address_label: z.string().trim().max(300).optional(),
        search_radius_km: z.number().min(0.5).max(100).optional(),
      })
      .optional(),
  })
  .refine(
    (v) => {
      const hasText = Boolean(v.original_text && v.original_text.trim().length > 0);
      if (v.type === "text") {
        return hasText;
      }
      return (
        hasText ||
        Boolean(v.transcript && v.transcript.trim()) ||
        Boolean(v.photo_ids && v.photo_ids.length > 0)
      );
    },
    {
      message: "Describe the problem using text, a voice note or a photo",
      path: ["original_text"],
    }
  );

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
    "AWAITING_CUSTOMER_CONFIRMATION",
  ]),
  note: z.string().max(500).optional(),
});

const broadcastSchema = z.object({
  offer_rs: z.coerce.number().int().min(0).nullable().optional(),
});

const selectWorkerSchema = z.object({
  worker_id: z.string().min(1),
});

const rejectOfferSchema = z.object({
  worker_id: z.string().min(1),
  action: z.enum(["close", "rebroadcast"]).optional(),
});

const approveSchema = z.object({
  action: z.enum(["approve", "dispute"]),
  note: z.string().max(500).optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(500).optional(),
});

const mediaSchema = z.object({
  type: z.enum(["before", "after"]),
  photo_id: z.string().min(1),
  note: z.string().trim().max(300).optional(),
});

const postSchema = z
  .object({
    content: z.string().trim().max(1000).optional(),
    photo_ids: z.array(z.string().min(1)).max(6).optional(),
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .refine(
    (v) =>
      Boolean(v.content && v.content.length > 0) ||
      Boolean(v.photo_ids && v.photo_ids.length > 0) ||
      v.location != null,
    { message: "Send text, a photo or a location" }
  );

/**
 * GET /:id — single-job view used by the customer results screen and the worker feed.
 */
router.get("/:id", requireRole(["customer", "worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  try {
    let accessId = String(sessionUser.user._id);
    if (sessionUser.user.role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id })
        .select("_id")
        .lean();
      if (!worker) {
        return fail(res, "Worker profile not found for this account", 404);
      }
      accessId = String(worker._id);
    }
    const detail = await getJobDetail(jobId, accessId);
    return ok(detail)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * PATCH /:id — customer edits their problem description while the job is still at
 * WAITING_FOR_CUSTOMER; analysis runs again and the summary refreshes.
 */
router.patch("/:id", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = patchSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const job = await reanalyzeJob(jobId, String(sessionUser.user._id), parsed.data as any);
    return ok(job)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/patch] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/accept — worker claims a broadcast job.
 */
router.post("/:id/accept", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  try {
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }

    const job = await workerAcceptJob(jobId, String(worker._id));
    return ok(job)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/accept] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/decline — worker declines a broadcast job.
 */
const declineSchema = z.object({
  type: z.literal("decline"),
  message: z.string().max(500).optional(),
});

const customerOfferSchema = z.object({
  type: z.literal("customer_offer"),
  worker_id: z.string().min(1),
  offer_price: z.number().min(1),
  message: z.string().max(500).optional(),
});

router.post("/:id/decline", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = declineSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }

    const result = await workerOffer(jobId, String(worker._id), {
      type: "decline",
      message: parsed.data.message,
    });
    return ok(result)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/decline] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/offer — customer sends a targeted offer to a specific worker.
 */
router.post("/:id/offer", requireRole(["customer"]), async (req: Request, res: Response) => {
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = customerOfferSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const job = await Job.findById(jobId).lean();
    if (!job) {
      return fail(res, "Job not found", 404);
    }

    const worker = await Worker.findById(parsed.data.worker_id).lean();
    if (!worker) {
      return fail(res, "Worker not found", 404);
    }

    const offer = await Offer.findOneAndUpdate(
      { job_id: jobId, worker_id: parsed.data.worker_id },
      {
        job_id: jobId,
        worker_id: parsed.data.worker_id,
        type: "customer_offer" as const,
        offered_price: parsed.data.offer_price,
        counter_price: parsed.data.offer_price,
        message: parsed.data.message ?? "",
        status: "pending" as const,
      },
      { upsert: true, new: true },
    ).lean();

    return ok({ offer_id: String(offer._id) })(res);
  } catch (e) {
    console.error("[jobs/:id/offer] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/confirm — customer confirms the analyzed summary so the job
 * becomes matchable at READY_TO_MATCH.
 */
router.post("/:id/confirm", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  try {
    const job = await confirmJobDetails(jobId, String(sessionUser.user._id));
    return ok(job)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/confirm] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/cancel — worker or customer cancels a job.
 */
router.post("/:id/cancel", requireRole(["worker", "customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = cancelSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  const role = sessionUser.user.role as string;

  try {
    if (role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail(res, "Worker profile not found for this account", 404);
      }
      const job = await workerCancelJob(jobId, String(worker._id), parsed.data.reason);
      return ok(job)(res);
    } else {
      const job = await customerCancelJob(jobId, String(sessionUser.user._id), parsed.data.reason);
      return ok(job)(res);
    }
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/cancel] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/status — worker advances their active job through its lifecycle stages.
 */
router.post("/:id/status", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = statusSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }

    const job = await workerUpdateJobStatus(
      jobId,
      String(worker._id),
      parsed.data.status,
      parsed.data.note
    );
    return ok(job)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/status] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/broadcast — broadcasts a confirmed job to eligible workers.
 */
router.post("/:id/broadcast", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = broadcastSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const broadcast = await submitOfferAndBroadcast(
      jobId,
      String(sessionUser.user._id),
      parsed.data.offer_rs ?? null
    );
    return ok({
      job: broadcast.job,
      broadcast_id: broadcast.broadcast_id,
      eligible_workers_count: broadcast.eligible_workers_count,
      acceptance_deadline: broadcast.acceptance_deadline,
    })(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/broadcast] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/select-worker — customer picks one of the responding workers.
 */
router.post("/:id/select-worker", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = selectWorkerSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const job = await customerSelectWorker(
      jobId,
      String(sessionUser.user._id),
      parsed.data.worker_id
    );
    return ok(job)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/select-worker] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/reject-offer — customer rejects a worker's offer.
 */
router.post("/:id/reject-offer", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = rejectOfferSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const job = await customerRejectWorker(
      jobId,
      String(sessionUser.user._id),
      parsed.data.worker_id,
      parsed.data.action
    );
    return ok(job)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/reject-offer] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/approve — customer approves or disputes completed work.
 */
router.post("/:id/approve", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = approveSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();

    const job = await Job.findOne({ _id: jobId, customer_id: sessionUser.user._id });
    if (!job) {
      return fail(res, "Job not found", 404);
    }

    if (job.status !== "AWAITING_CUSTOMER_CONFIRMATION") {
      return fail(res, "Job is not awaiting confirmation", 409);
    }

    const targetStatus = parsed.data.action === "approve" ? "COMPLETED" : "DISPUTED";

    if (!canTransition("AWAITING_CUSTOMER_CONFIRMATION", targetStatus, "customer")) {
      return fail(res, `Cannot ${parsed.data.action} from current status`, 409);
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
      return fail(res, "Job status changed concurrently", 409);
    }

    await JobEvent.create({
      job_id: jobId,
      from_state: "AWAITING_CUSTOMER_CONFIRMATION",
      to_state: targetStatus,
      actor_id: String(sessionUser.user._id),
      actor_type: "customer",
      metadata: { action: parsed.data.action, note: parsed.data.note ?? null },
    });

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

    return ok(updated)(res);
  } catch (error) {
    console.error("[jobs/:id/approve] error:", error);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/review — customer submits a review for completed work.
 */
router.post("/:id/review", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = reviewSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();

    const job = await Job.findOne({
      _id: jobId,
      customer_id: sessionUser.user._id,
      status: "COMPLETED",
    });

    if (!job) {
      return fail(res, "Job not found or not completed", 404);
    }

    const existing = await Review.findOne({ job_id: jobId });
    if (existing) {
      return fail(res, "You already reviewed this job", 409);
    }

    const workerId = job.matching?.selected_worker_id;
    if (!workerId) {
      return fail(res, "No worker assigned to this job", 400);
    }

    const review = await Review.create({
      job_id: jobId,
      customer_id: sessionUser.user._id,
      worker_id: workerId,
      rating: parsed.data.rating,
      text: parsed.data.text ?? "",
    });

    const allReviews = await Review.find({ worker_id: workerId }).lean();
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Worker.findOneAndUpdate(
      { _id: workerId },
      { $set: { average_rating: Math.round(avgRating * 10) / 10 } }
    );

    return ok({ review_id: String(review._id) }, 201)(res);
  } catch (error) {
    console.error("[jobs/:id/review] error:", error);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/media — worker attaches a before/after photo to the active job.
 */
router.post("/:id/media", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = mediaSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }

    const job = await workerAttachPhoto(jobId, String(worker._id), parsed.data);
    return ok(job, 201)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/media] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * GET /:id/messages — message history for the job chat.
 */
router.get("/:id/messages", requireRole(["customer", "worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  try {
    await connectDB();
    let senderId = String(sessionUser.user._id);
    let role: "customer" | "worker" = "customer";
    if (sessionUser.user.role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail(res, "Worker profile not found for this account", 404);
      }
      senderId = String(worker._id);
      role = "worker";
    }
    const messages = await listJobMessages(jobId, senderId, role);
    return ok({ messages })(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/messages] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /:id/messages — sends a chat message (text, photos and/or a live location).
 */
router.post("/:id/messages", requireRole(["customer", "worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const parsed = postSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid message", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();
    let senderId = String(sessionUser.user._id);
    let role: "customer" | "worker" = "customer";
    if (sessionUser.user.role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail(res, "Worker profile not found for this account", 404);
      }
      senderId = String(worker._id);
      role = "worker";
    }
    const message = await sendJobMessage(jobId, senderId, role, parsed.data);
    return ok(
      {
        message: {
          id: String(message._id),
          sender_type: message.sender_type,
          content: message.content,
          media_ids: message.media_ids,
          location: message.location ?? null,
          created_at: new Date(message.created_at).toISOString(),
        },
      },
      201
    )(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/messages] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * GET /:id/tracking — worker location + ETA tracking.
 */
router.get("/:id/tracking", requireRole(["customer", "worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;

  try {
    const userId = String(sessionUser.user._id);
    const role = sessionUser.user.role as string;
    const jobId = String(req.params.id).trim();

    if (!jobId) {
      return fail(res, "Job id is required", 400);
    }

    await connectDB();

    const job = await Job.findOne({ _id: jobId }).lean();
    if (!job) {
      return fail(res, "Job not found", 404, undefined, "job_not_found");
    }

    let workerProfileId: string | null = null;
    if (role === "worker") {
      const workerProfile = await Worker.findOne({ user_id: userId })
        .select("_id")
        .lean();
      workerProfileId = workerProfile ? String(workerProfile._id) : null;
    }

    const isCustomer = role === "customer" && String(job.customer_id) === userId;
    const acceptedWorkerIds = (job.matching?.accepted_worker_ids ?? []).map(String);
    const isWorker =
      role === "worker" &&
      workerProfileId != null &&
      (String(job.matching?.selected_worker_id) === workerProfileId ||
        acceptedWorkerIds.includes(workerProfileId));

    if (!isCustomer && !isWorker) {
      return fail(res, "Unauthorized", 403, undefined, "unauthorized");
    }

    if (!TRACKING_STATUSES.has(job.status)) {
      return ok({
        status: job.status,
        worker_name: null,
        worker_lat: null,
        worker_lng: null,
        worker_location_updated_at: null,
        distance_km: null,
        eta_minutes: null,
        destination_lat: job.location?.coordinates?.[1] ?? null,
        destination_lng: job.location?.coordinates?.[0] ?? null,
        destination_label: job.location?.address_label ?? null,
        customer_lat: null,
        customer_lng: null,
        customer_location_updated_at: null,
        before_photo_id: null,
        after_photo_id: null,
        note: null,
        precomputed_route: null,
        route_distance_meters: null,
        route_duration_seconds: null,
      })(res);
    }

    const selectedWorkerId = job.matching?.selected_worker_id
      ? String(job.matching.selected_worker_id)
      : null;
    const workerId = selectedWorkerId ?? (role === "worker" ? workerProfileId : null);
    const worker = workerId
      ? await Worker.findOne({ _id: workerId })
          .select("name location location_updated_at")
          .lean()
      : null;
    const workerCoordinates = worker?.location?.coordinates;
    const destCoords = job.location?.coordinates;
    const targetCoords = getTrackingTarget(job);
    const customerCoordinates = job.tracking?.customer_location?.coordinates;

    let distanceKm: number | null = null;
    let etaMinutes: number | null = null;

    if (targetCoords && workerCoordinates && workerCoordinates.length === 2) {
      const [workerLng, workerLat] = workerCoordinates;
      const [targetLng, targetLat] = targetCoords;
      const { haversineDistanceKm, estimateETAMinutes } = await import("../../lib/geo.js");
      distanceKm = Math.round(haversineDistanceKm(workerLat, workerLng, targetLat, targetLng) * 100) / 100;
      etaMinutes = estimateETAMinutes(distanceKm);
    }

    return ok({
      status: job.status,
      worker_name: worker?.name ?? "Ustad",
      worker_lat: workerCoordinates?.[1] ?? null,
      worker_lng: workerCoordinates?.[0] ?? null,
      worker_location_updated_at: worker?.location_updated_at ?? null,
      distance_km: distanceKm,
      eta_minutes: etaMinutes,
      destination_lat: destCoords?.[1] ?? null,
      destination_lng: destCoords?.[0] ?? null,
      destination_label: job.location?.address_label ?? null,
      customer_lat: customerCoordinates?.[1] ?? destCoords?.[1] ?? null,
      customer_lng: customerCoordinates?.[0] ?? destCoords?.[0] ?? null,
      customer_location_updated_at: job.tracking?.customer_location_updated_at ?? null,
      before_photo_id: job.completion?.before_photo_id ?? null,
      after_photo_id: job.completion?.after_photo_id ?? null,
      note: job.completion?.note ?? null,
      precomputed_route: job.route?.polyline ?? null,
      route_distance_meters: job.route?.distance_meters ?? null,
      route_duration_seconds: job.route?.duration_seconds ?? null,
    })(res);
  } catch (error) {
    console.error("[jobs/:id/tracking] error:", error);
    return fail(res, "Internal error", 500, undefined, "internal_error");
  }
});

/**
 * PATCH /:id/customer-location — customer updates their live location during tracking.
 */
router.patch("/:id/customer-location", requireRole(["customer"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  const locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  });
  const parsed = locationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid location", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();
    const job = await Job.findOne({ _id: jobId, customer_id: sessionUser.user._id }).lean();
    if (!job) {
      return fail(res, "Job not found", 404);
    }

    await Job.updateOne(
      { _id: jobId },
      {
        $set: {
          "tracking.customer_location": {
            type: "Point",
            coordinates: [parsed.data.lng, parsed.data.lat],
          },
          "tracking.customer_location_updated_at": new Date(),
        },
      },
    );

    // Broadcast to the room so the worker sees it
    const { getIO } = await import("../../lib/socket.js");
    const io = getIO();
    if (io) {
      io.to(`job:${jobId}`).emit("customer-location-update", {
        jobId,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
      });
    }

    return ok({ lat: parsed.data.lat, lng: parsed.data.lng })(res);
  } catch (e) {
    console.error("[jobs/:id/customer-location] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * GET /:id/stream — Server-sent events for a job.
 * Returns a ReadableStream with SSE headers for real-time updates.
 */
router.get("/:id/stream", requireRole(["customer", "worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const jobId = String(req.params.id).trim();
  if (!jobId) {
    return fail(res, "Job id is required", 400);
  }

  try {
    await connectDB();
    let userId = String(sessionUser.user._id);
    let role: "customer" | "worker" = "customer";
    if (sessionUser.user.role === "worker") {
      const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
      if (!worker) {
        return fail(res, "Worker profile not found for this account", 404);
      }
      userId = String(worker._id);
      role = "worker";
    }

    const { createJobStream } = await import("../../lib/job/stream.js");
    const stream = await createJobStream(jobId, userId, role);

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    if (typeof stream === "string") {
      res.write(stream);
    } else if (stream instanceof ReadableStream) {
      const reader = stream.getReader();
      const cancel = () => reader.cancel();
      req.on("close", cancel);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = typeof value === "string" ? value : new TextDecoder().decode(value);
          res.write(chunk);
        }
      } catch {
        // Stream closed
      }
    }
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[jobs/:id/stream] error:", e);
    return fail(res, "Internal error", 500);
  }
});

export { router as jobIdRoutes };
