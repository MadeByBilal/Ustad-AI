"use client";

import WorkerHome from "@/client/components/worker/WorkerHome";
import TranslatedHeading from "@/client/components/TranslatedHeading";
import { useWorker } from "@/client/lib/session";

export default function WorkerDashboardPage() {
  const worker = useWorker();

  if (!worker) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <TranslatedHeading translationKey="home" />
      </div>
      <div className="page-content">
        <WorkerHome workerId={worker._id} />
      </div>
    </>
  );
}
