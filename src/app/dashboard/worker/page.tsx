import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";
import { Worker } from "@/models";
import WorkerDashboard from "@/components/worker/WorkerDashboard";

export const dynamic = "force-dynamic";

export default async function WorkerDashboardPage() {
  const { user } = await requireRole(["worker"]).catch(() => {
    redirect("/login");
    throw new Error("unreachable");
  });

  await connectDB();

  const worker = await Worker.findOne({ user_id: user._id }).lean();
  if (!worker) {
    redirect("/login");
  }

  return (
    <WorkerDashboard workerId={String(worker!._id)} />
  );
}
