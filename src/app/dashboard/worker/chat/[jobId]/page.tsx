import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Job } from "@/models";
import WorkerChatPageClient from "./WorkerChatPageClient";

export const dynamic = "force-dynamic";

interface ChatPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function WorkerChatDetailPage({ params }: ChatPageProps) {
  let session;
  try {
    session = await requireRole(["worker"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  const { jobId } = await params;
  await connectDB();

  const job = await Job.findOne({
    _id: jobId,
    "matching.selected_worker_id": session.user._id,
  }).lean();

  if (!job) notFound();

  const status = job.status as string;
  if (!["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(status)) {
    notFound();
  }

  return (
    <WorkerChatPageClient
      jobId={jobId}
      jobStatus={status}
      originalText={job.input?.original_text ?? ""}
    />
  );
}
