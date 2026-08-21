import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Job, Worker } from "@/models";
import TrackingPageClient from "./TrackingPageClient";

export const dynamic = "force-dynamic";

interface TrackingPageProps {
  params: Promise<{ jobId: string }>;
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

  const job = await Job.findOne({ _id: jobId, customer_id: sessionUser.user._id }).lean();
  if (!job) notFound();

  const status = job.status as string;
  if (!["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(status)) {
    notFound();
  }

  // Get worker info
  const workerId = job.matching?.selected_worker_id;
  let workerName = "Ustad";

  if (workerId) {
    const worker = await Worker.findOne({ _id: workerId }).lean();
    if (worker) {
      workerName = worker.name ?? "Ustad";
    }
  }

  // Job destination coordinates [lng, lat]
  const destCoords = job.location?.coordinates;
  const destination = destCoords && destCoords.length === 2
    ? { lat: destCoords[1], lng: destCoords[0], label: job.location?.address_label ?? "Destination" }
    : null;

  return (
    <TrackingPageClient
      jobId={jobId}
      jobStatus={status}
      workerName={workerName}
      destination={destination}
      originalText={job.input?.original_text ?? ""}
      category={job.understanding?.category ?? ""}
    />
  );
}
