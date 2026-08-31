import { redirect } from "next/navigation";
import { requireRole } from "@/server/lib/auth";
import { connectDB } from "@/server/lib/mongodb";
import { Worker } from "@/server/models";
import WorkerProfile from "@/client/components/worker/WorkerProfile";
import TranslatedHeading from "@/client/components/TranslatedHeading";

export const dynamic = "force-dynamic";

export default async function WorkerProfilePage() {
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
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />
      <div className="page-header">
        <TranslatedHeading translationKey="profile" />
      </div>
      <div className="page-content">
        <WorkerProfile workerId={String(worker._id)} />
      </div>
    </div>
  );
}
