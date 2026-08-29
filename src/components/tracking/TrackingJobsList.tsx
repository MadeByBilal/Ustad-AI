"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n/context";

const POLL_MS = 5000;

interface TrackingJob {
  job_id: string;
  status: string;
  category: string;
  original_text: string;
  worker_name: string;
  distance_km: number | null;
  eta_minutes: number | null;
}

export default function TrackingJobsList() {
  const { t } = useLang();
  const [jobs, setJobs] = useState<TrackingJob[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/list", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!body?.success) return;

      const trackingJobs = (body.data?.requests ?? [])
        .filter((r: { status: string }) =>
          ["ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(r.status)
        )
        .map((r: {
          job_id: string;
          status: string;
          category: string;
          original_text: string;
          worker_name?: string;
        }) => ({
          job_id: r.job_id,
          status: r.status,
          category: r.category,
          original_text: r.original_text,
          worker_name: r.worker_name ?? "Ustad",
          distance_km: null,
          eta_minutes: null,
        }));

      setJobs(trackingJobs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div className="card flex flex-col items-center gap-3 py-12 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
          <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted">{t("noActiveTracking")}</p>
        <p className="text-xs text-muted">{t("trackingWillAppearList")}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Link
          key={job.job_id}
          href={`/dashboard/customer/track/${job.job_id}`}
          className="block"
        >
          <motion.div className="card transition-all active:scale-[0.98]" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15">
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
                  </span>
                  <span className="text-xs font-bold text-accent">
                    {job.status === "ACCEPTED" ? t("accepted") : job.status === "EN_ROUTE" ? t("onTheWay") : t("arrived")}
                  </span>
                </div>
                <p className="mt-1 font-urdu text-sm font-bold text-text">
                  {job.worker_name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                  {job.original_text}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-surface px-3 py-2.5">
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-sm font-semibold text-accent">
                {t("openLiveMap")}
              </span>
              <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
