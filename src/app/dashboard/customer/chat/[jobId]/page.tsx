import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Job } from "@/models";
import CustomerChatPageClient from "./CustomerChatPageClient";

export const dynamic = "force-dynamic";

interface ChatPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function CustomerChatPage({ params }: ChatPageProps) {
  let session;
  try {
    session = await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  const { jobId } = await params;
  await connectDB();

  const job = await Job.findOne({ _id: jobId, customer_id: session.user._id }).lean();
  if (!job) notFound();

  const status = job.status as string;
  if (!["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION"].includes(status)) {
    notFound();
  }

  return (
    <CustomerChatPageClient
      jobId={jobId}
      originalText={job.input?.original_text ?? ""}
    />
  );
}
