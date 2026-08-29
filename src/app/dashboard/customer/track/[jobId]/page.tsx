import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Job, Worker } from "@/models";
import TrackingPageClient from "./TrackingPageClient";

export const dynamic = "force-dynamic";

interface TrackingPageProps {
  params: Promise<{ jobId: string }>;
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  let sessionUser;
  try {
    sessionUser = await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  const { jobId } = await params;

  await connectDB();

  const job = await Job.findOne({
    _id: jobId,
    customer_id: sessionUser.user._id,
  }).lean();
  if (!job) notFound();

  const status = job.status as string;
  if (!["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(status)) {
    notFound();
  }

  // Get worker info
  const workerId = job.matching?.selected_worker_id;
  let workerName = "Ustad";
  let initialWorkerLocation: { lat: number; lng: number } | null = null;

  if (workerId) {
    const worker = await Worker.findOne({ _id: workerId }).lean();
    if (worker) {
      workerName = worker.name ?? "Ustad";
      const workerCoords = worker.location?.coordinates as number[] | undefined;
      if (
        workerCoords?.length === 2 &&
        Number.isFinite(workerCoords[0]) &&
        Number.isFinite(workerCoords[1])
      ) {
        initialWorkerLocation = {
          lat: workerCoords[1],
          lng: workerCoords[0],
        };
      }
    }
  }

  // Job destination coordinates [lng, lat]
  const destCoords = job.location?.coordinates;
  const destination =
    destCoords && destCoords.length === 2
      ? {
          lat: destCoords[1],
          lng: destCoords[0],
          label: job.location?.address_label ?? "Destination",
        }
      : null;
  const routePoints = job.route?.polyline
    ? Array.from(job.route.polyline as unknown as unknown[]).filter(
        isCoordinatePair,
      )
    : [];
  const initialPrecomputedRoute = routePoints.length >= 2 ? routePoints : null;

  return (
    <TrackingPageClient
      jobId={jobId}
      jobStatus={status}
      workerName={workerName}
      destination={destination}
      initialWorkerLocation={initialWorkerLocation}
      initialPrecomputedRoute={initialPrecomputedRoute}
      originalText={job.input?.original_text ?? ""}
      category={job.understanding?.category ?? ""}
    />
  );
}
