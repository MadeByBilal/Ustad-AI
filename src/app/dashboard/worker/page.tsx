import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Worker } from "@/models";
import WorkerHome from "@/components/worker/WorkerHome";

export const dynamic = "force-dynamic";

export default async function WorkerDashboardPage() {
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
        <h1 className="text-lg font-bold text-text">Ustad AI</h1>
      </div>
      <div className="page-content">
        <WorkerHome workerId={String(worker._id)} />
      </div>
    </>
  );
}
