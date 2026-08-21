"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@/lib/worker/dashboard";
import { useJobStream } from "@/lib/useJobStream";
import { motion } from "framer-motion";
import ActiveJobPanel from "./ActiveJobPanel";

const POLL_MS = 10000;

export default function WorkerActiveJob({ workerId }: { workerId: string }) {
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: WorkerDashboardData;
      } | null;
      if (!res.ok || !body?.success) throw new Error("Failed to load");
      setData(body.data ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  useJobStream(data?.active_job?._id ?? null, () => void refresh());

  const activeJob = data?.active_job ?? null;

  return (
    <div className="space-y-4">
      {activeJob ? (
        <ActiveJobPanel job={activeJob} onChanged={() => void refresh()} />
      ) : (
        <motion.div className="card flex flex-col items-center gap-3 py-12 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
            <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">No active job</p>
            <p className="text-xs text-muted">Accept a job to get started</p>
          </div>
          <a href="/dashboard/worker/jobs" className="btn-primary text-sm">
            Browse jobs
          </a>
        </motion.div>
      )}

      {error && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">{error}</p>
      )}
    </div>
  );
}
