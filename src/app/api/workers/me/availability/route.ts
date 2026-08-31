import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/server/lib/mongodb";
import { authError, fail, ok } from "@/server/lib/api";
import { requireRole } from "@/server/lib/auth";
import { Worker } from "@/server/models";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  is_available: z.boolean().optional(),
  is_online: z.boolean().optional(),
  emergency_available: z.boolean().optional(),
});

/**
 * Worker availability toggle (foundation for the realtime broadcast flow).
 * Only workers can update their own profile.
 */
export async function PATCH(req: NextRequest) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["worker"]);
  } catch (e) {
    return authError(e);
  }

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return fail("Invalid request", 400, parsed.error.flatten().fieldErrors);
    }

    await connectDB();

    const worker = await Worker.findOneAndUpdate(
      { user_id: sessionUser.user._id },
      { $set: parsed.data },
      { new: true }
    ).lean();

    if (!worker) {
      return fail("Worker profile not found for this account", 404);
    }

    return ok({
      is_available: worker.is_available,
      is_online: worker.is_online,
      emergency_available: worker.emergency_available,
      location_updated_at: worker.location_updated_at,
    });
  } catch (error) {
    console.error("[workers/availability] error:", error);
    return fail("Internal error", 500);
  }
}
