import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { requireRole } from "../../lib/auth-middleware.js";
import { createDirectRequest, respondToDirectRequest, respondToCounter, RequestError } from "../../lib/job/requests.js";
import { Job, Offer, Worker } from "../../models/index.js";
const router = Router();
const createRequestSchema = z.object({
    worker_id: z.string().min(1),
    proposed_price: z.number().positive(),
    message: z.string().max(500).optional(),
    understanding: z.object({
        category: z.string(),
        subcategory: z.string().optional(),
        description: z.string().optional(),
        required_skills: z.array(z.string()).optional(),
        urgency: z.string().optional(),
        confidence: z.number().optional(),
        estimate_min: z.number().optional(),
        estimate_max: z.number().optional(),
        inspection_fee: z.number().optional(),
    }),
    input: z.object({
        type: z.enum(["voice", "text", "photo"]),
        original_text: z.string().optional(),
        transcript: z.string().optional(),
        photo_ids: z.array(z.string()).optional(),
    }),
    location: z
        .object({
        coordinates: z.tuple([z.number(), z.number()]).nullable().optional(),
        address_label: z.string().optional(),
        search_radius_km: z.number().optional(),
    })
        .optional(),
});
const respondSchema = z.object({
    offer_id: z.string().min(1),
    action: z.enum(["accept", "counter_offer", "decline"]),
    counter_price: z.number().positive().optional(),
    message: z.string().max(500).optional(),
});
const counterResponseSchema = z.object({
    offer_id: z.string().min(1),
    action: z.enum(["accept", "decline"]),
});
/**
 * POST / — customer sends a targeted request with a proposed price to a specific technician.
 */
router.post("/", requireRole(["customer"]), async (req, res) => {
    const sessionUser = res.locals.sessionUser;
    const parsed = createRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
    }
    try {
        const result = await createDirectRequest(String(sessionUser.user._id), parsed.data);
        return ok(result, 201)(res);
    }
    catch (e) {
        if (e instanceof RequestError) {
            return fail(res, e.message, e.statusCode, { code: e.code });
        }
        console.error("[requests] createDirectRequest failed:", e);
        return fail(res, "Internal error", 500);
    }
});
/**
 * GET /list — lists the customer's recent direct requests with negotiation status.
 */
router.get("/list", requireRole(["customer"]), async (req, res) => {
    const sessionUser = res.locals.sessionUser;
    try {
        await connectDB();
        const jobs = await Job.find({
            customer_id: sessionUser.user._id,
            status: {
                $in: [
                    "BROADCASTING",
                    "ACCEPTED",
                    "CANCELLED",
                    "WORKER_RESPONSES",
                    "EN_ROUTE",
                    "ARRIVED",
                    "IN_PROGRESS",
                    "AWAITING_CUSTOMER_CONFIRMATION",
                    "COMPLETED",
                ],
            },
        })
            .sort({ created_at: -1 })
            .limit(20)
            .lean();
        if (jobs.length === 0) {
            return ok({ requests: [] })(res);
        }
        const jobIds = jobs.map((j) => j._id);
        const workerIds = jobs
            .map((j) => j.matching?.selected_worker_id)
            .filter(Boolean);
        const [offers, workers] = await Promise.all([
            Offer.find({ job_id: { $in: jobIds } })
                .sort({ created_at: -1 })
                .lean(),
            workerIds.length > 0
                ? Worker.find({ _id: { $in: workerIds } })
                    .select("name location")
                    .lean()
                : [],
        ]);
        const workerNameMap = new Map(workers.map((w) => {
            const coordinates = w.location?.coordinates;
            return [
                String(w._id),
                {
                    name: w.name ?? "Ustad",
                    lat: coordinates?.[1] ?? null,
                    lng: coordinates?.[0] ?? null,
                },
            ];
        }));
        const offersByJob = new Map();
        for (const o of offers) {
            const jid = String(o.job_id);
            if (!offersByJob.has(jid))
                offersByJob.set(jid, []);
            offersByJob.get(jid).push(o);
        }
        const requests = jobs.map((job) => {
            const jid = String(job._id);
            const jobOffers = offersByJob.get(jid) ?? [];
            const latestOffer = jobOffers[0];
            const workerId = job.matching?.selected_worker_id
                ? String(job.matching.selected_worker_id)
                : null;
            const worker = workerId ? workerNameMap.get(workerId) : null;
            const destinationCoordinates = job.location?.coordinates;
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
                destination_lat: destinationCoordinates?.[1] ?? null,
                destination_lng: destinationCoordinates?.[0] ?? null,
                worker_lat: worker?.lat ?? null,
                worker_lng: worker?.lng ?? null,
                precomputed_route: job.route?.polyline ?? null,
                route_distance_meters: job.route?.distance_meters ?? null,
                route_duration_seconds: job.route?.duration_seconds ?? null,
                created_at: new Date(job.created_at).toISOString(),
                worker_name: worker?.name ?? null,
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
        return ok({ requests })(res);
    }
    catch (error) {
        console.error("[requests/list] error:", error);
        return fail(res, "Internal error", 500);
    }
});
/**
 * POST /respond — worker responds to a direct customer request.
 */
router.post("/respond", requireRole(["worker"]), async (req, res) => {
    const sessionUser = res.locals.sessionUser;
    const parsed = respondSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
    }
    if (parsed.data.action === "counter_offer" && !parsed.data.counter_price) {
        return fail(res, "counter_price is required for counter-offers", 400);
    }
    try {
        const result = await respondToDirectRequest(String(sessionUser.user._id), parsed.data.offer_id, {
            action: parsed.data.action,
            counter_price: parsed.data.counter_price,
            message: parsed.data.message,
        });
        return ok(result)(res);
    }
    catch (e) {
        if (e instanceof RequestError) {
            return fail(res, e.message, e.statusCode, { code: e.code });
        }
        console.error("[requests/respond] error:", e);
        return fail(res, "Internal error", 500);
    }
});
/**
 * POST /counter-response — customer responds to a worker's counter-offer.
 */
router.post("/counter-response", requireRole(["customer"]), async (req, res) => {
    const sessionUser = res.locals.sessionUser;
    const parsed = counterResponseSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
    }
    try {
        const result = await respondToCounter(String(sessionUser.user._id), parsed.data.offer_id, { action: parsed.data.action });
        return ok(result)(res);
    }
    catch (e) {
        if (e instanceof RequestError) {
            return fail(res, e.message, e.statusCode, { code: e.code });
        }
        console.error("[requests/counter-response] error:", e);
        return fail(res, "Internal error", 500);
    }
});
/**
 * POST /:id/respond — worker responds to a direct customer request (same as /respond but with id param).
 */
router.post("/:id/respond", requireRole(["worker"]), async (req, res) => {
    const sessionUser = res.locals.sessionUser;
    const parsed = respondSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return fail(res, "Invalid request", 400, parsed.error.flatten().fieldErrors);
    }
    if (parsed.data.action === "counter_offer" && !parsed.data.counter_price) {
        return fail(res, "counter_price is required for counter-offers", 400);
    }
    try {
        const result = await respondToDirectRequest(String(sessionUser.user._id), parsed.data.offer_id, {
            action: parsed.data.action,
            counter_price: parsed.data.counter_price,
            message: parsed.data.message,
        });
        return ok(result)(res);
    }
    catch (e) {
        if (e instanceof RequestError) {
            return fail(res, e.message, e.statusCode, { code: e.code });
        }
        console.error("[requests/:id/respond] error:", e);
        return fail(res, "Internal error", 500);
    }
});
export { router as requestRoutes };
//# sourceMappingURL=index.js.map