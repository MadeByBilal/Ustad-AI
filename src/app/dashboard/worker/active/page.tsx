import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Worker } from "@/models";
import WorkerActiveJob from "@/components/worker/WorkerActiveJob";

export const dynamic = "force-dynamic";

export default async function WorkerActivePage() {
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
    <div className="page">
      <div className="page-header">
        <h1 className="text-lg font-bold text-stone-900">Active Job</h1>
      </div>
      <div className="page-content">
        <WorkerActiveJob workerId={String(worker._id)} />
      </div>
    </div>
  );
}
