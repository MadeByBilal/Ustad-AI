import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Worker } from "@/models";
import WorkerJobsList from "@/components/worker/WorkerJobsList";
import { T } from "@/components/ui/T";

export const dynamic = "force-dynamic";

export default async function WorkerJobsPage() {
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

  return (
    <>
      <div className="page-header">
        <h1 className="font-display text-lg font-bold text-text"><T k="availableJobs" /></h1>
      </div>
      <div className="page-content">
        <WorkerJobsList workerId={String(worker._id)} />
      </div>
    </>
  );
}
