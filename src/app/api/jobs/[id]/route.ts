import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { FlowError, reanalyzeJob } from "@/server/lib/job/flow";
import { getJobDetail } from "@/server/lib/job/detail";
import { URGENCY_LEVELS, WORKER_CATEGORIES } from "@/server/models";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    type: z.enum(["voice", "text", "photo"]).default("text"),
    original_text: z.string().trim().max(2000).optional(),
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

/**
 * Single-job view used by the customer results screen (responders + offers
 * + deadlines) and the worker feed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer", "worker"]);
  } catch (e) {
    return authError(e);
  }

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  try {
    const detail = await getJobDetail(jobId, String(sessionUser.user._id));
    return ok(detail);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("get job failed:", e);
    return fail("Internal error", 500);
  }
}

/**
 * Customer edits their problem description while the job is still at
 * WAITING_FOR_CUSTOMER; analysis runs again and the summary refreshes.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  const jobId = params.id.trim();
  if (!jobId) {
    return fail("Job id is required", 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return fail("Invalid request body", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const job = await reanalyzeJob(jobId, String(sessionUser.user._id), parsed.data);
    return ok(job);
  } catch (e) {
    if (e instanceof FlowError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("reanalyze job failed:", e);
    return fail("Internal error", 500);
  }
}