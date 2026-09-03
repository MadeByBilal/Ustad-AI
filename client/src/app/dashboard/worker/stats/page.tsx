"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkerStatsPageClient from "@/client/components/worker/WorkerStatsPageClient";
import TranslatedHeading from "@/client/components/TranslatedHeading";

interface WorkerData {
  workerId: string;
  worker: {
    completed_jobs: number;
    average_rating: number;
    repeat_customers: number;
  };
}

export default function WorkerStatsPage() {
  const router = useRouter();
  const [workerData, setWorkerData] = useState<WorkerData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meBody: { success?: boolean; data?: { user?: { id?: string } } } = await meRes.json();
        if (!meBody?.success || !meBody.data?.user) {
          router.push("/login");
          return;
        }

        const workerRes = await fetch(`/api/workers/by-user/${meBody.data.user.id}`);
        const workerBody: { success?: boolean; data?: { _id?: string } } = await workerRes.json();
        if (!workerBody?.success || !workerBody.data?._id) {
          router.push("/login");
          return;
        }

        const workerId = workerBody.data._id;

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
  }, [router]);

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
    <div className="relative">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-success/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-accent/6 blur-3xl" />
      <div className="page-header">
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
