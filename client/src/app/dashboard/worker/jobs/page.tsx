"use client";

import WorkerJobsList from "@/client/components/worker/WorkerJobsList";
import TranslatedHeading from "@/client/components/TranslatedHeading";
import { useWorker } from "@/client/lib/session";

export default function WorkerJobsPage() {
  const worker = useWorker();

  if (!worker) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="relative"><div className="page-header">
        <TranslatedHeading translationKey="availableJobs" />
      </div>
      <div className="page-content">
        <WorkerJobsList workerId={worker._id} />
      </div>
    </div>
  );
}
