import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { authError, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { Worker } from "@/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Worker live-location ping during a job. The update is restricted to the
 * worker's service area using a geospatial query.
 */
export async function PATCH(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker"]);
  } catch (e) {
    return authError(e);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await connectDB();

    const worker = await Worker.findOne({ user_id: sessionUser.user._id }).lean();
    if (!worker) {
      return fail("Worker profile not found for this account", 404);
    }

    const coordinates: [number, number] = [parsed.data.lng, parsed.data.lat];
    const updated = await Worker.findOneAndUpdate(
      {
        _id: worker._id,
        service_area: {
          $geoIntersects: {
            $geometry: { type: "Point", coordinates },
          },
        },
      },
      {
        $set: {
          location: { type: "Point", coordinates },
          location_updated_at: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return fail("Location is outside your service area", 403);
    }

    return ok({
      location: updated.location,
      location_updated_at: updated.location_updated_at,
    });
  } catch (e) {
    console.error("location update failed:", e);
    return fail("Internal error", 500);
  }
}