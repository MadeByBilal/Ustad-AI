import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/server/lib/mongodb";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError, createAndAnalyzeJob } from "@/server/lib/job/flow";
import { Job, Worker, URGENCY_LEVELS, WORKER_CATEGORIES } from "@/server/models";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  scope: z.enum(["customer", "worker"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Job feed per role:
 * - customer: their own jobs, newest first
 * - worker: jobs currently in BROADCASTING (foundation for the
 *   acceptance flow; a worker's own accepted job is also returned)
 */
export async function GET(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer", "worker"]);
  } catch (e) {
    return authError(e);
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, parsed.error.flatten().fieldErrors);
  }

  await connectDB();

  const scope = parsed.data.scope ?? sessionUser.user.role;
  const limit = parsed.data.limit;

  let jobs: unknown[] = [];

  if (scope === "customer") {
    jobs = await Job.find({ customer_id: sessionUser.user._id })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
  } else {
    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail("Worker profile not found for this account", 404);
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

  return ok({ scope, jobs });
}

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
  .refine(
    (v) => {
      const hasText = v.original_text.trim().length > 0;
      if (v.type === "text") {
        return hasText;
      }
      if (v.type === "voice") {
        return hasText || Boolean(v.transcript && v.transcript.trim().length > 0);
      }
      return hasText || Boolean(v.photo_ids && v.photo_ids.length > 0);
    },
    {
      message: "Describe the problem using text, a voice note or a photo",
      path: ["original_text"],
    }
  );

/**
 * Customer describes a problem; the job is created and run through the
 * analysis pipeline, landing at WAITING_FOR_CUSTOMER with a summary.
 */
export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return fail("Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  await connectDB();

  try {
    const job = await createAndAnalyzeJob(String(sessionUser.user._id), parsed.data);
    return ok(job, 201);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("create job failed:", e);
    return fail("Internal error", 500);
  }
}