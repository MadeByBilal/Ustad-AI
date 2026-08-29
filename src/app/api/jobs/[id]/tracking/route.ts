import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Job, Worker } from "@/models";
import { haversineDistanceKm, estimateETAMinutes } from "@/lib/geo";
import { authError, fail, ok } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer", "worker"]);
  } catch (error) {
    return authError(error);
  }

  try {
    const userId = String(sessionUser.user._id);
    const role = sessionUser.user.role as string;
    const { id: jobId } = await params;

    await connectDB();

    const job = await Job.findOne({ _id: jobId }).lean();
    if (!job) {
      return fail("Job not found", 404, undefined, "job_not_found", "کام نہیں ملا");
    }

    // Jobs store the worker profile id, while the session contains the user id.
    // Resolve the profile before checking worker access.
    let workerProfileId: string | null = null;
    if (role === "worker") {
      const workerProfile = await Worker.findOne({ user_id: userId })
        .select("_id")
        .lean();
      workerProfileId = workerProfile ? String(workerProfile._id) : null;
    }

    // Access check: customer owns the job or worker is assigned
    const isCustomer = role === "customer" && String(job.customer_id) === userId;
    const isWorker =
      role === "worker" &&
      String(job.matching?.selected_worker_id) === workerProfileId;

    if (!isCustomer && !isWorker) {
      return fail("Unauthorized", 403, undefined, "unauthorized", "اجازت نہیں ہے");
    }

    // Get worker location
    const workerId = job.matching?.selected_worker_id;
    if (!workerId) {
      return ok({ status: job.status });
    }

    const worker = await Worker.findOne({ _id: workerId })
      .select("name location location_updated_at")
      .lean();

    if (!worker?.location?.coordinates || worker.location.coordinates.length !== 2) {
      const destCoords = job.location?.coordinates;
      return ok({
        status: job.status,
        worker_name: worker?.name ?? "Ustad",
        destination_lat: destCoords?.[1] ?? null,
        destination_lng: destCoords?.[0] ?? null,
        destination_label: job.location?.address_label ?? null,
        before_photo_id: job.completion?.before_photo_id ?? null,
        after_photo_id: job.completion?.after_photo_id ?? null,
        note: job.completion?.note ?? null,
        precomputed_route: job.route?.polyline ?? null,
        route_distance_meters: job.route?.distance_meters ?? null,
        route_duration_seconds: job.route?.duration_seconds ?? null,
      });
    }

    const [workerLng, workerLat] = worker.location.coordinates;
    const destCoords = job.location?.coordinates;

    let distanceKm: number | null = null;
    let etaMinutes: number | null = null;

    if (destCoords && destCoords.length === 2) {
      const [destLng, destLat] = destCoords;
      distanceKm = Math.round(haversineDistanceKm(workerLat, workerLng, destLat, destLng) * 100) / 100;
      etaMinutes = estimateETAMinutes(distanceKm);
    }

    return ok({
      status: job.status,
      worker_name: worker.name ?? "Ustad",
      worker_lat: workerLat,
      worker_lng: workerLng,
      worker_location_updated_at: worker.location_updated_at,
      distance_km: distanceKm,
      eta_minutes: etaMinutes,
      destination_lat: destCoords?.[1] ?? null,
      destination_lng: destCoords?.[0] ?? null,
      destination_label: job.location?.address_label ?? null,
      before_photo_id: job.completion?.before_photo_id ?? null,
      after_photo_id: job.completion?.after_photo_id ?? null,
      note: job.completion?.note ?? null,
      precomputed_route: job.route?.polyline ?? null,
      route_distance_meters: job.route?.distance_meters ?? null,
      route_duration_seconds: job.route?.duration_seconds ?? null,
    });
  } catch (error) {
    console.error("[tracking] error:", error);
    return fail("Internal error", 500, undefined, "internal_error", "اندرونی خرابی ہوئی ہے");
  }
}
