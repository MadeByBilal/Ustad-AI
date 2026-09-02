import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../../lib/mongodb.js";
import { fail, ok } from "../../lib/api.js";
import { requireRole } from "../../lib/auth-middleware.js";
import { FlowError, createAndAnalyzeJob } from "../../lib/job/flow.js";
import { Job, Worker, URGENCY_LEVELS, WORKER_CATEGORIES } from "../../models/index.js";
import { jobIdRoutes } from "./[id].js";
const router = Router();
const querySchema = z.object({
    scope: z.enum(["customer", "worker"]).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});
router.get("/", requireRole(["customer", "worker"]), async (req, res) => {
    const sessionUser = res.locals.sessionUser;
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
        return fail(res, "Invalid query parameters", 400, parsed.error.flatten().fieldErrors);
    }
    await connectDB();
    const scope = parsed.data.scope ?? sessionUser.user.role;
    const limit = parsed.data.limit;
    let jobs = [];
    if (scope === "customer") {
        jobs = await Job.find({ customer_id: sessionUser.user._id })
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();
    }
    else {
        const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
        if (!worker) {
            return fail(res, "Worker profile not found for this account", 404);
        }
        const [ownActive, broadcast] = await Promise.all([
            worker.active_job_id
                ? Job.find({ _id: worker.active_job_id }).lean()
                : [],
            Job.find({
                status: "BROADCASTING",
                "matching.acceptance_deadline": { $gte: new Date() },
            })
                .sort({ created_at: -1 })
                .limit(limit)
                .lean(),
        ]);
        jobs = [...ownActive, ...broadcast];
    }
    return ok({ scope, jobs })(res);
});
const createSchema = z
    .object({
    type: z.enum(["voice", "text", "photo"]).default("text"),
    original_text: z.string().trim().max(2000).default(""),
    transcript: z.string().max(4000).optional(),
    photo_ids: z.array(z.string()).max(6).optional(),
    category_hint: z.enum(WORKER_CATEGORIES).nullable().optional(),
    urgency_hint: z.enum(URGENCY_LEVELS).nullable().optional(),
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
    .refine((v) => {
    const hasText = v.original_text.trim().length > 0;
    if (v.type === "text") {
        return hasText;
    }
    if (v.type === "voice") {
        return hasText || Boolean(v.transcript && v.transcript.trim().length > 0);
    }
    return hasText || Boolean(v.photo_ids && v.photo_ids.length > 0);
}, {
    message: "Describe the problem using text, a voice note or a photo",
    path: ["original_text"],
});
router.post("/", requireRole(["customer"]), async (req, res) => {
    const sessionUser = res.locals.sessionUser;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        return fail(res, "Invalid request body", 400, parsed.error.flatten().fieldErrors);
    }
    await connectDB();
    try {
        const job = await createAndAnalyzeJob(String(sessionUser.user._id), parsed.data);
        return ok(job, 201)(res);
    }
    catch (e) {
        if (e instanceof FlowError) {
            return fail(res, e.message, e.statusCode, { code: e.code });
        }
        console.error("create job failed:", e);
        return fail(res, "Internal error", 500);
    }
});
router.use("/", jobIdRoutes);
export { router as jobRoutes };
//# sourceMappingURL=index.js.map