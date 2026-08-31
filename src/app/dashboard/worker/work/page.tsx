import { redirect } from "next/navigation";
import { requireRole } from "@/server/lib/auth";
import { connectDB } from "@/server/lib/mongodb";
import { Worker, Job } from "@/server/models";
import WorkerWorkPageClient from "./WorkerWorkPageClient";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export const dynamic = "force-dynamic";

export default async function WorkerWorkPage() {
  let session;
  try {
    session = await requireRole(["worker"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  await connectDB();
  const worker = await Worker.findOne({ user_id: session.user._id }).lean();
  if (!worker) {
    redirect("/login");
    throw new Error("unreachable");
  }

  const activeJob = worker.active_job_id
    ? await Job.findOne({ _id: worker.active_job_id }).lean()
    : null;

  if (!activeJob) {
    return (
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
        <div className="page-header">
          <TranslatedHeading translationKey="work" />
        </div>
        <div className="page-content">
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
              <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted">No active job</p>
            <p className="text-xs text-muted">Accept a job to start working</p>
          </div>
        </div>
      </div>
    );
  }

  const status = activeJob.status as string;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
      <div className="page-header">
        <TranslatedHeading translationKey="work" />
      </div>
        <div className="page-content">
        <WorkerWorkPageClient
          jobId={String(activeJob._id)}
          jobStatus={status}
          originalText={activeJob.input?.original_text ?? ""}
          completion={activeJob.completion ? {
            before_photo_id: activeJob.completion.before_photo_id ?? null,
            after_photo_id: activeJob.completion.after_photo_id ?? null,
            note: activeJob.completion.note ?? null,
          } : null}
        />
      </div>
    </div>
  );
}
