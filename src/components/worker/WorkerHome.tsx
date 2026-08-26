"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@/lib/worker/dashboard";
import { motion } from "framer-motion";
import WorkerAvailability from "@/components/WorkerAvailability";
import LocationUpdater from "./LocationUpdater";
import { useLang } from "@/lib/i18n/context";
import LanguageToggle from "@/components/LanguageToggle";

const POLL_MS = 15000;

export default function WorkerHome({ workerId }: { workerId: string }) {
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLang();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: WorkerDashboardData;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(body?.error ?? "Dashboard failed to load");
      }
      setData(body.data ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, [workerId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-accent" />
      </div>
    );
  }

  const w = data.worker;
  const hasActiveJob = !!data.active_job;
  const incomingCount = data.incoming_jobs.length;
  const directCount = data.direct_requests.length;
  const pendingCount = incomingCount + directCount;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-urdu text-3xl font-bold">{t("peace").replace("{name}", w.name)}</h1>
          <p className="mt-1 text-base capitalize text-muted">
            {w.category.replace(/_/g, " ")}
          </p>
        </div>
        <LanguageToggle />
      </div>

      {/* Current work status */}
      <motion.div className="card flex items-center justify-between gap-4 border-accent/30 bg-accent/10" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("workStatus")}</p>
          <p className="mt-1 text-base font-bold text-text">
            {hasActiveJob ? t("activeJobDesc") : w.is_available ? t("readyForWork") : t("notAccepting")}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${w.is_online && w.is_available ? "bg-success text-success-fg" : "bg-surface text-muted"}`}>
          {w.is_online && w.is_available ? t("online") : t("offline")}
        </span>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <motion.div className="card py-5 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <p className="text-3xl font-extrabold text-accent">{w.ustad_score}</p>
          <p className="mt-1 text-xs text-muted">{t("ustadScore")}</p>
        </motion.div>
        <motion.div className="card py-5 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <p className="text-3xl font-extrabold text-text">{w.completed_jobs}</p>
          <p className="mt-1 text-xs text-muted">{t("jobsDone")}</p>
        </motion.div>
        <motion.div className="card py-5 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <p className="font-mono text-3xl font-extrabold text-warning">{w.average_rating.toFixed(1)}</p>
          <p className="mt-1 text-xs text-muted">{t("rating")}</p>
        </motion.div>
        <motion.div className="card py-5 text-center" whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <p className="text-3xl font-extrabold text-warning">{w.cancellation_rate}%</p>
          <p className="mt-1 text-xs text-muted">{t("cancelRate")}</p>
        </motion.div>
      </div>

      {/* Active Job Alert */}
      {hasActiveJob && (
        <a
          href="/dashboard/worker/active"
          className="card flex items-center gap-4 border-accent/30 bg-accent/10 py-5 transition-transform active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent">
            <svg className="h-7 w-7 text-bg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17.24 8.41a4.24 4.24 0 00-6-6l-5.1 5.1m6 6l-5.1-5.1" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-accent">{t("activeJob")}</p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {data.active_job?.input?.original_text ?? t("activeJobDesc")}
            </p>
          </div>
          <svg className="h-6 w-6 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>
      )}

      {/* Pending Jobs Alert */}
      {pendingCount > 0 && !hasActiveJob && (
        <a
          href="/dashboard/worker/jobs"
          className="card flex items-center gap-4 border-warning/40 bg-warning/10 py-5 transition-transform active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-warning">
            <span className="text-xl font-bold text-bg">{pendingCount}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-warning">{t("newJobsAvailable")}</p>
            <p className="mt-0.5 text-sm text-warning/80">
              {incomingCount > 0 && t("nearby").replace("{count}", String(incomingCount))}
              {incomingCount > 0 && directCount > 0 && " · "}
              {directCount > 0 && t("directRequests").replace("{count}", String(directCount))}
            </p>
          </div>
          <svg className="h-6 w-6 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>
      )}

      {/* Fast actions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t("quickActions")}</h2>
          <span className="text-xs text-muted">{t("importantTools")}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <a href="/dashboard/worker/active" className="card flex min-h-24 flex-col justify-between transition-colors hover:border-accent active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            </span>
            <span className="text-sm font-bold text-text">{t("trackJob")}</span>
          </a>
          <a href="/dashboard/worker/work" className="card flex min-h-24 flex-col justify-between transition-colors hover:border-accent active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            </span>
            <span className="text-sm font-bold text-text">{t("workTools")}</span>
          </a>
          <a href="/dashboard/worker/jobs" className="card flex min-h-24 flex-col justify-between transition-colors hover:border-accent active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38" /></svg>
            </span>
            <span className="text-sm font-bold text-text">{t("findJobs")}</span>
          </a>
          <a href="/dashboard/worker/profile" className="card flex min-h-24 flex-col justify-between transition-colors hover:border-accent active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-muted">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </span>
            <span className="text-sm font-bold text-text">{t("settings")}</span>
          </a>
        </div>
      </section>

      {/* Availability */}
      <WorkerAvailability
        initial={{
          is_available: w.is_available,
          is_online: w.is_online,
          emergency_available: w.emergency_available,
        }}
        onChanged={() => void refresh()}
      />

      {/* Location */}
      <LocationUpdater
        lastUpdated={w.location_updated_at}
        onChanged={() => void refresh()}
      />

      {error && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">{error}</p>
      )}
    </div>
  );
}
