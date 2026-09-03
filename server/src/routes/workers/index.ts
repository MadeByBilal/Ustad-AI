import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { requireRole } from "../../lib/auth-middleware.js";
import { FlowError } from "../../lib/job/flow.js";
import { getWorkerDashboard } from "../../lib/worker/dashboard.js";
import { haversineDistanceKm, estimateETAMinutes } from "../../lib/geo.js";
import { getWorkerResults } from "../../lib/matching.js";
import { photoUploadSchema } from "../../lib/photos.js";
import { Worker, Upload, Job, Review, WORKER_CATEGORIES } from "../../models/index.js";
import { getIO } from "../../lib/socket.js";
import { getTrackingTarget } from "../../lib/tracking/realtime.js";

const router = Router();

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(0.5).max(100).default(5),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const searchQuerySchema = z.object({
  category: z.string(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(0.5).max(100).default(5),
  urgency: z.string().default("normal"),
  required_skills: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    ),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const availabilitySchema = z.object({
  is_available: z.boolean().optional(),
  is_online: z.boolean().optional(),
  emergency_available: z.boolean().optional(),
});

/**
 * GET /by-user/:userId — return the worker profile for a given user id.
 */
router.get("/by-user/:userId", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  if (String(req.params.userId) !== String(sessionUser.user._id)) {
    return fail(res, "Not allowed for this account", 403, undefined, "role_forbidden");
  }
  try {
    await connectDB();
    const worker = await Worker.findOne({ user_id: req.params.userId }).lean();
    if (!worker) {
      return fail(res, "Worker not found", 404);
    }
    return ok({
      _id: String(worker._id),
      name: worker.name,
      category: worker.category,
      active_job_id: worker.active_job_id ? String(worker.active_job_id) : null,
    })(res);
  } catch (error) {
    console.error("[workers/by-user] error:", error);
    return fail(res, "Internal error", 500);
  }
});

/**
 * GET /nearby — geospatial worker search using 2dsphere index with haversine re-sort.
 */
router.get("/nearby", async (req: Request, res: Response) => {
  try {
    const parsed = nearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, "Invalid query parameters", 400, parsed.error.flatten().fieldErrors);
    }

    const { lat, lng, radius_km, category, limit } = parsed.data;
    await connectDB();

    const query: Record<string, unknown> = {
      suspended: false,
      verified: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius_km * 1000,
        },
      },
    };
    if (category) {
      query.category = category;
    }

    const workers = (await Worker.find(query).limit(limit).lean()).filter(
      (w) => {
        const loc = w.location;
        return Boolean(loc?.coordinates) && (loc!.coordinates as number[]).length === 2;
      }
    );

    const results = workers
      .map((w) => ({
        id: w._id,
        name: w.name,
        category: w.category,
        skills: w.skills,
        is_online: w.is_online,
        is_available: w.is_available,
        emergency_available: w.emergency_available,
        verification_level: w.verification_level,
        ustad_score: w.ustad_score,
        average_rating: w.average_rating,
        completed_jobs: w.completed_jobs,
        response_rate: w.response_rate,
        distance_km: Number(
          haversineDistanceKm(
            lat,
            lng,
            (w.location!.coordinates as number[])[1],
            (w.location!.coordinates as number[])[0]
          ).toFixed(2)
        ),
      }))
      .sort((a, b) => a.distance_km - b.distance_km);

    return ok({
      results,
      query: { lat, lng, radius_km, category: category ?? null },
    })(res);
  } catch (error) {
    console.error("[workers/nearby] error:", error);
    return fail(res, "Internal error", 500);
  }
});

/**
 * GET /search — ranked worker search for a job using matching.ts.
 */
router.get(
  "/search",
  requireRole(["customer", "worker"]),
  async (req: Request, res: Response) => {
    try {
      const parsed = searchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return fail(res, "Invalid query parameters", 400, parsed.error.flatten().fieldErrors);
      }

      const { category, lat, lng, radius_km, urgency, required_skills, limit } = parsed.data;

      const results = await getWorkerResults({
        category: category as any,
        lat,
        lng,
        radius_km,
        urgency: urgency as any,
        required_skills,
        limit,
      });

      return ok({
        results,
        query: { category, lat, lng, radius_km, urgency },
      })(res);
    } catch (error) {
      console.error("[workers/search] error:", error);
      return fail(res, "Internal error", 500);
    }
  }
);

/**
 * GET /:id/dashboard — worker dashboard payload.
 */
router.get("/:id/dashboard", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const workerId = String(req.params.id).trim();
  if (!workerId) {
    return fail(res, "Worker id is required", 400);
  }

  try {
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }
    if (String(worker._id) !== workerId) {
      return fail(res, "Worker not found", 404);
    }

    const data = await getWorkerDashboard(workerId);
    return ok(data)(res);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(res, e.message, e.statusCode, { code: e.code });
    }
    console.error("[workers/:id/dashboard] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * POST /me/photos — worker photo upload (base64 JPEG/PNG <= 2MB).
 */
router.post("/me/photos", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;

  const parsed = photoUploadSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid photo upload", 400, parsed.error.flatten().fieldErrors);
  }

  await connectDB();

  try {
    const upload = await Upload.create({
      owner_id: sessionUser.user._id,
      mime: parsed.data.mime,
      size: parsed.data.data.length,
      data: parsed.data.data,
    });
    return ok({ photo_id: String(upload._id) }, 201)(res);
  } catch (e) {
    console.error("[workers/me/photos] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * PATCH /me/location — worker live-location ping during a job.
 */
router.patch("/me/location", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;

  const parsed = locationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();

    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }

    const coordinates: [number, number] = [parsed.data.lng, parsed.data.lat];
    const hasServiceArea =
      worker.service_area?.type === "Polygon" &&
      Array.isArray(worker.service_area.coordinates) &&
      worker.service_area.coordinates.length > 0;
    const locationFilter = hasServiceArea
      ? {
          _id: worker._id,
          service_area: {
            $geoIntersects: {
              $geometry: { type: "Point", coordinates },
            },
          },
        }
      : { _id: worker._id };
    const updated = await Worker.findOneAndUpdate(
      locationFilter,
      {
        $set: {
          location: { type: "Point", coordinates },
          location_updated_at: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return fail(res, "Location is outside your service area", 403);
    }

    // Broadcast to the active job's socket room so customers receive real-time
    // updates even when the worker's socket transport falls back to HTTP.
    const activeJobId = updated.active_job_id ? String(updated.active_job_id) : null;
    if (activeJobId) {
      const io = getIO();
      if (io) {
        const job = await Job.findById(activeJobId).lean();
        if (job) {
          const target = getTrackingTarget(job);
          if (target) {
            const [targetLng, targetLat] = target;
            const distanceKm = haversineDistanceKm(
              parsed.data.lat,
              parsed.data.lng,
              targetLat,
              targetLng,
            );
            io.to(`job:${activeJobId}`).emit("location-update", {
              jobId: activeJobId,
              workerId: String(worker._id),
              lat: parsed.data.lat,
              lng: parsed.data.lng,
              targetLat,
              targetLng,
              distanceKm: Math.round(distanceKm * 100) / 100,
              distanceMeters: Math.round(distanceKm * 1000),
              etaMinutes: estimateETAMinutes(distanceKm),
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    return ok({
      location: updated.location,
      location_updated_at: updated.location_updated_at,
    })(res);
  } catch (e) {
    console.error("[workers/me/location] error:", e);
    return fail(res, "Internal error", 500);
  }
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: z.enum(WORKER_CATEGORIES).optional(),
  skills: z.array(z.string().trim().max(50)).max(10).optional(),
});

/**
 * PATCH /me/profile — update worker profile details (name, category, skills).
 */
router.patch("/me/profile", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;

  const parsed = profileUpdateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  if (Object.keys(parsed.data).length === 0) {
    return fail(res, "No fields to update", 400);
  }

  try {
    await connectDB();
    const worker = await Worker.findOneAndUpdate(
      { user_id: sessionUser.user._id },
      { $set: parsed.data },
      { new: true },
    ).lean();

    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }

    return ok({
      id: String(worker._id),
      name: worker.name,
      category: worker.category,
      skills: worker.skills ?? [],
    })(res);
  } catch (error) {
    console.error("[workers/me/profile] error:", error);
    return fail(res, "Internal error", 500);
  }
});

/**
 * PATCH /me/availability — worker availability toggle.
 */
router.patch("/me/availability", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;

  const parsed = availabilitySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();

    const worker = await Worker.findOneAndUpdate(
      { user_id: sessionUser.user._id },
      { $set: parsed.data },
      { new: true }
    ).lean();

    if (!worker) {
      return fail(res, "Worker profile not found for this account", 404);
    }

    return ok({
      is_available: worker.is_available,
      is_online: worker.is_online,
      emergency_available: worker.emergency_available,
      location_updated_at: worker.location_updated_at,
    })(res);
  } catch (error) {
    console.error("[workers/me/availability] error:", error);
    return fail(res, "Internal error", 500);
  }
});

/**
 * GET /:id/completed-jobs — list of completed jobs with earnings for the worker.
 */
router.get("/:id/completed-jobs", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const workerId = String(req.params.id).trim();
  if (!workerId) {
    return fail(res, "Worker id is required", 400);
  }

  try {
    await connectDB();
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker || String(worker._id) !== workerId) {
      return fail(res, "Worker not found", 404);
    }

    const jobs = await Job.find({
      "matching.selected_worker_id": worker._id,
      status: { $in: ["COMPLETED", "AWAITING_CUSTOMER_CONFIRMATION"] },
    })
      .sort({ updated_at: -1 })
      .lean();

    const completed = jobs.map((job) => ({
      id: String(job._id),
      category: job.understanding?.category ?? "",
      subcategory: job.understanding?.subcategory ?? "",
      description: job.understanding?.description ?? "",
      address_label: job.location?.address_label ?? "",
      final_price: job.pricing?.final_price ?? job.pricing?.customer_offer ?? 0,
      currency: job.pricing?.currency ?? "PKR",
      status: job.status,
      created_at: new Date(job.created_at).toISOString(),
      completed_at: job.status === "COMPLETED"
        ? new Date(job.updated_at).toISOString()
        : null,
    }));

    return ok({ completed_jobs: completed })(res);
  } catch (e) {
    console.error("[workers/:id/completed-jobs] error:", e);
    return fail(res, "Internal error", 500);
  }
});

/**
 * GET /:id/reviews — list of reviews for the worker.
 */
router.get("/:id/reviews", requireRole(["worker"]), async (req: Request, res: Response) => {
  const sessionUser = res.locals.sessionUser;
  const workerId = String(req.params.id).trim();
  if (!workerId) {
    return fail(res, "Worker id is required", 400);
  }

  try {
    await connectDB();
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker || String(worker._id) !== workerId) {
      return fail(res, "Worker not found", 404);
    }

    const reviews = await Review.find({ worker_id: worker._id })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    const reviewData = reviews.map((r) => ({
      id: String(r._id),
      job_id: String(r.job_id),
      rating: r.rating,
      tags: r.tags ?? [],
      text: r.text ?? "",
      created_at: new Date(r.created_at).toISOString(),
    }));

    const totalReviews = await Review.countDocuments({ worker_id: worker._id });
    const avgRating = reviewData.length > 0
      ? reviewData.reduce((sum, r) => sum + r.rating, 0) / reviewData.length
      : 0;

    return ok({
      reviews: reviewData,
      total_reviews: totalReviews,
      average_rating: Math.round(avgRating * 10) / 10,
    })(res);
  } catch (e) {
    console.error("[workers/:id/reviews] error:", e);
    return fail(res, "Internal error", 500);
  }
});

export { router as workerRoutes };
