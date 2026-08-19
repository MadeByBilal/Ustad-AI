import { NextRequest } from "next/server";
import { z } from "zod";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getWorkerResults } from "@/lib/matching";
import { URGENCY_LEVELS, WORKER_CATEGORIES } from "@/models";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  category: z.enum(WORKER_CATEGORIES),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(0.5).max(100).default(5),
  urgency: z.enum(URGENCY_LEVELS).default("normal"),
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

/**
 * Ranked worker search for a job: eligibility + scoring handled by
 * matching.ts, public metadata returned for the results UI.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["customer", "worker"]);
  } catch (e) {
    return authError(e);
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, parsed.error.flatten().fieldErrors);
  }

  const { category, lat, lng, radius_km, urgency, required_skills, limit } = parsed.data;

  const results = await getWorkerResults({
    category,
    lat,
    lng,
    radius_km,
    urgency,
    required_skills,
    limit,
  });

  return ok({
    results,
    query: { category, lat, lng, radius_km, urgency },
  });
}