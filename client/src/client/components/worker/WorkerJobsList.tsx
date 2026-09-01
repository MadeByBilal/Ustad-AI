"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { WorkerDashboardData } from "@contracts/worker";
import { useLang } from "@/client/lib/i18n/context";
import IncomingJobCard from "./IncomingJobCard";
import DirectRequestCard from "./DirectRequestCard";

const POLL_MS = 15000;

export default function WorkerJobsList({ workerId }: { workerId: string }) {
  const { t } = useLang();
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: WorkerDashboardData;
      } | null;
      if (!res.ok || !body?.success) throw new Error(t("error"));
      setData(body.data ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }, [workerId, t]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [refresh]);

  const incomingJobs = data?.incoming_jobs ?? [];
  const directRequests = data?.direct_requests ?? [];
  const hasAny = incomingJobs.length > 0 || directRequests.length > 0;

  return (
    <div className="space-y-4">
      {!hasAny && !error ? (
        <motion.div className="card flex flex-col items-center gap-3 py-12 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
            <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{t("noJobs")}</p>
            <p className="text-xs text-muted">{t("available")}</p>
          </div>
        </motion.div>
      ) : (
        <>
          {incomingJobs.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                {t("nearbyJobs")}
              </h2>
              <div className="space-y-3">
                {incomingJobs.map((job) => (
                  <IncomingJobCard
                    key={job.id}
                    job={job}
                    now={now}
                    onChanged={() => void refresh()}
                  />
                ))}
              </div>
            </section>
          )}

          {directRequests.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                {t("directRequests")}
              </h2>
              <div className="space-y-3">
                {directRequests.map((req) => (
                  <DirectRequestCard
                    key={req.offer_id}
                    request={req}
                    onChanged={() => void refresh()}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {error && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">{error}</p>
      )}
    </div>
  );
}
