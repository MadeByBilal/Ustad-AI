import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Worker, Job } from "@/models";
import WorkerWorkPageClient from "./WorkerWorkPageClient";
import WorkPageEmpty from "./WorkPageEmpty";
import { T } from "@/components/ui/T";

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
      <>
        <div className="page-header">
          <h1 className="font-display text-lg font-bold text-text"><T k="work" /></h1>
        </div>
        <div className="page-content">
          <WorkPageEmpty />
        </div>
      </>
    );
  }

  const status = activeJob.status as string;

  return (
    <>
      <div className="page-header">
        <h1 className="font-display text-lg font-bold text-text"><T k="work" /></h1>
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
    </>
  );
}
