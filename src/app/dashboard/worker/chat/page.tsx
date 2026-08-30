import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Worker } from "@/models";
import WorkerChatList from "@/components/worker/WorkerChatList";
import TranslatedHeading from "@/components/TranslatedHeading";

export const dynamic = "force-dynamic";

export default async function WorkerChatPage() {
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
    <div>
      <div className="page-header">
        <TranslatedHeading translationKey="chats" />
      </div>
      <div className="page-content">
        <WorkerChatList workerId={String(worker._id)} />
      </div>
    </div>
  );
}
