"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkerDashboardData } from "@contracts/worker";
import { motion } from "framer-motion";
import WorkerAvailability from "@/client/components/WorkerAvailability";
import LocationUpdater from "./LocationUpdater";
import { useLang } from "@/client/lib/i18n/context";
import { getApiErrorMessage } from "@/client/lib/api-client";
import { Wrench, ChevronRight, Bell } from "lucide-react";

const POLL_MS = 5000;

export default function WorkerHome({ workerId }: { workerId: string }) {
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t, lang } = useLang();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${workerId}/dashboard`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: unknown;
        data?: WorkerDashboardData;
      } | null;
      if (!res.ok || !body?.success) {
        throw new Error(getApiErrorMessage(body, "Dashboard failed to load"));
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
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Auto-detect location on mount
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetch("/api/workers/me/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).then(() => void refresh());
      },
      () => {},
      { timeout: 8000, maximumAge: 300000 },
    );
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
  const isOnline = w.is_online && w.is_available;

  return (
    <div className="relative space-y-5 overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />

      {/* Online Status */}
      <motion.div
        className={`card flex items-center justify-between gap-4 ${
          isOnline
            ? "border-success/30 bg-success/10"
            : "border-divider bg-surface"
        }`}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
      >
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${isOnline ? "text-success" : "text-muted"}`}>
            {isOnline ? t("online") : t("offline")}
          </p>
          <p className="mt-1 text-sm font-bold text-text">
            {hasActiveJob
              ? t("activeJobDesc")
              : isOnline
                ? t("readyForWork")
                : t("notAccepting")}
          </p>
        </div>
        <span
          className={`h-3 w-3 rounded-full ${
            isOnline ? "bg-success animate-pulse" : "bg-muted/40"
          }`}
        />
      </motion.div>

      {/* Active Job Alert */}
      {hasActiveJob && (
        <a
          href="/dashboard/worker/active"
          className="card flex items-center gap-4 border-accent/30 bg-accent/10 py-4 transition-all active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl glass-icon-circle">
            <Wrench className="h-6 w-6 text-success" />
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

      {/* Job Notifications */}
      {pendingCount > 0 && !hasActiveJob && (
        <a
          href="/dashboard/worker/jobs"
          className="card flex items-center gap-4 border-warning/40 bg-warning/10 py-4 transition-all active:scale-[0.98]"
        >
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning">
            <span className="text-lg font-bold text-bg">{pendingCount}</span>
            <Bell className="absolute -right-1 -top-1 h-3.5 w-3.5 text-bg" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-warning">{t("newJobsAvailable")}</p>
            <p className="mt-0.5 text-xs text-warning/80">
              {t("newJobsAvailable")}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-warning" />
        </a>
      )}

      {/* Availability Toggles */}
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
