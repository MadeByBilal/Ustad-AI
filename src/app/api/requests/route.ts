import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createDirectRequest, RequestError } from "@/lib/job/requests";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
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

/**
 * Customer sends a targeted request with a proposed price to a specific
 * technician after voice matching.
 */
export async function POST(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch (e) {
    return authError(e);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await createDirectRequest(
      String(sessionUser.user._id),
      parsed.data
    );
    return ok(result, 201);
  } catch (e) {
    if (e instanceof RequestError) {
      return fail(e.message, e.statusCode, { code: e.code });
    }
    console.error("createDirectRequest failed:", e);
    return fail("Internal error", 500);
  }
}
