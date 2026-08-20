import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { fail, ok } from "@/lib/api";
import { haversineDistanceKm } from "@/lib/geo";
import { Worker, WORKER_CATEGORIES } from "@/models";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(0.5).max(100).default(5),
  category: z.enum(WORKER_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * Geospatial worker search. Uses the 2dsphere index on worker.location
 * with $near, then re-sorts by exact haversine distance so result order
 * matches the real ground distance.
 */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return fail("Invalid query parameters", 400, parsed.error.flatten().fieldErrors);
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
  });
}