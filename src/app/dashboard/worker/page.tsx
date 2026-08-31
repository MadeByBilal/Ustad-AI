import { redirect } from "next/navigation";
import { requireRole } from "@/server/lib/auth";
import { connectDB } from "@/server/lib/mongodb";
import { Worker } from "@/server/models";
import WorkerHome from "@/client/components/worker/WorkerHome";
import TranslatedHeading from "@/client/components/TranslatedHeading";

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
        <TranslatedHeading translationKey="home" />
      </div>
      <div className="page-content">
        <WorkerHome workerId={String(worker._id)} />
      </div>
    </>
  );
}
