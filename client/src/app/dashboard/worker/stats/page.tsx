"use client";

import { useEffect, useState } from "react";
import WorkerStatsPageClient from "@/client/components/worker/WorkerStatsPageClient";
import TranslatedHeading from "@/client/components/TranslatedHeading";
import { useWorker } from "@/client/lib/session";

interface WorkerData {
  workerId: string;
  worker: {
    completed_jobs: number;
    average_rating: number;
    repeat_customers: number;
  };
}

export default function WorkerStatsPage() {
  const worker = useWorker();
  const [workerData, setWorkerData] = useState<WorkerData | null | undefined>(undefined);

  useEffect(() => {
    if (!worker) return;
    const workerId = worker._id;
    let cancelled = false;

    async function load() {
      try {
        const dashRes = await fetch(`/api/workers/${workerId}/dashboard`);
        const dashBody: { success?: boolean; data?: { worker?: WorkerData["worker"] } } = await dashRes.json();

        if (!cancelled) {
          if (dashBody?.success && dashBody.data?.worker) {
            setWorkerData({
              workerId,
              worker: dashBody.data.worker,
            });
          } else {
            setWorkerData(null);
          }
        }
      } catch {
        if (!cancelled) setWorkerData(null);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [worker]);

  if (workerData === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  if (!workerData) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted">Failed to load stats</p>
      </div>
    );
  }

  return (
    <div className="relative"><div className="page-header">
        <TranslatedHeading translationKey="stats" />
      </div>
      <div className="page-content">
        <WorkerStatsPageClient
          workerId={workerData.workerId}
          initialCompletedJobs={workerData.worker.completed_jobs}
          initialAverageRating={workerData.worker.average_rating}
          initialRepeatCustomers={workerData.worker.repeat_customers}
        />
      </div>
    </div>
  );
}
