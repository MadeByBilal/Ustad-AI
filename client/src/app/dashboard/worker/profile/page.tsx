"use client";

import WorkerProfile from "@/client/components/worker/WorkerProfile";
import TranslatedHeading from "@/client/components/TranslatedHeading";
import { useWorker } from "@/client/lib/session";

export default function WorkerProfilePage() {
  const worker = useWorker();

  if (!worker) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  return (
    <div className="relative"><div className="page-header">
        <TranslatedHeading translationKey="profile" />
      </div>
      <div className="page-content">
        <WorkerProfile workerId={worker._id} />
      </div>
    </div>
  );
}
