import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Job, Worker } from "@/models";
import { haversineDistanceKm, estimateETAMinutes } from "@/lib/geo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireRole(["customer", "worker"]);
    const userId = String(sessionUser.user._id);
    const role = sessionUser.user.role as string;
    const { id: jobId } = await params;

    await connectDB();

    const job = await Job.findOne({ _id: jobId }).lean();
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // Access check: customer owns the job or worker is assigned
    const isCustomer = role === "customer" && String(job.customer_id) === userId;
    const isWorker =
      role === "worker" &&
      String(job.matching?.selected_worker_id) === userId;

    if (!isCustomer && !isWorker) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get worker location
    const workerId = job.matching?.selected_worker_id;
    if (!workerId) {
      return NextResponse.json({
        success: true,
        data: { status: job.status },
      });
    }

    const worker = await Worker.findOne({ _id: workerId })
      .select("name location location_updated_at")
      .lean();

    if (!worker?.location?.coordinates || worker.location.coordinates.length !== 2) {
      return NextResponse.json({
        success: true,
        data: { status: job.status, worker_name: worker?.name ?? "Ustad" },
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

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.error("[tracking] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
