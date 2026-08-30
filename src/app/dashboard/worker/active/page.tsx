import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Worker } from "@/models";
import WorkerActiveTracking from "@/components/worker/WorkerActiveTracking";

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
    <div className="h-full">
      <WorkerActiveTracking workerId={String(worker._id)} />
    </div>
  );
}
