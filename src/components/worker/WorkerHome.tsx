"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@/lib/worker/dashboard";
import { motion } from "framer-motion";
import WorkerAvailability from "@/components/WorkerAvailability";
import LocationUpdater from "./LocationUpdater";
import { useLang } from "@/lib/i18n/context";
import {
  MapPin,
  Shield,
  Briefcase,
  ChevronRight,
  Star,
  TrendingDown,
  Wrench,
  User,
} from "lucide-react";

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
    <div className="relative space-y-5 overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-warning/6 blur-3xl" />

      {/* Current work status */}
      <motion.div
        className="card flex items-center justify-between gap-4 border-accent/30 bg-accent/10"
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            {t("workStatus")}
          </p>
          <p className="mt-1 text-sm font-bold text-text">
            {hasActiveJob
              ? t("activeJobDesc")
              : w.is_available
                ? t("readyForWork")
                : t("notAccepting")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            w.is_online && w.is_available
              ? "bg-success text-success-fg"
              : "bg-surface text-muted"
          }`}
        >
          {w.is_online && w.is_available ? t("online") : t("offline")}
        </span>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          className="card py-4 text-center"
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-2xl font-extrabold text-accent">{w.ustad_score}</p>
          <p className="mt-1 text-xs text-muted">{t("ustadScore")}</p>
        </motion.div>
        <motion.div
          className="card py-4 text-center"
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-2xl font-extrabold text-text">{w.completed_jobs}</p>
          <p className="mt-1 text-xs text-muted">{t("jobsDone")}</p>
        </motion.div>
        <motion.div
          className="card py-4 text-center"
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center justify-center gap-1">
            <Star className="h-4 w-4 text-warning" />
            <p className="font-mono text-2xl font-extrabold text-warning">
              {w.average_rating.toFixed(1)}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted">{t("rating")}</p>
        </motion.div>
        <motion.div
          className="card py-4 text-center"
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center justify-center gap-1">
            <TrendingDown className="h-4 w-4 text-warning" />
            <p className="text-2xl font-extrabold text-warning">
              {w.cancellation_rate}%
            </p>
          </div>
          <p className="mt-1 text-xs text-muted">{t("cancelRate")}</p>
        </motion.div>
      </div>

      {/* Active Job Alert */}
      {hasActiveJob && (
        <a
          href="/dashboard/worker/active"
          className="card flex items-center gap-4 border-accent/30 bg-accent/10 py-4 transition-all active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Wrench className="h-6 w-6 text-bg" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-accent">{t("activeJob")}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {data.active_job?.input?.original_text ?? t("activeJobDesc")}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-accent" />
        </a>
      )}

      {/* Pending Jobs Alert */}
      {pendingCount > 0 && !hasActiveJob && (
        <a
          href="/dashboard/worker/jobs"
          className="card flex items-center gap-4 border-warning/40 bg-warning/10 py-4 transition-all active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning">
            <span className="text-lg font-bold text-bg">{pendingCount}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-warning">{t("newJobsAvailable")}</p>
            <p className="mt-0.5 text-xs text-warning/80">
              {incomingCount > 0 &&
                t("nearby").replace("{count}", String(incomingCount))}
              {incomingCount > 0 && directCount > 0 && " · "}
              {directCount > 0 &&
                t("directRequests").replace("{count}", String(directCount))}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-warning" />
        </a>
      )}

      {/* Fast actions */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/dashboard/worker/active"
            className="card flex min-h-20 flex-col justify-between transition-all hover:border-accent active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="mt-2 text-sm font-bold text-text">{t("trackJob")}</span>
          </a>
          <a
            href="/dashboard/worker/work"
            className="card flex min-h-20 flex-col justify-between transition-all hover:border-accent active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Shield className="h-5 w-5" />
            </div>
            <span className="mt-2 text-sm font-bold text-text">{t("workTools")}</span>
          </a>
          <a
            href="/dashboard/worker/jobs"
            className="card flex min-h-20 flex-col justify-between transition-all hover:border-accent active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="mt-2 text-sm font-bold text-text">{t("findJobs")}</span>
          </a>
          <a
            href="/dashboard/worker/profile"
            className="card flex min-h-20 flex-col justify-between transition-all hover:border-accent active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-muted">
              <User className="h-5 w-5" />
            </div>
            <span className="mt-2 text-sm font-bold text-text">{t("settings")}</span>
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
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </p>
      )}
    </div>
  );
}
