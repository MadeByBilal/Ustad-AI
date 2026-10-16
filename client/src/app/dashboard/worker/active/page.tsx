"use client";

import WorkerActiveTracking from "@/client/components/worker/WorkerActiveTracking";
import { useWorker } from "@/client/lib/session";

export default function WorkerActivePage() {
  const worker = useWorker();

  if (!worker) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <WorkerActiveTracking workerId={worker._id} />
    </div>
  );
}
